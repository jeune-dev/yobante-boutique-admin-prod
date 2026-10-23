import shopClient from '@/infrastructure/http/shop.client';
import type { Pagination, Produit } from '@/domains/shop/types';

/**
 * Comptes vendeurs — `/api/admin/vendeurs/*`.
 *
 * Partagé par la liste (`VendeursPage`) et la fiche d'un vendeur
 * (`VendeurDetailPage`) : les deux écrans déclaraient sinon leurs propres
 * appels, et une route corrigée d'un côté restait fausse de l'autre.
 *
 * `shopClient` déballe déjà l'enveloppe `{ success, message, data }` : les
 * méthodes résolvent directement sur le contenu de `data`.
 */

export interface FiltresVendeurs {
  search?: string;
  statut?: 'actif' | 'bloque';
  page?: number;
  limit?: number;
}

/** Informations de boutique, regroupées par le backend sous `boutique`. */
export interface BoutiqueVendeur {
  id?: string;
  nom?: string | null;
  description?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  infoLegale?: string | null;
  logo?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

/**
 * Vendeur tel que le présente l'administration. Le backend remonte les
 * informations de boutique à la fois à plat (`nomBoutique`, …) et regroupées
 * sous `boutique` : les deux formes sont déclarées, les aides de lecture plus
 * bas choisissent celle qui est renseignée.
 */
export interface Vendeur {
  id: string;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string | null;
  statut?: 'actif' | 'bloque';
  isBlocked?: boolean;
  isActive?: boolean;
  isVerified?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
  nomBoutique?: string | null;
  adresseBoutique?: string | null;
  descriptionBoutique?: string | null;
  telephoneBoutique?: string | null;
  logoBoutique?: string | null;
  boutique?: BoutiqueVendeur | null;
  /** `GET /admin/vendeurs/:id` joint les cinq produits les plus récents. */
  produits?: Produit[];
}

/** Un avis client, tel que renvoyé par `GET /admin/avis`. */
export interface AvisAdmin {
  id: string;
  note: number;
  commentaire?: string | null;
  isApproved: boolean;
  createdAt: string;
  reponseVendeur?: string | null;
  user?: { id: string; nom?: string; prenom?: string } | null;
  produit?: { id: string; nom?: string; slug?: string } | null;
}

/**
 * Réponse d'une action sans charge utile propre (blocage, renvoi d'accès).
 * Le message affiché à l'administrateur vient de l'enveloppe, lue par
 * `shared/utils/alert.ts` — d'où un contenu volontairement ouvert.
 */
export type ReponseAction = Record<string, unknown>;

export const vendeursApi = {
  lister: (filtres?: FiltresVendeurs): Promise<{ vendeurs: Vendeur[]; pagination: Pagination }> =>
    shopClient.get('/admin/vendeurs', { params: filtres }),

  creer: (corps: Record<string, unknown>): Promise<{ vendeur: Vendeur }> =>
    shopClient.post('/admin/vendeurs', corps),

  detail: (id: string): Promise<{ vendeur?: Vendeur } & Vendeur> =>
    shopClient.get(`/admin/vendeurs/${id}`),

  modifier: (id: string, corps: Record<string, unknown>): Promise<{ vendeur: Vendeur }> =>
    shopClient.put(`/admin/vendeurs/${id}`, corps),

  bloquer: (id: string): Promise<ReponseAction> =>
    shopClient.patch(`/admin/vendeurs/${id}/bloquer`),

  debloquer: (id: string): Promise<ReponseAction> =>
    shopClient.patch(`/admin/vendeurs/${id}/debloquer`),

  renvoyerIdentifiants: (id: string): Promise<ReponseAction> =>
    shopClient.post(`/admin/vendeurs/${id}/renvoyer-identifiants`),

  supprimer: (id: string): Promise<ReponseAction> => shopClient.delete(`/admin/vendeurs/${id}`),

  /** Catalogue d'un vendeur : la liste des produits accepte `vendeurId`. */
  produits: (
    vendeurId: string,
    params: { page?: number; limit?: number } = {}
  ): Promise<{ produits: Produit[]; pagination: Pagination }> =>
    shopClient.get('/admin/produits', { params: { ...params, vendeurId } }),

  /**
   * Avis d'un produit. Il n'existe aucune route « avis d'un vendeur » : la
   * fiche interroge donc produit par produit (voir `VendeurDetailPage`).
   */
  avisProduit: (
    produitId: string,
    limit = 5
  ): Promise<{ avis: AvisAdmin[]; pagination: Pagination }> =>
    shopClient.get('/admin/avis', { params: { produitId, limit } }),
};

// ── Aides de lecture ────────────────────────────────────────────────────────

/** Le backend renvoie `statut`; `isBlocked` puis `isActive` servent de repli. */
export const estBloque = (v: Vendeur): boolean =>
  v.statut ? v.statut === 'bloque' : (v.isBlocked ?? v.isActive === false);

export const nomBoutique = (v: Vendeur): string => v.nomBoutique || v.boutique?.nom || '—';

export const adresseBoutique = (v: Vendeur): string =>
  v.adresseBoutique || v.boutique?.adresse || '';

export const descriptionBoutique = (v: Vendeur): string =>
  v.descriptionBoutique || v.boutique?.description || '';

/** Téléphone du compte, à défaut celui déclaré sur la boutique. */
export const telephoneVendeur = (v: Vendeur): string =>
  v.telephone || v.telephoneBoutique || v.boutique?.telephone || '';

export const nomComplet = (v: Vendeur): string =>
  `${v.prenom ?? ''} ${v.nom ?? ''}`.trim() || '—';
