import { QueryClient } from '@tanstack/react-query';
import { showError } from '@/shared/utils/alert';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
      // Filet de sécurité : une mutation qui ne définit pas son propre
      // `onError` affichait un échec en silence (archivage d'un rayon, validation
      // d'une commande…). Une option locale remplace celle-ci.
      onError: (erreur) => {
        void showError(erreur);
      },
    },
  },
});
