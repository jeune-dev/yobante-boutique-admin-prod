import shopClient from '@/infrastructure/http/shop.client';
import type { ActiviteClient } from '@/domains/shop/types/indicateurs';

export interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  /** Segment d'activité : acheteurs, reachat, fideles, inactifs, sans_achat. */
  segment?: string;
  /** Ont commandé entre ces dates (AAAA-MM-JJ, incluses). */
  commandeDebut?: string;
  commandeFin?: string;
  page?: number;
  limit?: number;
}

/** Utilisateur tel que renvoyé par l'administration. */
export interface ShopUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: string;
  isActive: boolean;
  isVerified?: boolean;
  // Toujours présent : les modèles sont horodatés côté backend.
  createdAt: string;
  /** Activité commerciale, calculée par le backend pour la liste des clients. */
  activite?: ActiviteClient;
}

export const usersApi = {
  /** Supprime (anonymise) un compte client ; ses commandes restent. */
  supprimerClient: (id: string): Promise<any> => shopClient.delete(`/admin/users/clients/${id}`),
  getAll: (filters?: UserFilters): Promise<any> =>
    shopClient.get('/admin/users', { params: filters }),

  getById: (id: string): Promise<any> =>
    shopClient.get(`/admin/users/${id}`),

  toggleActivation: (id: string): Promise<any> =>
    shopClient.patch(`/admin/users/${id}/toggle`),

  // Le backend expose deux routes distinctes pour les clients, plutôt qu'une
  // bascule : on les nomme explicitement.
  activer: (id: string): Promise<any> =>
    shopClient.patch(`/admin/users/clients/${id}/activer`),

  bloquer: (id: string): Promise<any> =>
    shopClient.patch(`/admin/users/clients/${id}/desactiver`),

  getClients: (filters?: UserFilters): Promise<any> =>
    shopClient.get('/admin/users/clients', { params: filters }),

  exportClients: (): Promise<any> => shopClient.get('/admin/users/clients/export'),
};
