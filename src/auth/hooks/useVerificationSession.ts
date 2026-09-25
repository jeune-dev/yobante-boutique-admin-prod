import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import {
  estAdminBoutique,
  estMotDePasseAChanger,
  MESSAGE_ACCES_RESERVE,
} from '@/auth/services/auth.service';
import { useAuthStore } from '@/auth/store/auth.store';

interface SessionAdmin {
  user?: { id: string; role?: string };
}

/**
 * Vérifie côté serveur que la session boutique stockée localement appartient
 * bien à un administrateur (`GET /admin/me`, derrière le middleware ADMIN).
 *
 * Le store et les jetons vivent dans le localStorage : un `isAuthenticated`
 * forgé, ou un jeton obtenu depuis l'application mobile (vendeur, client),
 * ne doivent pas suffire à afficher le dashboard. Le backend est l'autorité :
 * s'il refuse (401/403), la session locale est effacée.
 */
export const useVerificationSession = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isShopAvailable = useAuthStore((s) => s.isShopAvailable);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);

  // Seule la session boutique est vérifiée ici : le back colis est un autre
  // service, avec son propre contrôle sur ses endpoints.
  // Tant que le mot de passe temporaire n'est pas remplacé, le backend répond
  // 403 : ce n'est pas un refus de session, la garde renvoie vers le changement.
  const aVerifier = isAuthenticated && isShopAvailable && !mustChangePassword;

  const query = useQuery({
    queryKey: ['session', 'admin'],
    queryFn: async () => {
      const session = await shopClient.get<SessionAdmin>('/admin/me');
      if (!estAdminBoutique(session?.user)) {
        throw { status: 403, message: MESSAGE_ACCES_RESERVE };
      }
      return session;
    },
    enabled: aVerifier,
    retry: false,
    // Re-vérifiée au plus toutes les 5 minutes, et à chaque retour sur l'onglet.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Seul un refus explicite du serveur invalide la session : une panne réseau
  // ne doit pas déconnecter l'administrateur.
  const statut = (query.error as { status?: number } | null)?.status;
  const motDePasseAChanger = aVerifier && query.isError && estMotDePasseAChanger(query.error);
  const refusee =
    aVerifier && query.isError && !motDePasseAChanger && (statut === 401 || statut === 403);

  return {
    /** Vrai tant que le serveur n'a pas confirmé la session (premier chargement). */
    enCours: aVerifier && query.isPending,
    /** Le serveur a refusé la session : l'appelant doit la fermer. */
    refusee,
    /** Le serveur exige le remplacement du mot de passe temporaire. */
    motDePasseAChanger,
  };
};
