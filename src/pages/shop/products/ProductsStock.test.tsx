import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/shared/utils/alert', () => ({
  showConfirm: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('@/infrastructure/http/shop.client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import shopClient from '@/infrastructure/http/shop.client';
import { showError } from '@/shared/utils/alert';
import ProductsPage from './ProductsPage';

const shopGet = shopClient.get as unknown as ReturnType<typeof vi.fn>;
const shopPatch = shopClient.patch as unknown as ReturnType<typeof vi.fn>;
const erreur = showError as unknown as ReturnType<typeof vi.fn>;

const PRODUIT = {
  id: 'p-1',
  nom: 'Riz parfumé 5 kg',
  prix: 5000,
  stock: 10,
  statutValidation: 'valide',
  images: [],
  indicateurs: { niveauStock: 'normal', quantiteVendue: 0, chiffreAffaires: 0 },
};

const MOUVEMENT = {
  id: 'mvt-1',
  type: 'ajustement_negatif',
  source: 'ajustement_admin',
  ancienneQuantite: 16,
  nouvelleQuantite: 10,
  difference: -6,
  motif: 'perte_ou_casse',
  commentaire: null,
  createdAt: '2026-10-20T09:30:00.000Z',
  auteur: { prenom: 'Balla', nom: 'Beye' },
};

const rendre = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/boutique/produits', element: <ProductsPage /> },
      { path: '/boutique/produits/:id', element: <div>Fiche produit</div> },
    ],
    { initialEntries: ['/boutique/produits'] }
  );
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

/** Rend la liste puis ouvre la modale d'ajustement depuis la ligne. */
const ouvrirModale = async () => {
  rendre();
  await screen.findByText('Riz parfumé 5 kg');
  await userEvent.click(screen.getByRole('button', { name: 'Modifier le stock' }));
  return screen.findByRole('dialog', { name: 'Modifier le stock' });
};

beforeEach(() => {
  vi.clearAllMocks();
  shopGet.mockImplementation((url: string) => {
    if (url === '/admin/produits') {
      return Promise.resolve({ produits: [PRODUIT], pagination: { totalPages: 1 } });
    }
    if (url === '/admin/produits/p-1/mouvements-stock') {
      return Promise.resolve({ mouvements: [MOUVEMENT], pagination: { totalPages: 1 } });
    }
    return Promise.resolve([]);
  });
  shopPatch.mockResolvedValue({ produit: { ...PRODUIT, stock: 4 } });
});

describe('Produits : modification du stock depuis la liste', () => {
  it('le nom du produit ouvre la fiche détaillée', async () => {
    rendre();

    const lien = await screen.findByRole('link', { name: 'Riz parfumé 5 kg' });
    expect(lien).toHaveAttribute('href', '/boutique/produits/p-1');
  });

  it('affiche la quantité actuelle et les derniers mouvements', async () => {
    const modale = await ouvrirModale();

    expect(within(modale).getByText('Quantité actuelle')).toBeInTheDocument();
    // « Perte ou casse » figure aussi dans la liste déroulante : on ne lit
    // que la ligne d'historique.
    const ligne = (await within(modale).findByText('16 → 10 (-6)')).closest('li')!;
    expect(within(ligne).getByText('Ajustement négatif')).toBeInTheDocument();
    expect(within(ligne).getByText('Perte ou casse')).toBeInTheDocument();
    expect(within(ligne).getByText('Balla Beye')).toBeInTheDocument();
  });

  it('refuse l’enregistrement sans motif et affiche le message près du champ', async () => {
    const modale = await ouvrirModale();
    await userEvent.click(within(modale).getByRole('button', { name: 'Enregistrer' }));

    expect(within(modale).getByText('Le motif est obligatoire')).toBeInTheDocument();
    expect(shopPatch).not.toHaveBeenCalled();
  });

  it('fait disparaître le message dès que le motif est choisi', async () => {
    const modale = await ouvrirModale();
    await userEvent.click(within(modale).getByRole('button', { name: 'Enregistrer' }));
    expect(within(modale).getByText('Le motif est obligatoire')).toBeInTheDocument();

    await userEvent.selectOptions(
      within(modale).getByLabelText('Motif de modification *'),
      'correction_inventaire'
    );

    expect(within(modale).queryByText('Le motif est obligatoire')).not.toBeInTheDocument();
  });

  it('« Autre motif » exige une précision libre', async () => {
    const modale = await ouvrirModale();
    await userEvent.selectOptions(within(modale).getByLabelText('Motif de modification *'), 'autre');
    await userEvent.click(within(modale).getByRole('button', { name: 'Enregistrer' }));

    expect(
      within(modale).getByText('Précisez le motif (au moins 3 caractères)')
    ).toBeInTheDocument();
    expect(shopPatch).not.toHaveBeenCalled();

    await userEvent.type(
      within(modale).getByLabelText('Précisez le motif *'),
      'Transfert vers Thiès'
    );

    expect(
      within(modale).queryByText('Précisez le motif (au moins 3 caractères)')
    ).not.toBeInTheDocument();
  });

  it('refuse une quantité négative', async () => {
    const modale = await ouvrirModale();
    const champ = within(modale).getByLabelText('Nouvelle quantité *');
    await userEvent.clear(champ);
    await userEvent.type(champ, '-3');
    await userEvent.selectOptions(
      within(modale).getByLabelText('Motif de modification *'),
      'correction_inventaire'
    );
    await userEvent.click(within(modale).getByRole('button', { name: 'Enregistrer' }));

    expect(
      within(modale).getByText('Saisissez un nombre entier supérieur ou égal à 0')
    ).toBeInTheDocument();
    expect(shopPatch).not.toHaveBeenCalled();
  });

  it('envoie { quantite, motif } puis ferme la modale', async () => {
    const modale = await ouvrirModale();
    const champ = within(modale).getByLabelText('Nouvelle quantité *');
    await userEvent.clear(champ);
    await userEvent.type(champ, '4');
    await userEvent.selectOptions(
      within(modale).getByLabelText('Motif de modification *'),
      'perte_ou_casse'
    );
    await userEvent.click(within(modale).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(shopPatch).toHaveBeenCalledWith('/admin/produits/p-1/stock', {
        quantite: 4,
        motif: 'perte_ou_casse',
        commentaire: undefined,
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refus du backend : l’erreur est affichée et la modale reste ouverte', async () => {
    const refus = { status: 403, message: 'Accès refusé' };
    shopPatch.mockRejectedValueOnce(refus);

    const modale = await ouvrirModale();
    await userEvent.selectOptions(
      within(modale).getByLabelText('Motif de modification *'),
      'correction_inventaire'
    );
    await userEvent.click(within(modale).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(erreur).toHaveBeenCalledWith(refus));
    expect(screen.getByRole('dialog', { name: 'Modifier le stock' })).toBeInTheDocument();
  });
});
