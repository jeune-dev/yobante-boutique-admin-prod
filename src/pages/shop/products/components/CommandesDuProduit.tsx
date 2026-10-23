import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import { etatRetour } from '@/shared/hooks/useRetour';
import {
  STATUT_COMMANDE_COULEUR,
  formaterDateHeure,
  formaterMontant,
  nomUtilisateur,
} from '../stock.labels';

interface LigneCommande {
  id: string;
  quantite: number;
  prixUnitaire: string | number;
  sousTotal: string | number;
  commande?: {
    id: string;
    reference?: string;
    statut?: string;
    createdAt?: string;
    user?: { id: string; nom?: string; prenom?: string; email?: string } | null;
  } | null;
}

interface Reponse {
  lignes: LigneCommande[];
  pagination: { total: number; totalPages: number; page: number; limit: number };
}

interface Props {
  produitId: string;
  /** Vendeur du produit, rappelé par ligne : la fiche ne porte qu'un produit. */
  vendeur?: string | null;
}

/**
 * Commandes dans lesquelles le produit apparaît.
 *
 * Le prix unitaire et le montant de la ligne sont ceux figés dans
 * `commande_items` au moment de l'achat : ils ne sont jamais recalculés
 * depuis le prix courant du produit, qui a pu changer depuis.
 */
export default function CommandesDuProduit({ produitId, vendeur }: Props) {
  const location = useLocation();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['produit-commandes', produitId, page],
    queryFn: () =>
      shopClient.get<Reponse>(`/admin/produits/${produitId}/commandes`, {
        params: { page, limit: 10 },
      }),
  });

  const lignes = data?.lignes ?? [];
  const total = data?.pagination?.total;

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <h2 className="font-bold text-gray-900">Commandes contenant ce produit</h2>
        {total !== undefined && (
          <span className="text-xs text-gray-400 shrink-0">
            {total} ligne{total > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Chargement…</div>
      ) : isError ? (
        <ErreurChargement erreur={error} onReessayer={() => refetch()} />
      ) : (
        <div className="tbl-wrap">
          <table className="w-full text-sm tbl-cards">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-medium text-gray-500">Commande</th>
                <th className="p-4 font-medium text-gray-500">Date</th>
                <th className="p-4 font-medium text-gray-500">Client</th>
                <th className="p-4 font-medium text-gray-500">Quantité</th>
                <th className="p-4 font-medium text-gray-500">Prix unitaire</th>
                <th className="p-4 font-medium text-gray-500">Montant</th>
                <th className="p-4 font-medium text-gray-500">Statut</th>
                {vendeur && <th className="p-4 font-medium text-gray-500">Vendeur</th>}
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 tbl-primary" data-label="Commande">
                    {l.commande ? (
                      <Link
                        to={`/boutique/commandes/${l.commande.id}`}
                        state={etatRetour(location)}
                        className="font-medium text-yellow-700 hover:underline"
                      >
                        {l.commande.reference ?? 'Voir la commande'}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap text-gray-600" data-label="Date">
                    {formaterDateHeure(l.commande?.createdAt)}
                  </td>
                  <td className="p-4 text-gray-600" data-label="Client">
                    {nomUtilisateur(l.commande?.user)}
                  </td>
                  <td className="p-4 font-medium" data-label="Quantité">
                    {l.quantite}
                  </td>
                  <td className="p-4 whitespace-nowrap text-gray-600" data-label="Prix unitaire">
                    {formaterMontant(l.prixUnitaire)}
                  </td>
                  <td className="p-4 whitespace-nowrap font-medium" data-label="Montant">
                    {formaterMontant(l.sousTotal)}
                  </td>
                  <td className="p-4" data-label="Statut">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        STATUT_COMMANDE_COULEUR[l.commande?.statut ?? ''] ??
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {l.commande?.statut ?? '—'}
                    </span>
                  </td>
                  {vendeur && (
                    <td className="p-4 text-gray-600" data-label="Vendeur">
                      {vendeur}
                    </td>
                  )}
                </tr>
              ))}
              {lignes.length === 0 && (
                <tr>
                  <td colSpan={vendeur ? 8 : 7} className="p-8 text-center text-gray-400 tbl-empty">
                    Ce produit n’apparaît dans aucune commande.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={data?.pagination?.totalPages ?? 1}
        onChange={(p) => setPage(p)}
      />
    </section>
  );
}
