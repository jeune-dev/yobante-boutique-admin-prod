// ── Finance marketplace — miroir de services/admin/finance.service.js ───────
// Principe du backend repris tel quel ici : aucun solde n'est stocké. Les
// montants dus se recalculent à chaque lecture, l'interface ne doit donc
// jamais les mettre en cache au-delà de la requête.

export type StatutReversement = 'en_attente' | 'paye' | 'annule';

export interface SyntheseFinance {
  caTotal: number;
  caMarketplace: number;
  caPropre: number;
  partMarketplace: number;
  commission: number;
  tauxCommissionMoyen: number;
  /** Ce qui revient aux vendeurs : CA marketplace − commission. */
  montantVendeurs: number;
  /** Marge de la plateforme sur ses propres produits. */
  margePropre: number;
  fraisLivraison: number;
  remboursements: number;
  nombreRemboursements: number;
  revenuPlateforme: number;
  formuleRevenu: string;
  reversementsPayes: number;
  reversementsEnAttente: number;
  nombreReversementsEnAttente: number;
  tauxCommissionDefaut: number;
}

export interface CompteVendeur {
  vendeurId: string;
  nom: string;
  prenom: string;
  email: string;
  nomBoutique: string | null;
  tauxCommission: number;
  /** `true` quand aucun taux négocié n'est enregistré sur le profil. */
  tauxParDefaut: boolean;
  chiffreAffaires: number;
  commandes: number;
  commission: number;
  montantVendeur: number;
  dejaReverse: number;
  reversementsEnAttente: number;
  /** Peut être négatif : un versement a couvert une autre période. */
  resteDu: number;
}

export interface Reversement {
  id: string;
  vendeurId: string;
  reference: string;
  montant: string | number;
  statut: StatutReversement;
  methode: string | null;
  periodeDebut: string | null;
  periodeFin: string | null;
  note: string | null;
  payeLe: string | null;
  creePar: string | null;
  createdAt: string;
  vendeur?: { id: string; nom: string; prenom: string; email: string } | null;
  auteur?: { id: string; nom: string; prenom: string } | null;
}

export interface CreationReversement {
  vendeurId: string;
  montant: number;
  methode?: string;
  periodeDebut?: string;
  periodeFin?: string;
  note?: string;
}

// ── Libellés d'affichage ─────────────────────────────────────────────────────

export const LIBELLE_STATUT_REVERSEMENT: Record<StatutReversement, string> = {
  en_attente: 'En attente',
  paye: 'Payé',
  annule: 'Annulé',
};

export const CLASSE_STATUT_REVERSEMENT: Record<StatutReversement, string> = {
  en_attente: 'bg-orange-100 text-orange-700',
  paye: 'bg-green-100 text-green-700',
  annule: 'bg-gray-100 text-gray-600',
};

/** Moyens de versement courants au Sénégal, proposés à la saisie. */
export const METHODES_REVERSEMENT = [
  'Virement bancaire',
  'Wave',
  'Orange Money',
  'Free Money',
  'Espèces',
] as const;
