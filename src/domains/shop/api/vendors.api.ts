import shopClient from '@/infrastructure/http/shop.client';

export type StatutVendeur = 'actif' | 'bloque';

export interface VendeurFilters {
  search?: string;
  statut?: StatutVendeur;
  page?: number;
  limit?: number;
}

// Pas de `password` : le mot de passe temporaire est généré par le backend
// puis envoyé au vendeur par email.
export interface CreateVendeurData {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  nomBoutique: string;
  adresseBoutique?: string;
  description?: string;
  infoLegale?: string;
}

export const vendorsApi = {
  getAll: (filters?: VendeurFilters): Promise<any> =>
    shopClient.get('/admin/vendeurs', { params: filters }),

  getById: (id: string): Promise<any> =>
    shopClient.get(`/admin/vendeurs/${id}`),

  create: (data: CreateVendeurData): Promise<any> =>
    shopClient.post('/admin/vendeurs', data),

  // Un vendeur est actif dès sa création : seul le blocage le désactive.
  getStatut: (id: string): Promise<any> =>
    shopClient.get(`/admin/vendeurs/${id}/statut`),

  bloquer: (id: string): Promise<any> =>
    shopClient.patch(`/admin/vendeurs/${id}/bloquer`),

  debloquer: (id: string): Promise<any> =>
    shopClient.patch(`/admin/vendeurs/${id}/debloquer`),

  updateProfil: (id: string, data: Record<string, any>): Promise<any> =>
    shopClient.put(`/admin/vendeurs/${id}`, data),
};
