import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { matchRoutes, createMemoryRouter, RouterProvider, Link, useLocation, type RouteObject } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

vi.mock('@/shared/utils/alert', () => ({ showConfirm: vi.fn(), showError: vi.fn(), showSuccess: vi.fn() }));
vi.mock('@/infrastructure/http/shop.client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import shopClient from '@/infrastructure/http/shop.client';
import { useAuthStore } from '@/auth/store/auth.store';
import { router } from './index';
import { PrivateRoute } from './PrivateRoute';
import AdminBackButton from '@/shared/components/AdminBackButton';
import { etatRetour } from '@/shared/hooks/useRetour';
import OrderCreatePage from '@/pages/shop/orders/OrderCreatePage';
import OrderDetailPage from '@/pages/shop/orders/OrderDetailPage';
import ProductCreatePage from '@/pages/shop/products/ProductCreatePage';
import ProductEditPage from '@/pages/shop/products/ProductEditPage';
import UserDetailPage from '@/pages/shop/users/UserDetailPage';
import SousRayonProduitsPage from '@/pages/shop/rayons/SousRayonProduitsPage';
import SousSectionPage from '@/pages/shop/accueil/SousSectionPage';

const shopGet = shopClient.get as unknown as ReturnType<typeof vi.fn>;

/** Composant rendu par la route la plus précise correspondant à `chemin`. */
const pageDe = (chemin: string) => {
  const correspondances = matchRoutes(router.routes as RouteObject[], chemin) ?? [];
  const element = correspondances[correspondances.length - 1]?.route.element as ReactElement | undefined;
  return element?.type;
};

describe('Table des routes du dashboard', () => {
  it.each([
    ['/boutique/commandes/nouveau', OrderCreatePage],
    ['/boutique/commandes/123', OrderDetailPage],
    ['/boutique/produits/nouveau', ProductCreatePage],
    ['/boutique/produits/123/modifier', ProductEditPage],
    ['/boutique/clients/123', UserDetailPage],
    ['/boutique/rayons/sous-rayon/123', SousRayonProduitsPage],
    ['/boutique/accueil/sous-section/123', SousSectionPage],
  ])('%s → page attendue', (chemin, page) => {
    expect(pageDe(chemin)).toBe(page);
  });

  it('toutes les pages /boutique et /colis sont derrière PrivateRoute', () => {
    for (const chemin of [
      '/boutique/dashboard',
      '/boutique/commandes/nouveau',
      '/boutique/commandes/1',
      '/boutique/produits/1/modifier',
      '/boutique/clients/1',
      '/boutique/rayons/sous-rayon/1',
      '/boutique/profil',
      '/colis/dashboard',
    ]) {
      const correspondances = matchRoutes(router.routes as RouteObject[], chemin) ?? [];
      const garde = correspondances.some((c) => (c.route.element as ReactElement | undefined)?.type === PrivateRoute);
      expect(garde, chemin).toBe(true);
    }
  });
});

describe('Retour et sécurité de session', () => {
  const Liste = () => {
    const location = useLocation();
    return (
      <div>
        <h1>LISTE PROTÉGÉE</h1>
        <Link to="/boutique/commandes/1" state={etatRetour(location)}>
          Voir
        </Link>
      </div>
    );
  };
  const Detail = () => (
    <div>
      <h1>DÉTAIL PROTÉGÉ</h1>
      <AdminBackButton parent="/boutique/commandes" />
    </div>
  );

  const rendre = (entree: string) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const routeur = createMemoryRouter(
      [
        { path: '/login', element: <h1>PAGE LOGIN</h1> },
        {
          element: <PrivateRoute />,
          children: [
            { path: '/boutique/commandes', element: <Liste /> },
            { path: '/boutique/commandes/:id', element: <Detail /> },
          ],
        },
      ],
      { initialEntries: [entree] }
    );
    render(
      <QueryClientProvider client={qc}>
        <RouterProvider router={routeur} />
      </QueryClientProvider>
    );
    return routeur;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('non connecté : un lien direct vers un détail renvoie à la connexion, sans Retour exploitable', async () => {
    rendre('/boutique/commandes/1');
    expect(await screen.findByRole('heading', { name: 'PAGE LOGIN' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retour' })).not.toBeInTheDocument();
  });

  it('après déconnexion, le Précédent du navigateur ne rouvre pas une page protégée', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isShopAvailable: true,
      user: { id: '1', email: 'a@b.c', nom: 'N', prenom: 'P', role: 'ADMIN' },
    });
    shopGet.mockResolvedValue({ user: { id: '1', role: 'ADMIN' } });
    const routeur = rendre('/boutique/commandes');
    await userEvent.click(await screen.findByText('Voir'));
    expect(await screen.findByRole('heading', { name: 'DÉTAIL PROTÉGÉ' })).toBeInTheDocument();

    act(() => useAuthStore.getState().logout());
    expect(await screen.findByRole('heading', { name: 'PAGE LOGIN' })).toBeInTheDocument();

    await act(() => routeur.navigate(-1));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'PAGE LOGIN' })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: /PROTÉGÉ/ })).not.toBeInTheDocument();
  });

  it('session confirmée : Retour du détail ramène à la liste, toujours via la garde', async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      isShopAvailable: true,
      user: { id: '1', email: 'a@b.c', nom: 'N', prenom: 'P', role: 'ADMIN' },
    });
    shopGet.mockResolvedValue({ user: { id: '1', role: 'ADMIN' } });
    rendre('/boutique/commandes/1');
    await userEvent.click(await screen.findByRole('button', { name: 'Retour' }));
    expect(await screen.findByRole('heading', { name: 'LISTE PROTÉGÉE' })).toBeInTheDocument();
  });
});
