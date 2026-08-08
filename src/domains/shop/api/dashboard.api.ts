import shopClient from '@/infrastructure/http/shop.client';
import type { ShopStats, KpiStocks, TopProduit, ClientActif } from '../types';

export const dashboardApi = {
  getStats: (): Promise<any> =>
    shopClient.get('/admin/dashboard/stats'),

  getKpiStocks: (): Promise<any> =>
    shopClient.get('/admin/dashboard/kpi-stocks'),

  getTopProduits: (limit = 5): Promise<any> =>
    shopClient.get('/admin/dashboard/top-produits', { params: { limit } }),

  getClientsActifs: (limit = 5): Promise<any> =>
    shopClient.get('/admin/dashboard/clients-actifs', { params: { limit } }),

  getRevenus: (periode?: string): Promise<any> =>
    shopClient.get('/admin/dashboard/revenus', { params: { periode } }),

  getStockAlertes: (limit = 5): Promise<any> =>
    shopClient.get('/admin/dashboard/stock-alertes', { params: { limit } }),

  getOverview: (): Promise<any> => shopClient.get('/admin/dashboard/overview'),

  getCommandesParStatut: (): Promise<any> =>
    shopClient.get('/admin/dashboard/commandes-statut'),

  getCommandesRecentes: (limit = 5): Promise<any> =>
    shopClient.get('/admin/dashboard/commandes-recentes', { params: { limit } }),

  getStatsVendeurs: (): Promise<any> => shopClient.get('/admin/dashboard/stats-vendeurs'),

  getKpiComplet: (): Promise<any> => shopClient.get('/admin/dashboard/kpi-complet'),
};
