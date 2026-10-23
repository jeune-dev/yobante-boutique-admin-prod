import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import {
  formaterDateHeure,
  formaterEcart,
  libelleMotif,
  libelleRole,
  libelleSource,
  nomUtilisateur,
} from '../stock.labels';

interface Ajustement {
  id: string;
  source: string;
  ancienneQuantite: number;
  nouvelleQuantite: number;
  difference: number;
  motif?: string | null;
  commentaire?: string | null;
  createdAt: string;
  auteur?: { id?: string; nom?: string; prenom?: string; email?: string; role?: string } | null;
}

interface Reponse {
  mouvements: Ajustement[];
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
        params: { source: 'ajustement_admin', page, limit: 10 },
      }),
  });

  const ajustements = data?.mouvements ?? [];

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Modifications manuelles</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Chaque correction saisie par un administrateur, avec son motif. L’historique n’est jamais
          écrasé ni supprimé.
        </p>
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
                <th className="p-4 font-medium text-gray-500">Date</th>
                <th className="p-4 font-medium text-gray-500">Avant</th>
                <th className="p-4 font-medium text-gray-500">Après</th>
                <th className="p-4 font-medium text-gray-500">Différence</th>
                <th className="p-4 font-medium text-gray-500">Motif</th>
                <th className="p-4 font-medium text-gray-500">Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {ajustements.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                  <td className="p-4 whitespace-nowrap tbl-primary" data-label="Date">
                    {formaterDateHeure(a.createdAt)}
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {libelleSource(a.source)}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600" data-label="Avant">
                    {a.ancienneQuantite}
                  </td>
                  <td className="p-4 font-medium" data-label="Après">
                    {a.nouvelleQuantite}
                  </td>
                  <td
                    className={`p-4 font-semibold ${
                      a.difference > 0
                        ? 'text-green-600'
                        : a.difference < 0
                          ? 'text-red-600'
                          : 'text-gray-500'
                    }`}
                    data-label="Différence"
                  >
                    {formaterEcart(a.difference)}
                  </td>
                  <td className="p-4 text-gray-600" data-label="Motif">
                    {libelleMotif(a.motif)}
                    {a.commentaire && (
                      <span className="block text-xs text-gray-400 mt-0.5 break-words">
                        {a.commentaire}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-gray-600" data-label="Utilisateur">
                    {nomUtilisateur(a.auteur, 'Inconnu')}
                    <span className="block text-xs text-gray-400 mt-0.5 break-all">
                      {libelleRole(a.auteur?.role)}
                      {a.auteur?.id ? ` · ${a.auteur.id}` : ''}
                    </span>
                  </td>
                </tr>
              ))}
              {ajustements.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 tbl-empty">
                    Aucune modification manuelle enregistrée.
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
