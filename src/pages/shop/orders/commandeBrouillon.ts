// ─────────────────────────────────────────────────────────────
// Brouillon de commande (création depuis le dashboard admin)
//
// Logique pure, sans React : panier, validation et totaux affichés.
// Ces calculs servent uniquement à l'affichage — le backend relit les
// prix et le stock en base et reste seul juge du montant enregistré.
// ─────────────────────────────────────────────────────────────

export interface ProduitCatalogue {
  id: string;
  nom: string;
  prix: number | string;
  stock?: number | null;
  images?: string[] | null;
  venduAuPoids?: boolean;
  reference?: string | null;
}

export interface LignePanier {
  produitId: string;
  nom: string;
  prix: number;
  /** Stock connu au moment de l'ajout (indicatif, revérifié par le backend). */
  stock: number | null;
  image?: string;
  venduAuPoids?: boolean;
  /** Saisie brute : une quantité en cours de frappe peut être invalide. */
  quantite: string;
}

export const MESSAGES = {
  client: 'Veuillez sélectionner un client.',
  adresse: 'Veuillez sélectionner une adresse de livraison.',
  panierVide: 'Veuillez ajouter au moins un produit à la commande.',
  quantite: 'La quantité doit être un nombre entier supérieur ou égal à 1.',
} as const;

/** Quantité valide : entier strictement positif, écrit en chiffres uniquement. */
export const lireQuantite = (saisie: string): number | null => {
  const texte = String(saisie).trim();
  if (!/^\d+$/.test(texte)) return null;
  const n = Number(texte);
  return Number.isSafeInteger(n) && n >= 1 ? n : null;
};

/** Message d'erreur d'une ligne, ou null si elle est valide. */
export const erreurLigne = (ligne: LignePanier): string | null => {
  const q = lireQuantite(ligne.quantite);
  if (q === null) return MESSAGES.quantite;
  if (ligne.stock !== null && q > ligne.stock) {
    return ligne.stock <= 0
      ? 'Produit en rupture de stock.'
      : `Stock insuffisant : ${ligne.stock} disponible${ligne.stock > 1 ? 's' : ''}.`;
  }
  return null;
};

/**
 * Ajoute un produit au panier. Un produit déjà présent n'est jamais dupliqué :
 * sa quantité augmente d'une unité.
 */
export const ajouterAuPanier = (panier: LignePanier[], produit: ProduitCatalogue): LignePanier[] => {
  const existant = panier.find((l) => l.produitId === produit.id);
  if (existant) {
    return panier.map((l) =>
      l.produitId === produit.id ? { ...l, quantite: String((lireQuantite(l.quantite) ?? 0) + 1) } : l
    );
  }
  const stock = produit.stock === undefined || produit.stock === null ? null : Number(produit.stock);
  return [
    ...panier,
    {
      produitId: produit.id,
      nom: produit.nom,
      prix: Number(produit.prix) || 0,
      stock,
      image: produit.images?.[0],
      venduAuPoids: produit.venduAuPoids,
      quantite: '1',
    },
  ];
};

export const modifierQuantite = (panier: LignePanier[], produitId: string, quantite: string) =>
  panier.map((l) => (l.produitId === produitId ? { ...l, quantite } : l));

export const retirerDuPanier = (panier: LignePanier[], produitId: string) =>
  panier.filter((l) => l.produitId !== produitId);

/** Calcul en centimes, comme le backend (utils/money.js). */
const centimes = (l: LignePanier) => Math.round(l.prix * 100) * (lireQuantite(l.quantite) ?? 0);

export const sousTotalLigne = (ligne: LignePanier): number => centimes(ligne) / 100;

export const totalArticles = (panier: LignePanier[]): number =>
  panier.reduce((s, l) => s + centimes(l), 0) / 100;

export interface Brouillon {
  clientId: string;
  adresseId: string;
  panier: LignePanier[];
}

export interface ErreursBrouillon {
  client?: string;
  adresse?: string;
  panier?: string;
  lignes: Record<string, string>;
}

export const validerBrouillon = ({ clientId, adresseId, panier }: Brouillon): ErreursBrouillon => {
  const erreurs: ErreursBrouillon = { lignes: {} };
  if (!clientId) erreurs.client = MESSAGES.client;
  else if (!adresseId) erreurs.adresse = MESSAGES.adresse;
  if (panier.length === 0) erreurs.panier = MESSAGES.panierVide;
  for (const ligne of panier) {
    const e = erreurLigne(ligne);
    if (e) erreurs.lignes[ligne.produitId] = e;
  }
  return erreurs;
};

/** Premier message à afficher, dans l'ordre du formulaire. */
export const premiereErreur = (e: ErreursBrouillon): string | null =>
  e.client ?? e.adresse ?? e.panier ?? Object.values(e.lignes)[0] ?? null;

/** Corps envoyé à POST /admin/commandes — jamais de prix ni de total. */
export const construirePayload = (
  b: Brouillon & { methode: string; note: string; dateLivraisonSouhaitee: string }
) => ({
  userId: b.clientId,
  adresseId: b.adresseId,
  methode: b.methode,
  note: b.note.trim() || null,
  dateLivraisonSouhaitee: b.dateLivraisonSouhaitee || null,
  items: b.panier.map((l) => ({ produitId: l.produitId, quantite: lireQuantite(l.quantite) as number })),
});

export const formaterFcfa = (montant: number | string | null | undefined) =>
  `${Number(montant || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} FCFA`;
