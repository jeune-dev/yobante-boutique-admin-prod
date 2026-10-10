import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tokenManager } from '@/infrastructure/auth/tokenManager';
import { queryClient } from '@/config/queryClient';

export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isShopAvailable: boolean;
  isLoading: boolean;
  /**
   * Compte créé avec un mot de passe temporaire (ou identifiants renvoyés) :
   * le backend refuse toute route admin tant qu'il n'a pas été remplacé.
   */
  mustChangePassword: boolean;

  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setShopAvailable: (value: boolean) => void;
  setLoading: (loading: boolean) => void;
  setMustChangePassword: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isShopAvailable: false,
      isLoading: false,
      mustChangePassword: false,

      setUser: (user) => set({ user }),
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setShopAvailable: (value) => set({ isShopAvailable: value }),
      setLoading: (loading) => set({ isLoading: loading }),
      setMustChangePassword: (value) => set({ mustChangePassword: value }),

      logout: () => {
        tokenManager.clearAll();
        // Aucune donnée protégée ne doit survivre à la session : le cache des
        // requêtes est vidé, sinon un autre compte connecté ensuite sur le
        // même navigateur verrait brièvement les données du précédent.
        queryClient.clear();
        set({
          user: null,
          isAuthenticated: false,
          isShopAvailable: false,
          mustChangePassword: false,
        });
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        isShopAvailable: state.isShopAvailable,
        mustChangePassword: state.mustChangePassword,
      }),
    }
  )
);
