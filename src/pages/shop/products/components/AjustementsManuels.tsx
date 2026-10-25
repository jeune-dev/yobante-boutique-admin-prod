import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import { Bloc, Vide } from '@/shared/components/dashboard/Blocs';
import { dateHeure } from '@/shared/utils/format';
import {
  SOURCE_AJUSTEMENT_MANUEL,
  couleurEcart,
  ecart,
  libelleMotif,
  libelleRole,
  libelleSource,
  nomUtilisateur,
} from '../stock.labels';
import type { Mouvement } from './HistoriqueStock';

interface Reponse {
  mouvements: Mouvement[];
  pagination: { total: number; totalPages: number; page: number; limit: number };
}

/**
 * Ajustements décidés à la main par l'administration, isolés du reste du
 * journal par le filtre serveur `source=ajustement_admin`. Le motif y est
 * toujours renseigné : il est obligatoire à l'écriture, côté React comme
 * côté API. Rien n'est modifiable ni supprimable depuis cette vue.
 */
export default function AjustementsManuels({ produitId }: { produitId: string }) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['produit-mouvements-stock', produitId, 'ajustements', page],
    queryFn: () =>
      shopClient.get<Reponse>(`/admin/produits/${produitId}/mouvements-stock`, {
        params: { source: SOURCE_AJUSTEMENT_MANUEL, page, limit: 10 },
      }),
  });

  const ajustements = data?.mouvements ?? [];

  return (
    <Bloc>
      <div className="px-3 sm:px-4 py-3 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Modifications manuelles</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Chaque correction saisie par un administrateur, avec son motif. L’historique n’est jamais
          écrasé ni supprimé.
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Chargement…</div>
      ) : isError ? (
        <ErreurChargement
          erreur={error}
          onReessayer={() => refetch()}
          defaut="Impossible de charger les modifications manuelles."
        />
      ) : ajustements.length === 0 ? (
        <Vide texte="Aucune modification manuelle enregistrée." />
      ) : (
        <div className="tbl-wrap">
          <table className="w-full text-sm tbl-cards">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="px-3 sm:px-4 py-2.5 font-medium">Date</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Avant</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Après</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Différence</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium">Motif</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium">Utilisateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ajustements.map((a) => (
                <tr key={a.id} className="align-top">
                  <td
                    data-label="Date"
                    className="px-3 sm:px-4 py-2.5 whitespace-nowrap tbl-primary"
                  >
                    {dateHeure(a.createdAt)}
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {libelleSource(a.source)}
                    </span>
                  </td>
                  <td
                    data-label="Avant"
                    className="px-3 sm:px-4 py-2.5 text-right text-gray-600 tabular-nums"
                  >
                    {a.ancienneQuantite}
                  </td>
                  <td
                    data-label="Après"
                    className="px-3 sm:px-4 py-2.5 text-right font-medium text-gray-900 tabular-nums"
                  >
                    {a.nouvelleQuantite}
                  </td>
                  <td
                    data-label="Différence"
                    className={`px-3 sm:px-4 py-2.5 text-right font-semibold tabular-nums ${couleurEcart(a.difference)}`}
                  >
                    {ecart(a.difference)}
                  </td>
                  <td data-label="Motif" className="px-3 sm:px-4 py-2.5 text-gray-600">
                    {libelleMotif(a.motif, a.source)}
                    {a.commentaire && (
                      <span className="block text-xs text-gray-400 mt-0.5 break-words">
                        {a.commentaire}
                      </span>
                    )}
                  </td>
                  <td data-label="Utilisateur" className="px-3 sm:px-4 py-2.5 text-gray-600">
                    {nomUtilisateur(a.auteur, 'Inconnu')}
                    <span className="block text-xs text-gray-400 mt-0.5 break-all">
                      {libelleRole(a.auteur?.role)}
                    </span>
                  </td>
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
