import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

vi.mock('@/shared/utils/alert', () => ({ showError: vi.fn(), showSuccess: vi.fn() }));
vi.mock('@/infrastructure/http/shop.client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

import shopClient from '@/infrastructure/http/shop.client';
import { useAuthStore } from '@/auth/store/auth.store';
import { PrivateRoute } from './PrivateRoute';

const shopGet = shopClient.get as unknown as ReturnType<typeof vi.fn>;

const rendre = (chemin = '/boutique/dashboard') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[chemin]}>
        <Routes>
          <Route path="/login" element={<div>PAGE LOGIN</div>} />
          <Route element={<PrivateRoute />}>
            <Route path="/boutique/dashboard" element={<div>DASHBOARD PROTÉGÉ</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const session = (role: string) =>
  useAuthStore.setState({
    isAuthenticated: true,
    isShopAvailable: true,
    user: { id: '1', email: 'x@y.z', nom: 'N', prenom: 'P', role },
  });

describe('PrivateRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().logout();
  });

  it('non connecté → renvoyé vers /login, aucun appel API', async () => {
    rendre();
    expect(await screen.findByText('PAGE LOGIN')).toBeInTheDocument();
    expect(shopGet).not.toHaveBeenCalled();
  });

  it('session locale VENDEUR (stockage antérieur) → purgée et renvoyée vers /login', async () => {
    session('VENDEUR');
    rendre();
    expect(await screen.findByText('PAGE LOGIN')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('session ADMIN confirmée par GET /admin/me → contenu affiché', async () => {
    session('ADMIN');
    shopGet.mockResolvedValue({ user: { id: '1', role: 'ADMIN' } });
    rendre();
    expect(await screen.findByText('DASHBOARD PROTÉGÉ')).toBeInTheDocument();
    expect(shopGet).toHaveBeenCalledWith('/admin/me');
  });

  it('rien n’est affiché tant que le serveur n’a pas confirmé', () => {
    session('ADMIN');
    shopGet.mockReturnValue(new Promise(() => {}));
    rendre();
    expect(screen.queryByText('DASHBOARD PROTÉGÉ')).not.toBeInTheDocument();
    expect(screen.getByText(/Vérification de la session/)).toBeInTheDocument();
  });

  it('serveur → 403 (jeton d’un autre rôle, forgé ou compte désactivé) : session effacée', async () => {
    session('ADMIN');
    shopGet.mockRejectedValue({ status: 403, message: 'Accès refusé' });
    rendre();
    expect(await screen.findByText('PAGE LOGIN')).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
  });

  it('serveur → 401 (jeton expiré, refresh impossible) : session effacée', async () => {
    session('ADMIN');
    shopGet.mockRejectedValue({ status: 401, message: 'Token expiré' });
    rendre();
    expect(await screen.findByText('PAGE LOGIN')).toBeInTheDocument();
  });

  it('serveur → 500 ou panne réseau : la session N’EST PAS fermée', async () => {
    session('ADMIN');
    shopGet.mockRejectedValue({ status: 500, message: 'Erreur interne' });
    rendre();
    expect(await screen.findByText('DASHBOARD PROTÉGÉ')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('serveur répond avec un utilisateur non ADMIN : session effacée', async () => {
    session('ADMIN');
    shopGet.mockResolvedValue({ user: { id: '1', role: 'VENDEUR' } });
    rendre();
    expect(await screen.findByText('PAGE LOGIN')).toBeInTheDocument();
  });
});
