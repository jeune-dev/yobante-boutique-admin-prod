import { useNavigate } from 'react-router-dom';
import { useAuthStore, type User } from '@/auth/store/auth.store';
import { authService } from '@/auth/services/auth.service';
import { tokenManager } from '@/infrastructure/auth/tokenManager';

export type { User };

export const useAuth = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isShopAvailable = useAuthStore((state) => state.isShopAvailable);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    // 1. Purge locale immédiate (jetons, profil, cache) et retour à la
    //    connexion : l'utilisateur ne doit pas rester des secondes sur une
    //    page « connectée » pendant qu'un backend lent répond.
    const refreshToken = tokenManager.getShopRefreshToken();
    logout();
    navigate('/login', { replace: true });
    // 2. Révocation serveur en arrière-plan (non bloquante).
    void authService.logout(refreshToken);
  };

  return {
    user,
    isAuthenticated,
    isShopAvailable,
    logout: handleLogout,
  };
};
