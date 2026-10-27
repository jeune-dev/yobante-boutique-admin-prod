import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi, PaymentFilters } from '@/domains/shop/api/payments.api';

const KEY = 'shop-payments';

export const usePayments = (filters: PaymentFilters = {}) =>
  useQuery({
    queryKey: [KEY, filters],
    queryFn: () => paymentsApi.getAll(filters),
    // Rechargée à chaque ouverture : un statut changé ailleurs (commande
    // livrée, paiement confirmé) doit apparaître sans attendre.
    staleTime: 0,
  });

/** Enregistre un paiement comme reçu (`en_attente` → `succes`). */
export const useConfirmerPaiement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsApi.confirmer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};

export const useRembourser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsApi.rembourser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
};
