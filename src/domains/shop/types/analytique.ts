// ── Analytique — miroir de services/admin/analytique.service.js ─────────────
// Les noms de champs reprennent exactement ceux du backend : un renommage
// côté interface rendrait impossible de retrouver la formule qui les produit.

/** Bornes réellement appliquées par le backend, renvoyées avec chaque réponse. */
export interface BornesPeriode {
  debut: string | null;
  fin: string | null;
}

// ── Accueil ──────────────────────────────────────────────────────────────────

export interface KpiAccueil {
  chiffreAffaires: number;
  caMarketplace: number;
  caPropre: number;
  partMarketplace: number;
  nombreCommandes: number;
  commandesLivrees: number;
  panierMoyen: number;
  panierMoyenLivrees: number;
  articlesVendus: number;
  margeBrute: number;
  tauxMarge: number;
  /** `false` dès qu'une ligne vendue n'a pas de prix d'achat : la marge est minorée. */
  margeComplete: boolean;
  lignesSansPrixAchat: number;
  lignesTotal: number;
  clientsActifs: number;
  fraisLivraisonEncaisses: number;
  produitsActifs: number;
  produitsEnAlerte: number;
  produitsEnRupture: number;
  tauxRupture: number;
  valeurStockAchat: number;
  commandesALivrer: number;
  commandesEnPreparation: number;
  commandesEnRetard: number;
}

// ── Alertes ──────────────────────────────────────────────────────────────────

export type GraviteAlerte = 'critique' | 'attention';

export interface ExempleAlerte {
  id: string;
  libelle: string;
  detail: string;
}

export interface Alerte {
  cle: string;
  gravite: GraviteAlerte;
  libelle: string;
  nombre: number;
  /** Montant en jeu, sur les alertes qui en ont un (paiements vendeurs). */
  montant?: number;
  lien: string;
  exemples: ExempleAlerte[];
}

export interface SyntheseAlertes {
  critiques: number;
  attentions: number;
  total: number;
}

/** Ce que la base ne permet pas encore de surveiller, dit explicitement. */
export interface AlerteIndisponible {
  cle: string;
  libelle: string;
  raison: string;
}

// ── Rayons et produits ───────────────────────────────────────────────────────

export interface CaRayon {
  id: string | null;
  rayon: string;
  chiffreAffaires: number;
  articlesVendus: number;
  commandes: number;
  margeBrute: number;
  tauxMarge: number;
  part: number;
}

export type OrigineProduit = 'marketplace' | 'propre' | 'tout';

export interface TopProduit {
  id: string;
  nom: string;
  slug: string;
  images: string[] | null;
  rayon: string;
  stock: number;
  vendeurId: string | null;
  vendeur: string;
  marketplace: boolean;
  quantiteVendue: number;
  chiffreAffaires: number;
  margeBrute: number;
  tauxMarge: number;
}

// ── Clients ──────────────────────────────────────────────────────────────────

export interface IndicateursClients {
  inscrits: number;
  convertis: number;
  tauxConversion: number;
  formuleTauxConversion: string;
  /** `null` quand aucun client inscrit sur la période n'a encore commandé. */
  joursAvantPremierAchat: number | null;
  clientsTotal: number;
  acheteurs: number;
  tauxReachat: number;
  inactifs: number;
  tauxChurn: number;
  fenetreChurnJours: number;
  valeurVieClient: number;
  commandesParAcheteur: number;
}

// ── Stocks ───────────────────────────────────────────────────────────────────

export interface ProduitStock {
  id: string;
  nom: string;
  slug: string;
  rayon: string;
  stock: number;
  stockDisponible: number;
  /** `null` quand le prix d'achat n'est pas renseigné — pas 0. */
  prixAchat: number | null;
  valeurStock: number | null;
  ventesMoyennesJour: number;
  ventesMoyennes14j: number;
  quantiteFenetre: number;
  /** `null` quand rien ne se vend : le stock ne s'épuise pas. */
  joursCouverture: number | null;
  enRupture: boolean;
  sousSeuilVentes: boolean;
  rotationFaible: boolean;
  derniereMaj: string;
}

export interface SyntheseStock {
  produitsActifs: number;
  enRupture: number;
  tauxRupture: number;
  sousSeuilVentes: number;
  rotationFaible: number;
  valeurStockAchat: number;
  produitsSansPrixAchat: number;
}

// ── Livraison ────────────────────────────────────────────────────────────────

export interface LivraisonInstantT {
  aLivrer: number;
  enPreparation: number;
  expediees: number;
  enRetard: number;
  definitionRetard: string;
}

export interface LivraisonPeriode {
  livrees: number;
  revenus: number;
  fraisEncaisses: number;
  fraisMoyens: number;
  /** Rappel que le chiffre est un prix facturé, pas un coût de transport. */
  natureDesFrais: string;
}

// ── Vendeurs ─────────────────────────────────────────────────────────────────

export interface VendeurAnalytique {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  nomBoutique: string | null;
  chiffreAffaires: number;
  commandes: number;
  commandesLivrees: number;
  articlesVendus: number;
  produitsActifs: number;
  panierMoyen: number;
  tauxAnnulation: number;
  commandesAcceptees: number;
  commandesRefusees: number;
  tauxAcceptation: number;
  commandesSansReponse: number;
  articlesRetournes: number;
  tauxRetour: number;
  /** `null` quand le vendeur n'a encore reçu aucun avis. */
  noteClient: number | null;
  nombreAvis: number;
}

// ── Libellés d'affichage ─────────────────────────────────────────────────────

export const LIBELLE_ORIGINE: Record<OrigineProduit, string> = {
  tout: 'Toute la boutique',
  marketplace: 'Marketplace',
  propre: 'Vente propre',
};

export const CLASSE_GRAVITE: Record<GraviteAlerte, string> = {
  critique: 'bg-red-50 text-red-700 border-red-200',
  attention: 'bg-orange-50 text-orange-700 border-orange-200',
};

export const PUCE_GRAVITE: Record<GraviteAlerte, string> = {
  critique: '🔴',
  attention: '🟠',
};
