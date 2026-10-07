import shopClient from '@/infrastructure/http/shop.client';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';
import type { Pagination } from '@/domains/shop/types';
import type {
  BornesPeriode,
} from '@/domains/shop/types/analytique';
import type {
  CompteVendeur,
  CreationReversement,
  Reversement,
  StatutReversement,
  SyntheseFinance,
} from '@/domains/shop/types/finance';

export interface FiltresReversements {
  page?: number;
  limit?: number;
  vendeurId?: string;
  statut?: StatutReversement;
}

/**
 * Finance marketplace — `/api/admin/finance/*`.
 *
 * Les lectures acceptent `debut` et `fin` (AAAA-MM-JJ). Attention à une
 * asymétrie voulue par le backend : les ventes sont bornées par la période,
 * mais les reversements déjà versés sont déduits **sans borne** — un versement
 * de janvier solde des ventes de décembre, le filtrer ferait réapparaître une
 * dette déjà payée.
 */
export const financeApi = {
  synthese: (
    filtres: FiltrePeriode = {}
  ): Promise<{ synthese: SyntheseFinance; periode: BornesPeriode }> =>
    shopClient.get('/admin/finance/synthese', { params: filtres }),

  comptesVendeurs: (
    filtres: FiltrePeriode = {}
  ): Promise<{ comptes: CompteVendeur[]; periode: BornesPeriode }> =>
    shopClient.get('/admin/finance/comptes-vendeurs', { params: filtres }),

  listerReversements: (
    filtres: FiltresReversements = {}
  ): Promise<{ reversements: Reversement[]; pagination: Pagination }> =>
    shopClient.get('/admin/finance/reversements', { params: filtres }),

  creerReversement: (corps: CreationReversement): Promise<{ reversement: Reversement }> =>
    shopClient.post('/admin/finance/reversements', corps),

  changerStatutReversement: (
    id: string,
    statut: StatutReversement
  ): Promise<{ reversement: Reversement }> =>
    shopClient.patch(`/admin/finance/reversements/${id}/statut`, { statut }),

  /** `null` rétablit le taux par défaut de la plateforme. */
  definirTauxCommission: (
    vendeurId: string,
    taux: number | null
  ): Promise<{ tauxCommission: number | null }> =>
    shopClient.patch(`/admin/finance/vendeurs/${vendeurId}/taux-commission`, { taux }),
};
