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
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import shopClient from '@/infrastructure/http/shop.client';
import { showError } from '@/shared/utils/alert';
import { useAuthStore } from '@/auth/store/auth.store';
import OrdersPage from './OrdersPage';
import OrderDetailPage from './OrderDetailPage';

const shopGet = shopClient.get as unknown as ReturnType<typeof vi.fn>;
const shopPatch = shopClient.patch as unknown as ReturnType<typeof vi.fn>;
const erreur = showError as unknown as ReturnType<typeof vi.fn>;

const COMMANDE = {
  id: 'c-42',
  reference: 'CMD-42',
  statut: 'en_attente',
  montantTotal: 5000,
  createdAt: '2026-09-01T10:00:00Z',
  user: { prenom: 'Awa', nom: 'Diop' },
  items: [],
};

const rendre = (entree: string) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/boutique/commandes', element: <OrdersPage /> },
      { path: '/boutique/commandes/:id', element: <OrderDetailPage /> },
    ],
    { initialEntries: [entree] }
  );
  render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

const confirmerRejet = async (motif: string) => {
  const modal = await screen.findByRole('dialog', { name: 'Rejeter la commande' });
  if (motif) await userEvent.type(within(modal).getByLabelText('Motif du rejet'), motif);
  await userEvent.click(within(modal).getByRole('button', { name: 'Rejeter' }));
};

describe('Commandes : rejet depuis le dashboard', () => {
  let commande: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
    commande = { ...COMMANDE };
    shopGet.mockImplementation((url: string) => {
      if (url === '/admin/commandes') return Promise.resolve({ commandes: [commande], pagination: { totalPages: 1 } });
      if (url === '/admin/commandes/kpi') return Promise.resolve({ total: 5, annulees: 2, rejetees: 1 });
      if (url === '/admin/commandes/c-42') return Promise.resolve({ commande });
      return Promise.resolve([]);
    });
    shopPatch.mockResolvedValue({ message: 'Commande rejetée avec succès' });
  });

  it('liste : le modal envoie { motif } sur PATCH /admin/commandes/:id/rejeter', async () => {
    rendre('/boutique/commandes');
    await screen.findByText('CMD-42');
    await userEvent.click(screen.getByRole('button', { name: 'Rejeter la commande' }));
    await confirmerRejet('Stock insuffisant');

    expect(shopPatch).toHaveBeenCalledWith('/admin/commandes/c-42/rejeter', { motif: 'Stock insuffisant' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('détail : le modal envoie { motif } sur PATCH /admin/commandes/:id/rejeter', async () => {
    rendre('/boutique/commandes/c-42');
    await screen.findByRole('heading', { name: /Commande CMD-42/ });
    await userEvent.click(screen.getByRole('button', { name: 'Rejeter' }));
    await confirmerRejet('Produit indisponible');

    expect(shopPatch).toHaveBeenCalledWith('/admin/commandes/c-42/rejeter', { motif: 'Produit indisponible' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('motif vide : message clair, aucun appel', async () => {
    rendre('/boutique/commandes/c-42');
    await screen.findByRole('heading', { name: /Commande CMD-42/ });
    await userEvent.click(screen.getByRole('button', { name: 'Rejeter' }));
    await confirmerRejet('');

    expect(erreur).toHaveBeenCalledWith('Le motif du rejet est obligatoire');
    expect(shopPatch).not.toHaveBeenCalled();
  });

  it('refus du backend : l’erreur est affichée et le modal reste ouvert', async () => {
    const refus = new Error('Seule une commande en attente peut être rejetée');
    shopPatch.mockRejectedValueOnce(refus);
    rendre('/boutique/commandes');
    await screen.findByText('CMD-42');
    await userEvent.click(screen.getByRole('button', { name: 'Rejeter la commande' }));
    await confirmerRejet('Trop tard');

    await waitFor(() => expect(erreur).toHaveBeenCalledWith(refus));
    expect(screen.getByRole('dialog', { name: 'Rejeter la commande' })).toBeInTheDocument();
  });

  it('commande rejetée : motif affiché, plus de bouton Rejeter', async () => {
    commande = { ...COMMANDE, statut: 'rejetee', motifRejet: 'Stock insuffisant' };
    rendre('/boutique/commandes/c-42');
    expect(await screen.findByText('Stock insuffisant')).toBeInTheDocument();
    expect(screen.getByText('rejetee')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejeter' })).not.toBeInTheDocument();
  });

  it('KPI : les commandes rejetées sont comptées avec les annulées', async () => {
    rendre('/boutique/commandes');
    const tuile = (await screen.findByText('Annulées / rejetées')).parentElement!;
    await waitFor(() => expect(within(tuile).getByText('3')).toBeInTheDocument());
  });
});
