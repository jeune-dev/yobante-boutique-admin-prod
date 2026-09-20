import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/auth/store/auth.store';
import { useVerificationSession } from '@/auth/hooks/useVerificationSession';
import { MESSAGE_ACCES_RESERVE } from '@/auth/services/auth.service';
import { showError } from '@/shared/utils/alert';

// Rôles boutique qui n'ont pas accès au dashboard : ils utilisent l'app mobile.
// Une session de ce type ne peut venir que d'un stockage antérieur à la
// restriction de la connexion aux administrateurs — on la referme.
const ROLES_SANS_ACCES = ['VENDEUR', 'CLIENT'];

/**
 * Garde des routes du dashboard. Deux niveaux :
 *  1. local : session absente ou rôle interdit → connexion ;
 *  2. serveur : `GET /admin/me` doit confirmer un administrateur actif, sinon
 *     la session locale (stockée dans le navigateur, donc falsifiable) est
 *     effacée. Rien n'est affiché tant que le serveur n'a pas répondu.
 */
export const PrivateRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { enCours, refusee } = useVerificationSession();

  const roleInterdit =
    isAuthenticated && ROLES_SANS_ACCES.includes(user?.role?.toUpperCase() ?? '');
  const sessionInterdite = roleInterdit || refusee;

  useEffect(() => {
    if (!sessionInterdite) return;
    logout();
    showError(MESSAGE_ACCES_RESERVE);
  }, [sessionInterdite, logout]);

  if (!isAuthenticated || sessionInterdite) {
    return <Navigate to="/login" replace />;
  }

  if (enCours) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-gray-400">
        Vérification de la session…
      </div>
    );
  }

  return <Outlet />;
};
