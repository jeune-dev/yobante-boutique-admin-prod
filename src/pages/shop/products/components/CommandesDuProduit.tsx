import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import { Bloc, Vide } from '@/shared/components/dashboard/Blocs';
import { useOuvrirLigne } from '@/shared/hooks/useOuvrirLigne';
import { dateHeure, fcfa, nombre } from '@/shared/utils/format';
import { STATUT_COMMANDE_COULEUR, nomUtilisateur } from '../stock.labels';

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
  const ouvrir = useOuvrirLigne();
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
    <Bloc>
      <div className="px-3 sm:px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">Commandes contenant ce produit</h2>
        {total !== undefined && (
          <span className="text-xs text-gray-400 shrink-0">
            {nombre(total)} ligne{total > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Chargement…</div>
      ) : isError ? (
        <ErreurChargement
          erreur={error}
          onReessayer={() => refetch()}
          defaut="Impossible de charger les commandes de ce produit."
        />
      ) : lignes.length === 0 ? (
        <Vide texte="Ce produit n’apparaît dans aucune commande." />
      ) : (
        <div className="tbl-wrap">
          <table className="w-full text-sm tbl-cards">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="px-3 sm:px-4 py-2.5 font-medium">Commande</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium">Date</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium">Client</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Quantité</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Prix unitaire</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Montant</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium">Statut</th>
                {vendeur && <th className="px-3 sm:px-4 py-2.5 font-medium">Vendeur</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lignes.map((l) => (
                <tr
                  key={l.id}
                  {...ouvrir(l.commande ? `/boutique/commandes/${l.commande.id}` : null)}
                >
                  <td data-label="Commande" className="px-3 sm:px-4 py-2.5 tbl-primary">
                    {l.commande ? (
                      <Link
                        to={`/boutique/commandes/${l.commande.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {l.commande.reference ?? 'Voir la commande'}
                      </Link>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td
                    data-label="Date"
                    className="px-3 sm:px-4 py-2.5 whitespace-nowrap text-gray-600"
                  >
                    {dateHeure(l.commande?.createdAt)}
                  </td>
                  <td data-label="Client" className="px-3 sm:px-4 py-2.5 text-gray-600">
                    {nomUtilisateur(l.commande?.user)}
                  </td>
                  <td
                    data-label="Quantité"
                    className="px-3 sm:px-4 py-2.5 text-right font-medium tabular-nums"
                  >
                    {nombre(l.quantite)}
                  </td>
                  <td
                    data-label="Prix unitaire"
                    className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap text-gray-600 tabular-nums"
                  >
                    {fcfa(l.prixUnitaire)}
                  </td>
                  <td
                    data-label="Montant"
                    className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap font-medium tabular-nums"
                  >
                    {fcfa(l.sousTotal)}
                  </td>
                  <td data-label="Statut" className="px-3 sm:px-4 py-2.5">
                    <span
                      className={`badge ${
                        STATUT_COMMANDE_COULEUR[l.commande?.statut ?? ''] ??
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {l.commande?.statut ?? '—'}
                    </span>
                  </td>
                  {vendeur && (
                    <td data-label="Vendeur" className="px-3 sm:px-4 py-2.5 text-gray-600">
                      {vendeur}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={data?.pagination?.totalPages ?? 1} onChange={setPage} />
    </Bloc>
  );
}
