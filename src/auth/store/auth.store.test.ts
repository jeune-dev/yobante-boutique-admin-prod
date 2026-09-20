import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth.store';
import { tokenManager } from '@/infrastructure/auth/tokenManager';
import { queryClient } from '@/config/queryClient';

describe('auth.store.logout', () => {
  beforeEach(() => {
    tokenManager.setShopToken('jeton');
    tokenManager.setShopRefreshToken('refresh');
    tokenManager.setShipmentToken('colis');
    queryClient.setQueryData(['admin-produits'], { produits: [{ id: 1 }] });
    useAuthStore.setState({
      isAuthenticated: true,
      isShopAvailable: true,
      selectedApp: 'shop',
      user: { id: '1', email: 'a@b.c', nom: 'N', prenom: 'P', role: 'ADMIN' },
    });
  });

  it('efface jetons, profil, application choisie et cache des requêtes', () => {
    useAuthStore.getState().logout();

    expect(tokenManager.getShopToken()).toBeNull();
    expect(tokenManager.getShopRefreshToken()).toBeNull();
    expect(tokenManager.getShipmentToken()).toBeNull();
    expect(queryClient.getQueryData(['admin-produits'])).toBeUndefined();

    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(s.selectedApp).toBeNull();
    expect(s.isShopAvailable).toBe(false);
  });

  it('ne persiste plus rien de sensible dans le stockage local', () => {
    useAuthStore.getState().logout();
    const persiste = JSON.parse(localStorage.getItem('auth-store') ?? '{}');
    expect(persiste.state?.user ?? null).toBeNull();
    expect(persiste.state?.isAuthenticated ?? false).toBe(false);
    expect(JSON.stringify(localStorage)).not.toMatch(/jeton|refresh|colis/);
  });
});
