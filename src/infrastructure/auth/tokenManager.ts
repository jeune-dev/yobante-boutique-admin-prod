const KEYS = {
  SHOP: 'token_shop',
  SHOP_REFRESH: 'refresh_token_shop',
} as const;

export const tokenManager = {
  // Shop tokens
  getShopToken: (): string | null => {
    return localStorage.getItem(KEYS.SHOP);
  },

  setShopToken: (token: string): void => {
    localStorage.setItem(KEYS.SHOP, token);
  },

  removeShopToken: (): void => {
    localStorage.removeItem(KEYS.SHOP);
  },

  // Shop refresh token (envoyé dans le body de /auth/refresh)
  getShopRefreshToken: (): string | null => {
    return localStorage.getItem(KEYS.SHOP_REFRESH);
  },

  setShopRefreshToken: (token: string): void => {
    localStorage.setItem(KEYS.SHOP_REFRESH, token);
  },

  // Clear all tokens (logout)
  clearAll: (): void => {
    localStorage.removeItem(KEYS.SHOP);
    localStorage.removeItem(KEYS.SHOP_REFRESH);
  },
};
