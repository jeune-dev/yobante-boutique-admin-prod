import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  indicateursApi,
  type FiltresRetours,
  type CreationRetour,
  type TraitementRetour,
  type AnnulationCommande,
  type ModificationCommande,
} from '@/domains/shop/api/indicateurs.api';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';

const CLE_KPI = 'shop-kpi-ventes';
const CLE_RETOURS = 'shop-retours';
const CLE_KPI_RETOURS = 'shop-kpi-retours';
const CLE_FIABILITE = 'shop-fiabilite-vendeurs';
const CLE_COMMANDES = 'shop-commandes';
const CLE_DASHBOARD = 'dashboard-kpi';

export const useKpiVentes = (filtres: FiltrePeriode = {}) =>
  useQuery({
    queryKey: [CLE_KPI, filtres],
    queryFn: () => indicateursApi.kpiVentes(filtres),
    staleTime: 30_000,
  });

export const useInscriptions = (params: { pas?: 'jour' | 'mois' } = {}) =>
  useQuery({
    queryKey: ['shop-inscriptions', params],
    queryFn: () => indicateursApi.inscriptions(params),
    staleTime: 60_000,
  });

export const useKpiRetours = (filtres: FiltrePeriode = {}) =>
  useQuery({
    queryKey: [CLE_KPI_RETOURS, filtres],
    queryFn: () => indicateursApi.kpiRetours(filtres),
    staleTime: 30_000,
  });

export const useRetours = (filtres: FiltresRetours = {}) =>
  useQuery({
    queryKey: [CLE_RETOURS, filtres],
    queryFn: () => indicateursApi.listerRetours(filtres),
    staleTime: 30_000,
  });

export const useFiabiliteVendeurs = (params: { limit?: number } = {}) =>
  useQuery({
    queryKey: [CLE_FIABILITE, params],
    queryFn: () => indicateursApi.fiabiliteVendeurs(params),
    staleTime: 60_000,
  });

/**
 * Un retour touche au stock du produit et aux indicateurs qui en dérivent :
 * on invalide donc aussi les produits et le tableau de bord, sinon la liste
 * continue d'afficher l'ancien stock après une remise en stock.
 */
const invaliderApresRetour = (qc: ReturnType<typeof useQueryClient>) => {
  [CLE_RETOURS, CLE_KPI_RETOURS, CLE_FIABILITE, CLE_DASHBOARD, 'shop-produits', 'produits'].forEach(
    (cle) => qc.invalidateQueries({ queryKey: [cle] })
  );
};

export const useCreerRetour = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (corps: CreationRetour) => indicateursApi.creerRetour(corps),
    onSuccess: () => invaliderApresRetour(qc),
  });
};

export const useTraiterRetour = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, corps }: { id: string; corps: TraitementRetour }) =>
      indicateursApi.traiterRetour(id, corps),
    onSuccess: () => invaliderApresRetour(qc),
  });
};

export const useAnnulerCommande = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, corps }: { id: string; corps: AnnulationCommande }) =>
      indicateursApi.annulerCommande(id, corps),
    // L'annulation recrédite le stock et compte dans la fiabilité vendeur.
    onSuccess: () =>
      [CLE_COMMANDES, 'commandes', CLE_FIABILITE, CLE_DASHBOARD, 'shop-produits'].forEach((cle) =>
        qc.invalidateQueries({ queryKey: [cle] })
      ),
  });
};

export const useModifierCommande = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, corps }: { id: string; corps: ModificationCommande }) =>
      indicateursApi.modifierCommande(id, corps),
    onSuccess: () =>
      [CLE_COMMANDES, 'commandes', CLE_FIABILITE, CLE_DASHBOARD, 'shop-produits'].forEach((cle) =>
        qc.invalidateQueries({ queryKey: [cle] })
      ),
  });
};
