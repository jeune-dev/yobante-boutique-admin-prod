import shopClient from '@/infrastructure/http/shop.client';
import type { Pagination } from '@/domains/shop/types';

export type TypeSignalement = 'produit' | 'boutique';
export type StatutSignalement = 'en_attente' | 'traite' | 'rejete';

export interface Signalement {
  id: string;
  userId: string;
  type: TypeSignalement;
  /** Produit ou profil vendeur visé, selon `type`. */
  cibleId: string;
  raison: string;
  description: string | null;
  statut: StatutSignalement;
  reponseAdmin: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; nom: string; prenom: string; email: string } | null;
}

export interface FiltresSignalements {
  page?: number;
  limit?: number;
  statut?: StatutSignalement;
  type?: TypeSignalement;
}

/** Réclamations remontées depuis l'application mobile — `/api/admin/signalements`. */
export const signalementsApi = {
  lister: (
    filtres: FiltresSignalements = {}
  ): Promise<{ signalements: Signalement[]; pagination: Pagination }> =>
    shopClient.get('/admin/signalements', { params: filtres }),

  traiter: (
    id: string,
    corps: { statut: StatutSignalement; reponseAdmin?: string }
  ): Promise<{ signalement: Signalement }> => shopClient.patch(`/admin/signalements/${id}`, corps),
};

export const LIBELLE_TYPE_SIGNALEMENT: Record<TypeSignalement, string> = {
  produit: 'Produit',
  boutique: 'Boutique',
};

export const LIBELLE_STATUT_SIGNALEMENT: Record<StatutSignalement, string> = {
  en_attente: 'En attente',
  traite: 'Traité',
  rejete: 'Rejeté',
};

export const CLASSE_STATUT_SIGNALEMENT: Record<StatutSignalement, string> = {
  en_attente: 'bg-orange-100 text-orange-700',
  traite: 'bg-green-100 text-green-700',
  rejete: 'bg-gray-100 text-gray-600',
};
