// ── Indicateurs et retours — synchronisés avec yobante-boutique-back ─────────
// Les valeurs des unions reprennent exactement les ENUM PostgreSQL : toute
// divergence passerait le typage et casserait à l'exécution.

/** Les quatre paliers d'alerte de stock de la boutique. */
export type NiveauStock = 'normal' | 'faible' | 'rupture_imminente' | 'rupture';

export type Responsabilite = 'vendeur' | 'client' | 'transport' | 'autre';

export type MotifRetour =
  | 'produit_abime'
  | 'non_conforme'
  | 'erreur_article'
  | 'stock_inexistant'
  | 'retard_livraison'
  | 'changement_avis'
  | 'autre';

export type StatutRetour = 'demande' | 'accepte' | 'refuse' | 'rembourse';

export type TypePeriode = 'jour' | 'semaine' | 'mois' | 'annee' | 'tout' | 'personnalise';

export interface FiltrePeriode {
  periode?: TypePeriode;
  /** `AAAA-MM-JJ`, uniquement avec `periode: 'personnalise'`. */
  debut?: string;
  fin?: string;
}

/** Indicateurs commerciaux calculés par le backend pour un produit. */
export interface IndicateursProduit {
  quantiteVendue: number;
  stockRestant: number;
  stockDisponible: number;
  chiffreAffaires: number;
  /** `null` quand le prix d'achat n'est pas renseigné — pas 0. */
  margeBrute: number | null;
  margeUnitaire: number | null;
  tauxMarge: number | null;
  /** `null` quand aucune vente : le stock ne s'épuise pas au rythme actuel. */
  joursCouverture: number | null;
  fenetreCouvertureJours: number;
  niveauStock: NiveauStock;
  nombreRetours: number;
  quantiteRetournee: number;
  tauxRetour: number;
}

export interface KpiVentes {
  nombreVentes: number;
  nombreCommandes: number;
  chiffreAffaires: number;
  panierMoyen: number;
  basePanierMoyen: string;
  clientsInscrits: number;
  clientsConvertis: number;
  tauxConversion: number;
  formuleTauxConversion: string;
  commandesLivrees: number;
  commandesALivrer: number;
  commandesAnnulees: number;
}

export interface KpiStocks {
  totalProduits: number;
  produitsEnRupture: number;
  produitsEnAttente: number;
  normal: number;
  faible: number;
  rupture_imminente: number;
  rupture: number;
  seuils: { RUPTURE_IMMINENTE: number; FAIBLE: number };
  tauxRupture: number | string;
}

/** Activité commerciale d'un client, rattachée à sa fiche. */
export interface ActiviteClient {
  nbCommandes: number;
  nbCommandesLivrees: number;
  nbCommandesAnnulees: number;
  montantDepense: number;
  derniereCommande: string | null;
}

export interface Retour {
  id: string;
  commandeId: string;
  commandeItemId: string | null;
  produitId: string | null;
  userId: string | null;
  quantite: number;
  motif: MotifRetour;
  motifDetail: string | null;
  statut: StatutRetour;
  responsabilite: Responsabilite | null;
  vendeurResponsableId: string | null;
  montantRembourse: string | number | null;
  remisEnStock: boolean;
  createdAt: string;
  commande?: { id: string; reference: string; createdAt: string } | null;
  produit?: { id: string; nom: string; slug: string; images?: string[] } | null;
  client?: { id: string; nom: string; prenom: string; email: string } | null;
  vendeurResponsable?: { id: string; nom: string; prenom: string } | null;
  commandeItem?: { id: string; quantite: number; prixUnitaire: string } | null;
}

export interface KpiRetours {
  nombreRetours: number;
  quantiteRetournee: number;
  quantiteLivree: number;
  montantRembourse: number;
  tauxRetour: number;
  formuleTauxRetour: string;
}

export interface RetourParMotif {
  motif: MotifRetour;
  nombre: number;
  quantite: number;
}

export interface FiabiliteVendeur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  nomBoutique: string | null;
  commandesTotal: number;
  annulationsImputables: number;
  retoursImputables: number;
  incidents: number;
  tauxIncident: number;
  scoreFiabilite: number;
}

/** Une entrée du journal des retouches d'une commande. */
export interface EntreeHistorique {
  date: string;
  parQui: 'client' | 'admin' | 'vendeur';
  adminId: string | null;
  motif: string;
  responsabilite: Responsabilite | null;
  changements: Array<{
    champ: string;
    produitId?: string;
    produit?: string;
    avant: unknown;
    apres: unknown;
  }>;
}

// ── Libellés d'affichage ─────────────────────────────────────────────────────

export const LIBELLE_NIVEAU_STOCK: Record<NiveauStock, string> = {
  normal: 'Stock normal',
  faible: 'Stock faible',
  rupture_imminente: 'Rupture imminente',
  rupture: 'Rupture de stock',
};

/** Pastilles demandées par la boutique : 🟢 🟠 🔴 ⚫ */
export const PUCE_NIVEAU_STOCK: Record<NiveauStock, string> = {
  normal: '🟢',
  faible: '🟠',
  rupture_imminente: '🔴',
  rupture: '⚫',
};

export const CLASSE_NIVEAU_STOCK: Record<NiveauStock, string> = {
  normal: 'bg-green-50 text-green-700 border-green-200',
  faible: 'bg-orange-50 text-orange-700 border-orange-200',
  rupture_imminente: 'bg-red-50 text-red-700 border-red-200',
  rupture: 'bg-gray-800 text-white border-gray-800',
};

export const LIBELLE_MOTIF_RETOUR: Record<MotifRetour, string> = {
  produit_abime: 'Produit abîmé',
  non_conforme: 'Non conforme',
  erreur_article: "Erreur d'article",
  stock_inexistant: 'Stock inexistant',
  retard_livraison: 'Retard de livraison',
  changement_avis: "Changement d'avis",
  autre: 'Autre',
};

export const LIBELLE_STATUT_RETOUR: Record<StatutRetour, string> = {
  demande: 'Demandé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  rembourse: 'Remboursé',
};

export const CLASSE_STATUT_RETOUR: Record<StatutRetour, string> = {
  demande: 'bg-orange-100 text-orange-700',
  accepte: 'bg-blue-100 text-blue-700',
  refuse: 'bg-gray-100 text-gray-600',
  rembourse: 'bg-green-100 text-green-700',
};

export const LIBELLE_RESPONSABILITE: Record<Responsabilite, string> = {
  vendeur: 'Vendeur',
  client: 'Client',
  transport: 'Transport',
  autre: 'Autre',
};

export const LIBELLE_PERIODE: Record<Exclude<TypePeriode, 'personnalise'>, string> = {
  jour: "Aujourd'hui",
  semaine: '7 jours',
  mois: 'Ce mois',
  annee: 'Cette année',
  tout: 'Tout',
};
