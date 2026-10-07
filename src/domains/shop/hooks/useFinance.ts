import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { financeApi, type FiltresReversements } from '@/domains/shop/api/finance.api';
import { CLE_ANALYTIQUE } from '@/domains/shop/hooks/useAnalytique';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';
import type { CreationReversement, StatutReversement } from '@/domains/shop/types/finance';

export const CLE_FINANCE = 'shop-finance';

export const useSyntheseFinance = (filtres: FiltrePeriode = {}) =>
  useQuery({
    queryKey: [CLE_FINANCE, 'synthese', filtres],
    queryFn: () => financeApi.synthese(filtres),
    staleTime: 30_000,
  });

export const useComptesVendeurs = (filtres: FiltrePeriode = {}) =>
  useQuery({
    queryKey: [CLE_FINANCE, 'comptes-vendeurs', filtres],
    queryFn: () => financeApi.comptesVendeurs(filtres),
    staleTime: 30_000,
  });

export const useReversements = (filtres: FiltresReversements = {}) =>
  useQuery({
    queryKey: [CLE_FINANCE, 'reversements', filtres],
    queryFn: () => financeApi.listerReversements(filtres),
    staleTime: 30_000,
  });

/**
 * Tout écrit en finance déplace des soldes calculés : les comptes vendeurs,
 * la synthèse et l'alerte « paiements en attente » sont invalidés ensemble.
 * N'invalider que la liste laissait le reste du dashboard sur l'ancien solde.
 */
const invaliderFinance = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: [CLE_FINANCE] });
  qc.invalidateQueries({ queryKey: [CLE_ANALYTIQUE, 'alertes'] });
};

export const useCreerReversement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (corps: CreationReversement) => financeApi.creerReversement(corps),
    onSuccess: () => invaliderFinance(qc),
  });
};

export const useChangerStatutReversement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut }: { id: string; statut: StatutReversement }) =>
      financeApi.changerStatutReversement(id, statut),
    onSuccess: () => invaliderFinance(qc),
  });
};

/**
 * Changer un taux recalcule toutes les commissions passées du vendeur : la
 * synthèse, les comptes et le tableau analytique des vendeurs bougent tous.
 */
export const useDefinirTauxCommission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vendeurId, taux }: { vendeurId: string; taux: number | null }) =>
      financeApi.definirTauxCommission(vendeurId, taux),
    onSuccess: () => {
      invaliderFinance(qc);
      qc.invalidateQueries({ queryKey: [CLE_ANALYTIQUE] });
    },
  });
};
