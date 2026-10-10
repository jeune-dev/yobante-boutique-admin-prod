import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/auth/store/auth.store';
import { useVerificationSession } from '@/auth/hooks/useVerificationSession';
import { MESSAGE_ACCES_RESERVE, estAdminBoutique } from '@/auth/services/auth.service';
import { showError } from '@/shared/utils/alert';

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
  const mustChangePassword = useAuthStore((state) => state.mustChangePassword);
  const setMustChangePassword = useAuthStore((state) => state.setMustChangePassword);
  const { enCours, refusee, motDePasseAChanger } = useVerificationSession();

  // Liste blanche, et non liste noire. La version précédente refusait
  // explicitement VENDEUR et CLIENT : tout rôle absent de cette liste (un
  // futur SUPPORT, LIVREUR, GESTIONNAIRE, ou une valeur vide) était donc
  // accepté par défaut. Ici seul ADMIN ouvre le dashboard ; l'ajout d'un rôle
  // côté backend ne peut plus accorder l'accès par omission.
  const roleInterdit = isAuthenticated && !estAdminBoutique(user);
  const sessionInterdite = roleInterdit || refusee;

  useEffect(() => {
    if (!sessionInterdite) return;
    logout();
    showError(MESSAGE_ACCES_RESERVE);
  }, [sessionInterdite, logout]);

  useEffect(() => {
    if (motDePasseAChanger) setMustChangePassword(true);
  }, [motDePasseAChanger, setMustChangePassword]);

  if (!isAuthenticated || sessionInterdite) {
    return <Navigate to="/login" replace />;
  }

  // Mot de passe temporaire : aucune page du dashboard avant son remplacement.
  if (mustChangePassword || motDePasseAChanger) {
    return <Navigate to="/changer-mot-de-passe" replace />;
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
