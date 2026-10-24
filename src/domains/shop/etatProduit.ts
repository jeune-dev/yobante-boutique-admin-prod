/**
 * État d'un produit, affiché en badge dans l'application.
 *
 * Mêmes codes que le backend (`produits.etat`) et l'application mobile.
 * `null` : état non précisé, aucun badge.
 */
export const ETATS_PRODUIT = ['neuf', 'reconditionne', 'en_etat'] as const;

export type EtatProduit = (typeof ETATS_PRODUIT)[number];

export const LIBELLE_ETAT_PRODUIT: Record<EtatProduit, string> = {
  neuf: 'Neuf',
  reconditionne: 'Reconditionné',
  en_etat: "En l'état",
};

/** Teinte du badge, alignée sur l'application mobile (vert, bleu, ambre). */
export const CLASSE_ETAT_PRODUIT: Record<EtatProduit, string> = {
  neuf: 'bg-green-100 text-green-700',
  reconditionne: 'bg-blue-100 text-blue-700',
  en_etat: 'bg-amber-100 text-amber-800',
};

export const estEtatProduit = (v: unknown): v is EtatProduit =>
  typeof v === 'string' && (ETATS_PRODUIT as readonly string[]).includes(v);

export const libelleEtat = (v: unknown) => (estEtatProduit(v) ? LIBELLE_ETAT_PRODUIT[v] : '');
