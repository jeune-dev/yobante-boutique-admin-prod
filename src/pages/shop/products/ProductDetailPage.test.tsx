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
import ProductDetailPage from './ProductDetailPage';

const shopGet = shopClient.get as unknown as ReturnType<typeof vi.fn>;

const PRODUIT = {
  id: 'p-1',
  nom: 'Riz parfumé 5 kg',
  description: 'Sac de 5 kg',
  reference: 'REF-RIZ-5',
  prix: 5000,
  prixAchat: 3800,
  stock: 4,
  stockAlloue: 2,
  images: [],
  isActive: true,
  statutValidation: 'valide',
  rayon: { id: 'r-1', nom: 'Épicerie' },
  sousRayon: { id: 'sr-1', nom: 'Riz et céréales' },
  vendeur: { id: 'v-1', nom: 'Fall', prenom: 'Mame', profilVendeur: { nomBoutique: 'Chez Mame' } },
  indicateurs: {
    quantiteVendue: 19,
    stockRestant: 4,
    stockDisponible: 2,
    chiffreAffaires: 95000,
    margeBrute: 22800,
    margeUnitaire: 1200,
    tauxMarge: 24,
    joursCouverture: 6,
    fenetreCouvertureJours: 30,
    // Quatre paliers du backend : 4 en stock → « faible ».
    niveauStock: 'faible',
    nombreRetours: 1,
    quantiteRetournee: 2,
    tauxRetour: 10.5,
  },
};

const INDICATEURS = {
  stockActuel: 4,
  totalEntrees: 3,
  totalSorties: 12,
  totalAjustementsPositifs: 9,
  totalAjustementsNegatifs: 6,
  nombreCommandes: 2,
};

const MOUVEMENT_SORTIE = {
  id: 'mvt-1',
  type: 'sortie',
  source: 'commande_creation',
  ancienneQuantite: 10,
  nouvelleQuantite: 7,
  difference: -3,
  motif: null,
  commentaire: null,
  createdAt: '2026-10-21T09:30:00.000Z',
  auteur: { nom: 'Diop', prenom: 'Awa', role: 'CLIENT' },
  client: { id: 'c-1', nom: 'Diop', prenom: 'Awa' },
  commande: { id: 'cmd-1', reference: 'CMD-42', statut: 'validee' },
};

const MOUVEMENT_RETOUR = {
  id: 'mvt-3',
  type: 'retour',
  source: 'retour_remise_en_stock',
  ancienneQuantite: 2,
  nouvelleQuantite: 4,
  difference: 2,
  motif: 'produit_abime',
  commentaire: 'Emballage déchiré',
  createdAt: '2026-10-23T08:00:00.000Z',
  auteur: { id: 'a-1', nom: 'Beye', prenom: 'Balla', role: 'ADMIN' },
  retour: { id: 'ret-1', statut: 'accepte' },
};

const MOUVEMENT_AJUSTEMENT = {
  id: 'mvt-2',
  type: 'ajustement_negatif',
  source: 'ajustement_admin',
  ancienneQuantite: 7,
  nouvelleQuantite: 4,
  difference: -3,
  motif: 'perte_ou_casse',
  commentaire: 'Palette abîmée',
  createdAt: '2026-10-22T11:00:00.000Z',
  auteur: { id: 'a-1', nom: 'Beye', prenom: 'Balla', role: 'ADMIN' },
};

const LIGNE_COMMANDE = {
  id: 'li-1',
  quantite: 3,
  prixUnitaire: '4500.00',
  sousTotal: '13500.00',
  commande: {
    id: 'cmd-1',
    reference: 'CMD-42',
    statut: 'validee',
    createdAt: '2026-10-21T09:30:00.000Z',
    user: { id: 'c-1', nom: 'Diop', prenom: 'Awa' },
  },
};

/**
 * Paramètres de la dernière requête du JOURNAL. La section « modifications
 * manuelles » interroge la même route avec `limit: 10` : on la reconnaît à
 * sa pagination, pas à son filtre `source`, que le journal peut porter aussi.
 */
