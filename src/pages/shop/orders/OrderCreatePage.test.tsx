import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/shared/utils/alert', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showConfirm: vi.fn(async () => true),
}));
vi.mock('@/infrastructure/http/shop.client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import shopClient from '@/infrastructure/http/shop.client';
import { showError, showSuccess } from '@/shared/utils/alert';
import OrderCreatePage from './OrderCreatePage';

const get = shopClient.get as unknown as ReturnType<typeof vi.fn>;
const post = shopClient.post as unknown as ReturnType<typeof vi.fn>;

const CLIENT = { id: 'c1', prenom: 'Fatou', nom: 'Sow', email: 'fatou@exemple.com', telephone: '+221770000000', isActive: true };
const ADRESSE = { id: 'ad1', nomComplet: 'Fatou Sow', telephone: '+221770000000', rue: 'Rue 10', ville: 'Dakar', isDefault: true };
const PRODUITS = [
  { id: 'pA', nom: 'Produit A', prix: '5000.00', stock: 5, images: [] },
  { id: 'pB', nom: 'Produit B', prix: '7500.00', stock: 1, images: [] },
];
const COMMANDE = {
  id: 'cmd1',
  reference: 'CMD-123',
  statut: 'en_attente',
  montantTotal: '18500.00',
  fraisLivraison: '1000.00',
  items: [{ quantite: 2 }, { quantite: 1 }],
};

const repondreGet = (url: string) => {
  if (url === '/admin/users') return Promise.resolve({ users: [CLIENT] });
  if (url === '/admin/users/clients/c1/adresses') return Promise.resolve({ adresses: [ADRESSE] });
  if (url === '/admin/produits') return Promise.resolve({ produits: PRODUITS });
  if (url === '/frais-livraisons/Dakar') return Promise.resolve({ frais: { montant: '1000.00' } });
  return Promise.reject({ status: 404, message: 'inconnu' });
};

let qc: QueryClient;
const rendre = () => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/boutique/commandes', element: <div>LISTE COMMANDES</div> },
      { path: '/boutique/commandes/nouveau', element: <OrderCreatePage /> },
      { path: '/boutique/commandes/:id', element: <div>DETAIL COMMANDE</div> },
    ],
    { initialEntries: ['/boutique/commandes', '/boutique/commandes/nouveau'], initialIndex: 1 }
  );
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
};

const choisirClient = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByRole('button', { name: /Fatou Sow/ }));
  // L'adresse par défaut est présélectionnée.
  await waitFor(() => expect(screen.getByRole('radio')).toBeChecked());
};

const ajouter = async (user: ReturnType<typeof userEvent.setup>, nom: string) => {
  await user.click(await screen.findByRole('button', { name: `Ajouter ${nom}` }));
};

const panier = () => screen.getByRole('table');

