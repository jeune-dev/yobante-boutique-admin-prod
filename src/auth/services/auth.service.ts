import shopClient from '@/infrastructure/http/shop.client';
import shipmentClient from '@/infrastructure/http/shipment.client';
import { tokenManager } from '@/infrastructure/auth/tokenManager';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

// Le backend boutique répond { success, message, data: { token, refreshToken,
// user } }, mais shopClient déballe déjà l'enveloppe : on reçoit donc
// directement { token, refreshToken, user }. Le repli sur `data` couvre le cas
// où la réponse arriverait encore enveloppée.
interface ShopLoginBody {
  token?: string;
  refreshToken?: string;
  user?: AuthUser;
  data?: {
    token?: string;
    refreshToken?: string;
    user?: AuthUser;
  };
}

// Normalise la réponse boutique vers { accessToken, user }
const normalizeShopAuth = (body: ShopLoginBody): AuthResponse => {
  const contenu = body?.token || body?.user ? body : (body?.data ?? {});
  return {
    accessToken: contenu.token ?? '',
    refreshToken: contenu.refreshToken,
    user: contenu.user as AuthUser,
  };
};

export interface LoginResult {
  shop: { success: boolean; data?: AuthResponse; error?: any };
  shipment: { success: boolean; data?: AuthResponse; error?: any };
  user?: AuthResponse['user'];
}

/** Seul rôle boutique autorisé à ouvrir une session sur ce dashboard. */
export const ROLE_ADMIN = 'ADMIN';

export const MESSAGE_ACCES_RESERVE = 'Accès réservé aux administrateurs Yobante.';

/**
 * Un compte boutique qui n'est pas ADMIN (vendeur, client) n'a rien à faire
 * ici : il se connecte depuis l'application mobile. Le backend le refuse déjà
 * sur `/auth/admin/login` ; cette garde évite qu'une réponse inattendue
 * n'ouvre malgré tout le dashboard.
 */
export const estAdminBoutique = (user?: { role?: string } | null) =>
  user?.role?.toUpperCase() === ROLE_ADMIN;

export const authService = {
  login: async (payload: LoginPayload): Promise<LoginResult> => {
    const results = await Promise.allSettled([
      // Backend boutique : endpoint réservé aux administrateurs, attend
      // { identifiant, password } et répond 403 pour tout autre rôle.
      shopClient.post('/auth/admin/login', {
        identifiant: payload.email,
        password: payload.password,
      }),
      shipmentClient.post('/auth/login', payload),
    ]);

    let shopResult: LoginResult['shop'] =
      results[0].status === 'fulfilled'
        ? { success: true, data: normalizeShopAuth(results[0].value as unknown as ShopLoginBody) }
        : { success: false, error: results[0].reason };

    if (shopResult.success && !estAdminBoutique(shopResult.data?.user)) {
      shopResult = { success: false, error: { status: 403, message: MESSAGE_ACCES_RESERVE } };
    }

    const shipmentResult =
      results[1].status === 'fulfilled'
        ? { success: true, data: results[1].value as unknown as AuthResponse }
        : { success: false, error: results[1].reason };

    // Store tokens
    if (shopResult.success && shopResult.data) {
      tokenManager.setShopToken(shopResult.data.accessToken);
      if (shopResult.data.refreshToken) {
        tokenManager.setShopRefreshToken(shopResult.data.refreshToken);
      }
    }

    if (shipmentResult.success && shipmentResult.data) {
      tokenManager.setShipmentToken(shipmentResult.data.accessToken);
    }

    // Use shop user data if available, else shipment
    const user = shopResult.data?.user || shipmentResult.data?.user;

    return {
      shop: shopResult,
      shipment: shipmentResult,
      user,
    };
  },

  /**
   * Révocation côté serveur, appelée APRÈS la purge locale (voir useAuth) :
   * la session doit disparaître de l'écran immédiatement, sans attendre un
   * backend lent ou injoignable. Le refresh token est passé en paramètre car
   * le stockage local est déjà vidé ; il est envoyé explicitement parce que
   * le dashboard n'est pas sur l'origine du backend (cookie HttpOnly absent).
   */
  logout: async (refreshToken: string | null): Promise<void> => {
    try {
      await Promise.allSettled([
        refreshToken
          ? shopClient.post('/auth/logout', { refreshToken }, { timeout: 5_000 })
          : Promise.resolve(),
        shipmentClient.post('/auth/logout', {}, { timeout: 5_000 }),
      ]);
    } catch {
      // Ignore errors on logout
    } finally {
      tokenManager.clearAll();
    }
  },
};
