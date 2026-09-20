import { describe, it, expect, vi, beforeEach } from 'vitest';

// Les clients HTTP sont doublés : on teste la logique de session, pas axios.
vi.mock('@/infrastructure/http/shop.client', () => ({ default: { post: vi.fn() } }));
vi.mock('@/infrastructure/http/shipment.client', () => ({ default: { post: vi.fn() } }));

import shopClient from '@/infrastructure/http/shop.client';
import shipmentClient from '@/infrastructure/http/shipment.client';
import { authService, estAdminBoutique, MESSAGE_ACCES_RESERVE } from './auth.service';
import { tokenManager } from '@/infrastructure/auth/tokenManager';

const shopPost = shopClient.post as unknown as ReturnType<typeof vi.fn>;
const shipmentPost = shipmentClient.post as unknown as ReturnType<typeof vi.fn>;

const admin = { id: '1', email: 'admin@yobante.com', nom: 'Diallo', prenom: 'Aminata', role: 'ADMIN' };

describe('authService.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenManager.clearAll();
    shipmentPost.mockRejectedValue({ status: 0, message: 'injoignable' });
  });

  it('appelle le endpoint réservé aux administrateurs avec { identifiant, password }', async () => {
    shopPost.mockResolvedValue({ token: 't', refreshToken: 'r', user: admin });
    await authService.login({ email: 'admin@yobante.com', password: 'x' });
    expect(shopPost).toHaveBeenCalledWith('/auth/admin/login', {
      identifiant: 'admin@yobante.com',
      password: 'x',
    });
  });

  it('ouvre la session boutique et mémorise les jetons pour un ADMIN', async () => {
    shopPost.mockResolvedValue({ token: 'jeton', refreshToken: 'refresh', user: admin });
    const r = await authService.login({ email: 'admin@yobante.com', password: 'x' });
    expect(r.shop.success).toBe(true);
    expect(r.user?.role).toBe('ADMIN');
    expect(tokenManager.getShopToken()).toBe('jeton');
    expect(tokenManager.getShopRefreshToken()).toBe('refresh');
  });

  it('refuse un compte VENDEUR même si le backend répondait 200 (garde locale)', async () => {
    shopPost.mockResolvedValue({ token: 'jeton', refreshToken: 'r', user: { ...admin, role: 'VENDEUR' } });
    const r = await authService.login({ email: 'v@x.com', password: 'x' });
    expect(r.shop.success).toBe(false);
    expect(r.shop.error.message).toBe(MESSAGE_ACCES_RESERVE);
    expect(r.user).toBeUndefined();
  });

  it('remonte le 403 du backend pour un non-admin, sans jeton stocké', async () => {
    shopPost.mockRejectedValue({ status: 403, message: 'Accès réservé aux administrateurs Yobante.' });
    const r = await authService.login({ email: 'v@x.com', password: 'x' });
    expect(r.shop.success).toBe(false);
    expect(r.shop.error.status).toBe(403);
    expect(tokenManager.getShopToken()).toBeNull();
  });

  it('identifiants faux : aucune session', async () => {
    shopPost.mockRejectedValue({ status: 400, message: 'Identifiant ou mot de passe incorrect' });
    const r = await authService.login({ email: 'a@b.c', password: 'x' });
    expect(r.user).toBeUndefined();
    expect(tokenManager.getShopToken()).toBeNull();
  });
});

describe('authService.logout', () => {
  it('révoque le refresh token côté serveur et vide les jetons', async () => {
    shopPost.mockResolvedValue({});
    shipmentPost.mockResolvedValue({});
    tokenManager.setShopToken('t');
    await authService.logout('refresh-abc');
    expect(shopPost).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refresh-abc' }, expect.any(Object));
    expect(tokenManager.getShopToken()).toBeNull();
  });

  it('un backend injoignable ne bloque pas la déconnexion', async () => {
    shopPost.mockRejectedValue(new Error('réseau'));
    shipmentPost.mockRejectedValue(new Error('réseau'));
    tokenManager.setShopToken('t');
    await expect(authService.logout('r')).resolves.toBeUndefined();
    expect(tokenManager.getShopToken()).toBeNull();
  });
});

describe('estAdminBoutique', () => {
  it.each([
    [{ role: 'ADMIN' }, true],
    [{ role: 'admin' }, true],
    [{ role: 'VENDEUR' }, false],
    [{ role: 'CLIENT' }, false],
    [{}, false],
    [null, false],
    [undefined, false],
  ])('%o → %s', (user, attendu) => {
    expect(estAdminBoutique(user as any)).toBe(attendu);
  });
});