const derniersFiltres = (): Record<string, unknown> => {
  const appels = shopGet.mock.calls.filter(
    (appel: unknown[]) =>
      typeof appel[0] === 'string' &&
      appel[0].includes('/mouvements-stock') &&
      (appel[1] as { params?: Record<string, unknown> })?.params?.limit === 20
  );
  const dernier = appels[appels.length - 1] as [string, { params: Record<string, unknown> }];
  return dernier[1].params;
};

const rendre = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/boutique/produits/:id', element: <ProductDetailPage /> },
      { path: '/boutique/commandes/:id', element: <div>Fiche commande</div> },
    ],
    { initialEntries: ['/boutique/produits/p-1'] }
  );
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  shopGet.mockImplementation((url: string, config?: { params?: Record<string, unknown> }) => {
    if (url === '/admin/produits/p-1') return Promise.resolve({ produit: PRODUIT });
    if (url === '/admin/produits/p-1/mouvements-stock') {
      // La section « modifications manuelles » n'interroge que la source admin.
      const ajustementsSeuls = config?.params?.source === 'ajustement_admin';
      return Promise.resolve({
        mouvements: ajustementsSeuls
          ? [MOUVEMENT_AJUSTEMENT]
          : [MOUVEMENT_RETOUR, MOUVEMENT_AJUSTEMENT, MOUVEMENT_SORTIE],
        indicateurs: INDICATEURS,
        pagination: { total: 3, totalPages: 1, page: 1, limit: 20 },
      });
    }
    if (url === '/admin/produits/p-1/commandes') {
      return Promise.resolve({
        lignes: [LIGNE_COMMANDE],
        pagination: { total: 1, totalPages: 1, page: 1, limit: 10 },
      });
    }
    return Promise.resolve({});
  });
});

