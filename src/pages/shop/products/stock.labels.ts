// ─────────────────────────────────────────────────────────────
// stock.labels.ts — Libellés du journal des mouvements de stock
//
// Les codes viennent du backend (`src/constants/index.js` côté API) ; seul
// l'affichage vit ici. Un code inconnu est rendu tel quel plutôt que masqué :
// mieux vaut une valeur brute qu'une ligne d'historique vide.
//
// Le formatage des dates, montants et nombres n'est PAS redéfini ici :
// `@/shared/utils/format` en est l'unique source.
// ─────────────────────────────────────────────────────────────

export const TYPES_MOUVEMENT = {
  entree: 'Entrée',
  sortie: 'Sortie',
  ajustement_positif: 'Ajustement positif',
  ajustement_negatif: 'Ajustement négatif',
  ajustement_neutre: 'Ajustement sans écart',
  retour: 'Retour',
} as const;

export const MOTIFS_AJUSTEMENT = {
  reapprovisionnement_fournisseur: 'Réapprovisionnement fournisseur',
  produit_endommage: 'Produit endommagé',
  perte_ou_casse: 'Perte ou casse',
  correction_inventaire: 'Correction après inventaire',
  erreur_comptage: 'Erreur de comptage',
  retour_client: 'Retour client',
  autre: 'Autre motif',
} as const;

export type CodeMotif = keyof typeof MOTIFS_AJUSTEMENT;

/** Le motif « autre » impose une précision libre — côté serveur aussi. */
export const MOTIF_AUTRE: CodeMotif = 'autre';

export const SOURCES_MOUVEMENT = {
  ajustement_admin: 'Ajustement manuel',
  commande_creation: 'Commande passée',
  commande_annulation: 'Commande annulée',
  commande_rejet: 'Commande rejetée',
  commande_modification: 'Commande modifiée',
  commande_rupture: 'Rupture déclarée',
  retour_remise_en_stock: 'Retour remis en stock',
  retour_correction: 'Remise en stock annulée',
} as const;

/** Origine des seuls ajustements saisis à la main par l'administration. */
export const SOURCE_AJUSTEMENT_MANUEL = 'ajustement_admin';

const ROLES = {
  ADMIN: 'Administrateur',
  VENDEUR: 'Vendeur',
  CLIENT: 'Client',
} as const;

/** Motifs de retour, repris de `MOTIF_RETOUR` côté API. */
const MOTIFS_RETOUR = {
  produit_abime: 'Produit abîmé',
  non_conforme: 'Non conforme',
  erreur_article: 'Erreur d’article',
  stock_inexistant: 'Stock inexistant',
  retard_livraison: 'Retard de livraison',
  changement_avis: 'Changement d’avis',
  autre: 'Autre motif',
} as const;

/** Couleur du badge de type : vert pour ce qui entre, rouge pour ce qui sort. */
export const COULEUR_TYPE: Record<string, string> = {
  entree: 'bg-green-50 text-green-700 border-green-200',
  retour: 'bg-green-50 text-green-700 border-green-200',
  ajustement_positif: 'bg-green-50 text-green-700 border-green-200',
  sortie: 'bg-red-50 text-red-700 border-red-200',
  ajustement_negatif: 'bg-red-50 text-red-700 border-red-200',
  ajustement_neutre: 'bg-gray-50 text-gray-600 border-gray-200',
};

export const STATUT_COMMANDE_COULEUR: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  en_modification: 'bg-yellow-100 text-yellow-700',
  validee: 'bg-blue-100 text-blue-700',
  en_preparation: 'bg-purple-100 text-purple-700',
  expediee: 'bg-indigo-100 text-indigo-700',
  livree: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
  rejetee: 'bg-red-100 text-red-700',
};

const libelle = (table: Record<string, string>, code?: string | null, defaut = '—') =>
  code ? (table[code] ?? code) : defaut;

export const libelleType = (code?: string | null) => libelle(TYPES_MOUVEMENT, code);
export const libelleSource = (code?: string | null) => libelle(SOURCES_MOUVEMENT, code);
export const libelleRole = (code?: string | null) => libelle(ROLES, code, '');

/**
 * Motif d'un mouvement. Un ajustement manuel porte un motif de la liste
 * d'ajustement ; un mouvement de retour porte le motif du retour, qui vient
 * d'une autre énumération.
 */
export const libelleMotif = (code?: string | null, source?: string | null) => {
  if (!code) return '—';
  if (source === 'retour_remise_en_stock' || source === 'retour_correction') {
    return libelle(MOTIFS_RETOUR, code);
  }
  return libelle(MOTIFS_AJUSTEMENT, code);
};

/** Nom affichable d'un utilisateur, avec repli sur l'e-mail. */
export const nomUtilisateur = (
  personne?: { nom?: string | null; prenom?: string | null; email?: string | null } | null,
  defaut = '—'
) => {
  if (!personne) return defaut;
  const complet = [personne.prenom, personne.nom].filter(Boolean).join(' ').trim();
  return complet || personne.email || defaut;
};

/** Écart signé : « +6 », « -6 », « 0 ». */
export const ecart = (valeur: number) => (valeur > 0 ? `+${valeur}` : String(valeur));

/** Couleur d'un écart : vert à la hausse, rouge à la baisse. */
export const couleurEcart = (valeur: number) =>
  valeur > 0 ? 'text-green-700' : valeur < 0 ? 'text-red-700' : 'text-gray-500';