describe('OrderCreatePage — création de commande admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockImplementation((url: string) => repondreGet(url));
  });

  it('affiche le formulaire et charge clients et produits depuis le backend', async () => {
    rendre();
    expect(screen.getByRole('heading', { name: 'Créer une commande' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Fatou Sow/ })).toBeInTheDocument();
    expect(await screen.findByText('Produit A')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/admin/users', expect.anything());
    expect(get).toHaveBeenCalledWith(
      '/admin/produits',
      expect.objectContaining({ params: expect.objectContaining({ isActive: true, statutValidation: 'valide' }) })
    );
  });

  it('la recherche client et produit interroge le backend avec le terme saisi', async () => {
    const user = userEvent.setup();
    rendre();
    await user.type(screen.getByLabelText('Rechercher un client'), 'fatou');
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/admin/users', { params: { search: 'fatou', limit: 8 } })
    );
    await user.type(screen.getByLabelText('Rechercher un produit'), 'huile');
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        '/admin/produits',
        expect.objectContaining({ params: expect.objectContaining({ search: 'huile' }) })
      )
    );
  });

  it('soumission vide : messages clairs, aucun appel API', async () => {
    const user = userEvent.setup();
    rendre();
    await user.click(screen.getByRole('button', { name: 'Créer la commande' }));
    expect(showError).toHaveBeenCalledWith('Veuillez sélectionner un client.');
    expect(screen.getByText('Veuillez sélectionner un client.')).toBeInTheDocument();
    expect(screen.getByText('Veuillez ajouter au moins un produit à la commande.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('client sélectionné mais panier vide : création impossible', async () => {
    const user = userEvent.setup();
    rendre();
    await choisirClient(user);
    await user.click(screen.getByRole('button', { name: 'Créer la commande' }));
    expect(showError).toHaveBeenCalledWith('Veuillez ajouter au moins un produit à la commande.');
    expect(post).not.toHaveBeenCalled();
  });

  it('produit ajouté deux fois : une seule ligne, quantité 2 ; sous-total et total recalculés', async () => {
    const user = userEvent.setup();
    rendre();
    await choisirClient(user);
    await ajouter(user, 'Produit A');
    await user.click(screen.getByRole('button', { name: 'Ajouter Produit A' })); // libellé « +1 »
    const lignes = within(panier()).getAllByRole('row');
    expect(lignes).toHaveLength(2); // en-tête + 1 ligne
    expect(within(panier()).getByLabelText('Quantité de Produit A')).toHaveValue('2');
    expect(within(panier()).getByText('10 000 FCFA')).toBeInTheDocument();
    const recap = screen.getByRole('complementary', { name: 'Récapitulatif' });
    await waitFor(() => expect(within(recap).getByText('1 000 FCFA')).toBeInTheDocument());
    expect(within(recap).getByText('11 000 FCFA')).toBeInTheDocument();
  });

  it('modification et suppression de ligne', async () => {
    const user = userEvent.setup();
    rendre();
    await ajouter(user, 'Produit A');
    await ajouter(user, 'Produit B');
    const qA = within(panier()).getByLabelText('Quantité de Produit A');
    await user.clear(qA);
    await user.type(qA, '3');
    expect(within(panier()).getByText('15 000 FCFA')).toBeInTheDocument();
    await user.click(within(panier()).getByRole('button', { name: 'Supprimer Produit B' }));
    expect(within(panier()).queryByText('Produit B')).not.toBeInTheDocument();
  });

  it.each(['0', '-1', 'abc', '1.5'])('quantité « %s » : erreur affichée, envoi bloqué', async (saisie) => {
    const user = userEvent.setup();
    rendre();
    await choisirClient(user);
    await ajouter(user, 'Produit A');
    const q = within(panier()).getByLabelText('Quantité de Produit A');
    fireEvent.change(q, { target: { value: saisie } });
    expect(await within(panier()).findByText(/nombre entier supérieur ou égal à 1/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Créer la commande' }));
    expect(post).not.toHaveBeenCalled();
  });

  it('quantité supérieure au stock connu : stock disponible affiché, envoi bloqué', async () => {
    const user = userEvent.setup();
    rendre();
    await choisirClient(user);
    await ajouter(user, 'Produit A');
    fireEvent.change(within(panier()).getByLabelText('Quantité de Produit A'), { target: { value: '7' } });
    expect(await within(panier()).findByText('Stock insuffisant : 5 disponibles.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Créer la commande' }));
    expect(post).not.toHaveBeenCalled();
  });

  it('succès : payload sans prix, confirmation, liste et KPI invalidés, accès à la commande', async () => {
    post.mockResolvedValue({ commande: COMMANDE });
    const user = userEvent.setup();
    const router = rendre();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    await choisirClient(user);
    await ajouter(user, 'Produit A');
    await ajouter(user, 'Produit A');
    await ajouter(user, 'Produit B');
    await user.selectOptions(screen.getByLabelText('Méthode de paiement'), 'wave');
    await user.click(screen.getByRole('button', { name: 'Créer la commande' }));

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/admin/commandes', {
      userId: 'c1',
      adresseId: 'ad1',
      methode: 'wave',
      note: null,
      dateLivraisonSouhaitee: null,
      items: [
        { produitId: 'pA', quantite: 2 },
        { produitId: 'pB', quantite: 1 },
      ],
    });
    expect(await screen.findByRole('heading', { name: 'Commande créée avec succès' })).toBeInTheDocument();
    expect(screen.getByText('CMD-123')).toBeInTheDocument();
    expect(screen.getByText('18 500 FCFA')).toBeInTheDocument();
    expect(showSuccess).toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['commandes'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['commandes-kpi'] });

    await user.click(screen.getByRole('button', { name: 'Voir la commande' }));
    expect(await screen.findByText('DETAIL COMMANDE')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/boutique/commandes/cmd1');
  });

  it('retour à la liste après succès', async () => {
    post.mockResolvedValue({ commande: COMMANDE });
    const user = userEvent.setup();
    rendre();
    await choisirClient(user);
    await ajouter(user, 'Produit A');
    await user.click(screen.getByRole('button', { name: 'Créer la commande' }));
    await user.click(await screen.findByRole('button', { name: 'Retour à la liste' }));
    expect(await screen.findByText('LISTE COMMANDES')).toBeInTheDocument();
  });

  it('double clic : un seul envoi, bouton désactivé avec état de chargement', async () => {
    let resoudre!: (v: unknown) => void;
    post.mockReturnValue(new Promise((r) => (resoudre = r)));
    const user = userEvent.setup();
    rendre();
    await choisirClient(user);
    await ajouter(user, 'Produit A');
    const bouton = screen.getByRole('button', { name: 'Créer la commande' });
    fireEvent.click(bouton);
    fireEvent.click(bouton);
    await user.dblClick(bouton);
    expect(post).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /Création en cours/ })).toBeDisabled();
    resoudre({ commande: COMMANDE });
    expect(await screen.findByRole('heading', { name: 'Commande créée avec succès' })).toBeInTheDocument();
  });

  it.each([
    ['stock insuffisant (serveur)', { status: 400, message: 'Stock insuffisant pour "Produit A" (disponible : 1, demandé : 2)' }],
    ['erreur serveur', { status: 500, message: 'Le serveur a rencontré une erreur. Réessayez plus tard.' }],
    ['erreur réseau', { status: undefined, message: 'Impossible de joindre le serveur. Vérifiez votre connexion internet.' }],
    ['non autorisé', { status: 403, message: 'Accès refusé' }],
    ['session expirée', { status: 401, message: 'Votre session a expiré. Veuillez vous reconnecter.' }],
    ['client inexistant', { status: 404, message: 'Client introuvable' }],
  ])('%s : message affiché, saisie conservée, nouvel essai possible', async (_cas, erreur) => {
    post.mockRejectedValue(erreur);
    const user = userEvent.setup();
    rendre();
    await choisirClient(user);
    await ajouter(user, 'Produit A');
    await user.click(screen.getByRole('button', { name: 'Créer la commande' }));
    const recap = screen.getByRole('complementary', { name: 'Récapitulatif' });
    expect(await within(recap).findByText(erreur.message)).toBeInTheDocument();
    expect(showError).toHaveBeenCalledWith(erreur.message);
    expect(within(panier()).getByText('Produit A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Créer la commande' })).toBeEnabled();
  });

  it('changer de client réinitialise l’adresse', async () => {
    const user = userEvent.setup();
    rendre();
    await choisirClient(user);
    await user.click(screen.getByRole('button', { name: 'Changer de client' }));
    expect(await screen.findByLabelText('Rechercher un client')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});
