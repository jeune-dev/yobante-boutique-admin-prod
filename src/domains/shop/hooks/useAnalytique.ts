import { useQuery } from '@tanstack/react-query';
import { analytiqueApi } from '@/domains/shop/api/analytique.api';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';
import type { OrigineProduit } from '@/domains/shop/types/analytique';

/**
 * Lectures analytiques. Deux durées de fraîcheur seulement :
 *  - 30 s pour ce qui bouge à chaque commande (CA, alertes, livraison) ;
 *  - 5 min pour la fidélité et les stocks, qui se calculent sur des
 *    fenêtres de plusieurs semaines et ne changent pas d'une minute à l'autre.
 */
const COURT = 30_000;
const LONG = 5 * 60_000;

export const CLE_ANALYTIQUE = 'shop-analytique';

export const useKpiAccueil = (filtres: FiltrePeriode = {}) =>
  useQuery({
    queryKey: [CLE_ANALYTIQUE, 'accueil', filtres],
    queryFn: () => analytiqueApi.accueil(filtres),
    staleTime: COURT,
  });

export const useAlertes = (params: { seuilAnnulation?: number; limiteExemples?: number } = {}) =>
  useQuery({
    queryKey: [CLE_ANALYTIQUE, 'alertes', params],
    queryFn: () => analytiqueApi.alertes(params),
    staleTime: COURT,
    // La page « À surveiller » reste souvent ouverte en fond : elle doit se
    // rafraîchir seule plutôt qu'afficher des alertes périmées.
    refetchInterval: 2 * 60_000,
  });

export const useCaParRayon = (filtres: FiltrePeriode = {}) =>
  useQuery({
    queryKey: [CLE_ANALYTIQUE, 'ca-par-rayon', filtres],
    queryFn: () => analytiqueApi.caParRayon(filtres),
    staleTime: COURT,
  });

export const useTopProduits = (
  params: FiltrePeriode & { limit?: number; rayonId?: string; origine?: OrigineProduit } = {}
) =>
  useQuery({
    queryKey: [CLE_ANALYTIQUE, 'top-produits', params],
    queryFn: () => analytiqueApi.topProduits(params),
    staleTime: COURT,
  });

export const useIndicateursClients = (filtres: FiltrePeriode = {}) =>
  useQuery({
    queryKey: [CLE_ANALYTIQUE, 'clients', filtres],
    queryFn: () => analytiqueApi.clients(filtres),
    staleTime: LONG,
  });

export const useIndicateursStock = (params: { fenetreJours?: number } = {}) =>
  useQuery({
    queryKey: [CLE_ANALYTIQUE, 'stock', params],
    queryFn: () => analytiqueApi.stock(params),
    staleTime: LONG,
  });

export const useIndicateursLivraison = (filtres: FiltrePeriode = {}) =>
  useQuery({
    queryKey: [CLE_ANALYTIQUE, 'livraison', filtres],
    queryFn: () => analytiqueApi.livraison(filtres),
    staleTime: COURT,
  });

export const useTableauVendeurs = (filtres: FiltrePeriode = {}) =>
  useQuery({
    queryKey: [CLE_ANALYTIQUE, 'vendeurs', filtres],
    queryFn: () => analytiqueApi.vendeurs(filtres),
    staleTime: COURT,
  });
