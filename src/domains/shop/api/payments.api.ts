import shopClient from '@/infrastructure/http/shop.client';

/** Paiement tel que renvoyé par l'administration. */
export interface Payment {
  id: string;
  commandeId: string;
  userId: string;
  montant: number | string;
  methode: 'wave' | 'orange_money' | 'carte' | 'cash_livraison';
  statut: 'en_attente' | 'succes' | 'echoue' | 'rembourse';
  transactionId?: string | null;
  fournisseur?: string | null;
  payeAt?: string | null;
  createdAt?: string;
  commande?: Record<string, any>;
  user?: Record<string, any>;
}

export interface PaymentFilters {
  statut?: string;
  methode?: string;
  userId?: string;
  dateDebut?: string;
  dateFin?: string;
  page?: number;
  limit?: number;
}

/** Libellés lisibles des codes renvoyés par l'API (fiche commande, listes). */
export const LIBELLE_METHODE_PAIEMENT: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  carte: 'Carte bancaire',
  cash_livraison: 'Paiement à la livraison',
};

export const LIBELLE_STATUT_PAIEMENT: Record<string, string> = {
  en_attente: 'en attente',
  succes: 'réussi',
  // Code du serveur : `echoue` (et non `echec`, qui renvoie une erreur 400).
  echoue: 'échoué',
  rembourse: 'remboursé',
};

export const paymentsApi = {
  getAll: (filters?: PaymentFilters): Promise<any> =>
    shopClient.get('/admin/paiements', { params: filters }),

  getById: (id: string): Promise<any> =>
    shopClient.get(`/admin/paiements/${id}`),

  getByCommande: (commandeId: string): Promise<any> =>
    shopClient.get(`/admin/paiements/commande/${commandeId}`),

  confirmer: (id: string, transactionId?: string): Promise<any> =>
    shopClient.patch(`/admin/paiements/${id}/confirmer`, { transactionId }),

  rembourser: (id: string, raison?: string): Promise<any> =>
    shopClient.patch(`/admin/paiements/${id}/rembourser`, { raison }),

  getRevenusTotal: (dateDebut?: string, dateFin?: string): Promise<any> =>
    shopClient.get('/admin/paiements/revenus-total', { params: { dateDebut, dateFin } }),
};
