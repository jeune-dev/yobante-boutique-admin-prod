import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/shared/utils/alert', () => ({
  showConfirm: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));
vi.mock('@/infrastructure/http/shop.client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import shopClient from '@/infrastructure/http/shop.client';
import { showConfirm } from '@/shared/utils/alert';
import { useAuthStore } from '@/auth/store/auth.store';
import OrdersPage from './OrdersPage';
import OrderDetailPage from './OrderDetailPage';
import OrderCreatePage from './OrderCreatePage';

const shopGet = shopClient.get as unknown as ReturnType<typeof vi.fn>;
const confirmer = showConfirm as unknown as ReturnType<typeof vi.fn>;

const COMMANDE = {
  id: 'c-42',
  reference: 'CMD-42',
  statut: 'en_attente',
  montantTotal: 5000,
  createdAt: '2026-09-01T10:00:00Z',
  user: { prenom: 'Awa', nom: 'Diop' },
  items: [],
};

const Adresse = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="adresse">{`${pathname}${search}`}</output>;
};

const rendre = (entree: string) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const avecAdresse = (el: JSX.Element) => (
    <>
      {el}
      <Adresse />
    </>
  );
  const router = createMemoryRouter(
    [
      { path: '/boutique/commandes', element: avecAdresse(<OrdersPage />) },
      { path: '/boutique/commandes/nouveau', element: avecAdresse(<OrderCreatePage />) },
      { path: '/boutique/commandes/:id', element: avecAdresse(<OrderDetailPage />) },
    ],
    { initialEntries: [entree] }
  );
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
  return router;
};

const adresse = () => screen.getByTestId('adresse').textContent;

describe('Commandes : navigation Retour et contexte de liste', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
    shopGet.mockImplementation((url: string) => {
      if (url === '/admin/commandes') {
        return Promise.resolve({ commandes: [COMMANDE], pagination: { totalPages: 6 } });
      }
      if (url === '/admin/commandes/kpi') return Promise.resolve({ total: 1 });
      if (url === '/admin/commandes/c-42') return Promise.resolve({ commande: COMMANDE });
      return Promise.resolve([]);
    });
  });

  it('les filtres de l’URL pilotent la liste (recherche, statut, page)', async () => {
    rendre('/boutique/commandes?q=Dakar&statut=en_attente&page=4');
    expect(await screen.findByText('CMD-42')).toBeInTheDocument();
    expect(screen.getByLabelText('Rechercher une commande')).toHaveValue('Dakar');
    expect(screen.getByLabelText('Filtrer par statut')).toHaveValue('en_attente');
    expect(shopGet).toHaveBeenCalledWith('/admin/commandes', {
      params: { search: 'Dakar', statut: 'en_attente', page: 4, limit: 20 },
    });
  });

  it('recherche puis filtre : l’URL est mise à jour et la page revient à 1', async () => {
    rendre('/boutique/commandes?page=4');
    await screen.findByText('CMD-42');
    await userEvent.selectOptions(screen.getByLabelText('Filtrer par statut'), 'livree');
    expect(adresse()).toBe('/boutique/commandes?statut=livree');
    await userEvent.type(screen.getByLabelText('Rechercher une commande'), 'Awa');
    expect(adresse()).toBe('/boutique/commandes?statut=livree&q=Awa');
  });

  it('pagination : changer de page est conservé dans l’URL', async () => {
    rendre('/boutique/commandes?statut=en_attente');
    await screen.findByText('CMD-42');
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    expect(adresse()).toBe('/boutique/commandes?statut=en_attente&page=3');
  });

  it('liste filtrée page 4 → détail → Retour : liste restituée à l’identique', async () => {
    rendre('/boutique/commandes?q=Dakar&statut=en_attente&page=4');
    await screen.findByText('CMD-42');
    await userEvent.click(screen.getByRole('button', { name: 'Voir la commande' }));

    expect(await screen.findByRole('heading', { name: /Commande CMD-42/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));

    await waitFor(() => expect(adresse()).toBe('/boutique/commandes?q=Dakar&statut=en_attente&page=4'));
    expect(screen.getByLabelText('Rechercher une commande')).toHaveValue('Dakar');
    expect(screen.getByLabelText('Filtrer par statut')).toHaveValue('en_attente');
  });

  it('détail ouvert directement par URL → Retour mène à /boutique/commandes', async () => {
    rendre('/boutique/commandes/c-42');
    await screen.findByRole('heading', { name: /Commande CMD-42/ });
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    await waitFor(() => expect(adresse()).toBe('/boutique/commandes'));
  });

  it('commande introuvable : le bouton Retour reste disponible', async () => {
    shopGet.mockImplementation((url: string) =>
      url === '/admin/commandes/inconnue' ? Promise.resolve(null) : Promise.resolve({ commandes: [] })
    );
    rendre('/boutique/commandes/inconnue');
    expect(await screen.findByText('Commande introuvable')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    await waitFor(() => expect(adresse()).toBe('/boutique/commandes'));
  });

  it('liste → « Créer une commande » ouvre la page de création (et non un détail « nouveau »)', async () => {
    rendre('/boutique/commandes?statut=livree');
    await screen.findByText('CMD-42');
    await userEvent.click(screen.getByRole('button', { name: /Créer une commande/ }));
    expect(await screen.findByRole('heading', { name: 'Créer une commande' })).toBeInTheDocument();
    expect(shopGet).not.toHaveBeenCalledWith('/admin/commandes/nouveau');

    // Formulaire vierge : Retour sans confirmation, liste filtrée restituée.
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    await waitFor(() => expect(adresse()).toBe('/boutique/commandes?statut=livree'));
    expect(confirmer).not.toHaveBeenCalled();
  });
});
