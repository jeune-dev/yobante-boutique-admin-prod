import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, UserFilters } from '@/domains/shop/api/users.api';

const KEY = 'shop-users';

export const useUsers = (filters: UserFilters = {}) =>
  useQuery({
    queryKey: [KEY, filters],
    queryFn: () => usersApi.getAll(filters),
    staleTime: 30_000,
  });

export const useToggleUserActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? usersApi.bloquer(id) : usersApi.activer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

/**
 * Suppression d'un compte client. Le backend l'anonymise et le ferme au lieu
 * de l'effacer (l'historique des commandes reste) ; il refuse tant que le
 * client a des commandes en cours.
 */
export const useSupprimerClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.supprimerClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
