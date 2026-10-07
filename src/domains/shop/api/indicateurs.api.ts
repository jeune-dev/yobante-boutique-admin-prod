import shopClient from '@/infrastructure/http/shop.client';
import type {
  FiltrePeriode,
  KpiVentes,
  KpiRetours,
  RetourParMotif,
  Retour,
  FiabiliteVendeur,
  MotifRetour,
  Responsabilite,
  StatutRetour,
} from '@/domains/shop/types/indicateurs';
import type { Pagination } from '@/domains/shop/types';

export interface FiltresRetours extends FiltrePeriode {
  statut?: StatutRetour;
  motif?: MotifRetour;
  produitId?: string;
  commandeId?: string;
  vendeurId?: string;
  page?: number;
  limit?: number;
}

export interface CreationRetour {
  commandeId: string;
  commandeItemId: string;
  quantite: number;
  motif: MotifRetour;
  motifDetail?: string;
  responsabilite?: Responsabilite;
  remisEnStock?: boolean;
}

export interface TraitementRetour {
  statut?: StatutRetour;
  montantRembourse?: number | null;
  remisEnStock?: boolean;
  responsabilite?: Responsabilite | null;
}

export interface AnnulationCommande {
  motif: string;
  responsabilite?: Responsabilite;
  vendeurResponsableId?: string | null;
}

export interface ModificationCommande {
  motif: string;
  responsabilite?: Responsabilite;
  items?: Array<{ produitId: string; quantite: number }>;
  note?: string | null;
  dateLivraisonSouhaitee?: string | null;
}

/**
 * Indicateurs du tableau de bord, retours produits et fiabilité vendeurs.
 *
 * `shopClient` déballe déjà l'enveloppe `{ success, message, data }` : les
 * méthodes renvoient donc directement le contenu de `data`.
 */
export const indicateursApi = {
  // ── Tableau de bord ──────────────────────────────────────────────────────
  kpiVentes: (filtres: FiltrePeriode = {}): Promise<{ kpi: KpiVentes; periode: unknown }> =>
    shopClient.get('/admin/dashboard/kpi-ventes', { params: filtres }),

  kpiComplet: (filtres: FiltrePeriode = {}): Promise<any> =>
    shopClient.get('/admin/dashboard/kpi-complet', { params: filtres }),

  inscriptions: (params: { pas?: 'jour' | 'mois'; debut?: string; fin?: string } = {}): Promise<{
    pas: string;
    inscriptions: Array<{ intervalle: string; inscrits: number }>;
  }> => shopClient.get('/admin/dashboard/inscriptions', { params }),

  // ── Retours produits ─────────────────────────────────────────────────────
  kpiRetours: (
    filtres: FiltrePeriode = {}
  ): Promise<{ kpi: KpiRetours; parMotif: RetourParMotif[] }> =>
    shopClient.get('/admin/retours/kpi', { params: filtres }),

  listerRetours: (
    filtres: FiltresRetours = {}
  ): Promise<{ retours: Retour[]; pagination: Pagination }> =>
    shopClient.get('/admin/retours', { params: filtres }),

  creerRetour: (corps: CreationRetour): Promise<{ retour: Retour }> =>
    shopClient.post('/admin/retours', corps),

  traiterRetour: (id: string, corps: TraitementRetour): Promise<{ retour: Retour }> =>
    shopClient.patch(`/admin/retours/${id}`, corps),

  // ── Commandes : modification / annulation ────────────────────────────────
  annulerCommande: (id: string, corps: AnnulationCommande): Promise<{ commande: any }> =>
    shopClient.patch(`/admin/commandes/${id}/annuler`, corps),

  modifierCommande: (id: string, corps: ModificationCommande): Promise<{ commande: any }> =>
    shopClient.patch(`/admin/commandes/${id}/modifier`, corps),

  // ── Fiabilité des vendeurs ───────────────────────────────────────────────
  fiabiliteVendeurs: (params: { limit?: number } = {}): Promise<{ vendeurs: FiabiliteVendeur[] }> =>
    shopClient.get('/admin/commandes/fiabilite-vendeurs', { params }),
};
