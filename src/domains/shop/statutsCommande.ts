/**
 * Statuts de commande vus par l'administration.
 *
 * « En modification » est interne : il organise le travail avant la
 * validation. Le client et le vendeur voient alors « En attente ».
 */
export const LIBELLE_STATUT_COMMANDE: Record<string, string> = {
  en_attente: 'En attente',
  en_modification: 'En modification',
  validee: 'Validée',
  en_preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée',
  rejetee: 'Rejetée',
};

/** Ordre du cycle de vie (filtres, sélecteurs). */
export const ORDRE_STATUTS_COMMANDE = [
  'en_attente',
  'en_modification',
  'validee',
  'en_preparation',
  'expediee',
  'livree',
  'rejetee',
  'annulee',
];

/** Statuts que le client ne voit pas (pas de notification envoyée). */
export const STATUTS_INTERNES = ['en_modification'];

export const libelleStatut = (statut?: string) =>
  (statut && LIBELLE_STATUT_COMMANDE[statut]) || statut || '—';

/**
 * Étapes proposées à l'administration depuis chaque statut (même règle que
 * le serveur, utils `TRANSITIONS_ADMIN`). Le rejet et l'annulation ont leurs
 * propres actions, avec un motif obligatoire.
 */
export const TRANSITIONS_STATUT: Record<string, string[]> = {
  en_attente: ['en_modification', 'validee'],
  en_modification: ['en_attente', 'validee'],
  validee: ['en_preparation'],
  en_preparation: ['expediee'],
  expediee: ['livree'],
};

export const statutsPossibles = (statut?: string): string[] =>
  (statut && TRANSITIONS_STATUT[statut]) || [];

/** Le client n'est pas prévenu de ce changement (statut interne). */
export const changementInterne = (de: string | undefined, vers: string) =>
  STATUTS_INTERNES.includes(vers) || (vers === 'en_attente' && de === 'en_modification');
