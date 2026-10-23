// ─────────────────────────────────────────────────────────────
// stock.labels.ts — Libellés et formats partagés du journal de stock
//
// Les codes viennent du backend (`src/constants/index.js` côté API) ; seul
// l'affichage vit ici. Un code inconnu est rendu tel quel plutôt que masqué :
// mieux vaut une valeur brute qu'une ligne d'historique vide.
// ─────────────────────────────────────────────────────────────

/** Fuseau de l'application : Dakar. Sans lui, l'heure affichée suivrait
 *  celle du poste et deux administrateurs ne liraient pas la même chose. */
const FUSEAU = 'Africa/Dakar';

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
} as const;

const ROLES = {
  ADMIN: 'Administrateur',
  VENDEUR: 'Vendeur',
  CLIENT: 'Client',
} as const;

/** Couleur du badge de type : vert pour ce qui entre, rouge pour ce qui sort. */
export const COULEUR_TYPE: Record<string, string> = {
  entree: 'bg-green-100 text-green-700',
  retour: 'bg-green-100 text-green-700',
  ajustement_positif: 'bg-green-100 text-green-700',
  sortie: 'bg-red-100 text-red-700',
  ajustement_negatif: 'bg-red-100 text-red-700',
  ajustement_neutre: 'bg-gray-100 text-gray-600',
};

export const STATUT_COMMANDE_COULEUR: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-700',
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
export const libelleMotif = (code?: string | null) => libelle(MOTIFS_AJUSTEMENT, code);
export const libelleSource = (code?: string | null) => libelle(SOURCES_MOUVEMENT, code);
export const libelleRole = (code?: string | null) => libelle(ROLES, code, '');

/** Nom affichable d'un utilisateur, avec repli sur l'e-mail. */
export const nomUtilisateur = (
  personne?: { nom?: string | null; prenom?: string | null; email?: string | null } | null,
  defaut = '—'
) => {
  if (!personne) return defaut;
  const complet = [personne.prenom, personne.nom].filter(Boolean).join(' ').trim();
  return complet || personne.email || defaut;
};

/** Date et heure dans le fuseau de l'application. */
export const formaterDateHeure = (valeur?: string | null) => {
  if (!valeur) return '—';
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', {
    timeZone: FUSEAU,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formaterDate = (valeur?: string | null) => {
  if (!valeur) return '—';
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { timeZone: FUSEAU });
};

/** Montant en francs CFA, séparateurs français. */
export const formaterMontant = (valeur: unknown) =>
  `${(Number(valeur) || 0).toLocaleString('fr-FR')} FCFA`;

/** Écart signé : « +6 », « −6 », « 0 ». */
export const formaterEcart = (valeur: number) => (valeur > 0 ? `+${valeur}` : String(valeur));