describe('Fiche produit', () => {
  it('affiche l’en-tête avec les informations réellement présentes en base', async () => {
    rendre();

    expect(await screen.findByRole('heading', { name: 'Riz parfumé 5 kg' })).toBeInTheDocument();
    expect(screen.getByText('REF-RIZ-5')).toBeInTheDocument();
    expect(screen.getByText('5 000 FCFA')).toBeInTheDocument();
    expect(screen.getByText('Épicerie')).toBeInTheDocument();
    expect(screen.getByText('Riz et céréales')).toBeInTheDocument();
    expect(screen.getAllByText('Chez Mame').length).toBeGreaterThan(0);
  });

  it('affiche le niveau de stock calculé par le backend, pas un seuil local', async () => {
    rendre();

    // `niveauStock: 'faible'` → libellé des quatre paliers de la boutique.
    expect(await screen.findByText(/Stock faible/)).toBeInTheDocument();
  });

  it('affiche les totaux de mouvements calculés par le backend', async () => {
    rendre();

    // La carte d'indicateur entière : le libellé est dans sa ligne d'entête.
    const sorties = (await screen.findByText('Sorties')).closest('.rounded-xl') as HTMLElement;
    await waitFor(() => expect(within(sorties).getByText('12')).toBeInTheDocument());
    const commandes = screen.getByText('Commandes').closest('.rounded-xl') as HTMLElement;
    expect(within(commandes).getByText('2')).toBeInTheDocument();
  });

  it('liste les mouvements avec type, écart, motif, responsable et commande', async () => {
    rendre();

    const sortie = (await screen.findByText('CMD-42', { selector: 'a' })).closest('tr')!;
    expect(within(sortie).getByText('Sortie')).toBeInTheDocument();
    expect(within(sortie).getByText('Commande passée')).toBeInTheDocument();
    expect(within(sortie).getByText('10 → 7')).toBeInTheDocument();
    expect(within(sortie).getAllByText('Awa Diop').length).toBeGreaterThan(0);
  });

  it('affiche un mouvement de retour avec le motif du retour', async () => {
    rendre();

    // « Retour remis en stock » figure aussi dans la liste déroulante
    // « Origine » : on repère la ligne par son commentaire, propre au tableau.
    const retour = (await screen.findByText('Emballage déchiré')).closest('tr')!;
    expect(within(retour).getByText('Retour')).toBeInTheDocument();
    expect(within(retour).getByText('+2')).toBeInTheDocument();
    // Le motif vient de l'énumération des retours, pas de celle des ajustements.
    expect(within(retour).getByText('Produit abîmé')).toBeInTheDocument();
  });

  it('annonce que la traçabilité démarre à la mise en service', async () => {
    rendre();

    expect(
      await screen.findByText(/la traçabilité démarre à la mise en service/i)
    ).toBeInTheDocument();
  });

  it('applique les filtres côté serveur au clic sur « Appliquer »', async () => {
    rendre();
    await screen.findByRole('heading', { name: 'Riz parfumé 5 kg' });

    await userEvent.selectOptions(screen.getByLabelText('Type de mouvement'), 'sortie');
    await userEvent.selectOptions(screen.getByLabelText('Origine'), 'commande_creation');
    await userEvent.type(screen.getByLabelText('Date de début'), '2026-10-01');

    // Rien n'est envoyé tant que l'utilisateur n'a pas validé.
    expect(derniersFiltres()).not.toHaveProperty('type');

    await userEvent.click(screen.getByRole('button', { name: 'Appliquer les filtres' }));

    await waitFor(() =>
      expect(derniersFiltres()).toMatchObject({
        type: 'sortie',
        source: 'commande_creation',
        dateDebut: '2026-10-01',
        page: 1,
      })
    );
  });

  it('« Réinitialiser » vide les filtres et relance la requête', async () => {
    rendre();
    await screen.findByRole('heading', { name: 'Riz parfumé 5 kg' });

    await userEvent.selectOptions(screen.getByLabelText('Type de mouvement'), 'sortie');
    await userEvent.click(screen.getByRole('button', { name: 'Appliquer les filtres' }));
    await waitFor(() => expect(derniersFiltres()).toHaveProperty('type'));

    await userEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));

    await waitFor(() => expect(derniersFiltres()).toEqual({ page: 1, limit: 20 }));
  });

  it('liste les commandes avec le prix figé de la ligne', async () => {
    rendre();

    const ligne = (await screen.findByText('13 500 FCFA')).closest('tr')!;
    expect(within(ligne).getByText('4 500 FCFA')).toBeInTheDocument();
    expect(within(ligne).getByText('Awa Diop')).toBeInTheDocument();
    expect(within(ligne).getByRole('link', { name: 'CMD-42' })).toHaveAttribute(
      'href',
      '/boutique/commandes/cmd-1'
    );
  });

  it('une section en échec n’emporte pas la page', async () => {
    shopGet.mockImplementation((url: string) => {
      if (url === '/admin/produits/p-1') return Promise.resolve({ produit: PRODUIT });
      if (url === '/admin/produits/p-1/commandes') {
        return Promise.reject({ status: 500, message: 'Le serveur a rencontré une erreur.' });
      }
      return Promise.resolve({
        mouvements: [],
        indicateurs: INDICATEURS,
        pagination: { total: 0, totalPages: 1, page: 1, limit: 20 },
      });
    });

    rendre();

    expect(await screen.findByRole('heading', { name: 'Riz parfumé 5 kg' })).toBeInTheDocument();
    expect(await screen.findByText('Le serveur a rencontré une erreur.')).toBeInTheDocument();
    expect(screen.getByText('Historique du stock')).toBeInTheDocument();
  });

  it('produit introuvable : message d’erreur et retour possible', async () => {
    shopGet.mockImplementation((url: string) => {
      if (url === '/admin/produits/p-1') {
        return Promise.reject({ status: 404, message: 'Produit introuvable' });
      }
      return Promise.resolve({});
    });

    rendre();

    expect(await screen.findByText('Produit introuvable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retour/ })).toBeInTheDocument();
  });

  it('ouvre la modale d’ajustement depuis la fiche', async () => {
    rendre();
    await screen.findByRole('heading', { name: 'Riz parfumé 5 kg' });

    await userEvent.click(screen.getByRole('button', { name: /Modifier le stock/ }));

    expect(await screen.findByRole('dialog', { name: 'Modifier le stock' })).toBeInTheDocument();
  });
});
