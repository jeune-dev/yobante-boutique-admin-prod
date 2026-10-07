import shopClient from '@/infrastructure/http/shop.client';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';
import type {
  Alerte,
  AlerteIndisponible,
  BornesPeriode,
  CaRayon,
  IndicateursClients,
  KpiAccueil,
  LivraisonInstantT,
  LivraisonPeriode,
  OrigineProduit,
  ProduitStock,
  SyntheseAlertes,
  SyntheseStock,
  TopProduit,
  VendeurAnalytique,
} from '@/domains/shop/types/analytique';

/**
 * Indicateurs analytiques — `/api/admin/analytique/*`.
 *
 * Toutes les lectures acceptent `debut` et `fin` (AAAA-MM-JJ). Sans bornes,
 * le backend renvoie les totaux historiques ; la borne de fin est inclusive.
 *
 * `shopClient` déballe déjà l'enveloppe `{ success, message, data }` : chaque
 * méthode résout directement sur le contenu de `data`.
 */
export const analytiqueApi = {
  accueil: (filtres: FiltrePeriode = {}): Promise<{ kpi: KpiAccueil; periode: BornesPeriode }> =>
    shopClient.get('/admin/analytique/accueil', { params: filtres }),

  alertes: (
    params: { seuilAnnulation?: number; limiteExemples?: number } = {}
  ): Promise<{
    alertes: Alerte[];
    synthese: SyntheseAlertes;
    indisponibles: AlerteIndisponible[];
  }> => shopClient.get('/admin/analytique/alertes', { params }),

  caParRayon: (
    filtres: FiltrePeriode = {}
  ): Promise<{ total: number; rayons: CaRayon[] }> =>
    shopClient.get('/admin/analytique/ca-par-rayon', { params: filtres }),

  topProduits: (
    params: FiltrePeriode & { limit?: number; rayonId?: string; origine?: OrigineProduit } = {}
  ): Promise<{ produits: TopProduit[] }> =>
    shopClient.get('/admin/analytique/top-produits', { params }),

  clients: (
    filtres: FiltrePeriode = {}
  ): Promise<{ clients: IndicateursClients; periode: BornesPeriode }> =>
    shopClient.get('/admin/analytique/clients', { params: filtres }),

  /** Les stocks sont un état à l'instant T : aucune borne de période ici. */
  stock: (
    params: { fenetreJours?: number } = {}
  ): Promise<{ synthese: SyntheseStock; produits: ProduitStock[]; fenetreJours: number }> =>
    shopClient.get('/admin/analytique/stock', { params }),

  livraison: (
    filtres: FiltrePeriode = {}
  ): Promise<{
    instantT: LivraisonInstantT;
    surLaPeriode: LivraisonPeriode;
    periode: BornesPeriode;
  }> => shopClient.get('/admin/analytique/livraison', { params: filtres }),

  vendeurs: (
    filtres: FiltrePeriode = {}
  ): Promise<{ vendeurs: VendeurAnalytique[]; periode: BornesPeriode }> =>
    shopClient.get('/admin/analytique/vendeurs', { params: filtres }),
};
