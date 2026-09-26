import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError } from '@/shared/utils/alert';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import { etatRetour } from '@/shared/hooks/useRetour';
import { lirePage, useParametresUrl } from '@/shared/hooks/useParametresUrl';

const api = {
  getCommandes: (p: any) =>
    shopClient.get('/admin/commandes', { params: p }),
  getKpi: () => shopClient.get('/admin/commandes/kpi'),
  valider: (id: string) => shopClient.patch(`/admin/commandes/${id}/valider`),
  rejeter: (id: string, motif?: string) =>
    shopClient.patch(`/admin/commandes/${id}/rejeter`, { motif }),
};

const STATUT_COLORS: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  validee: 'bg-blue-100 text-blue-700',
  en_preparation: 'bg-purple-100 text-purple-700',
  expediee: 'bg-indigo-100 text-indigo-700',
  livree: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
  rejetee: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  // Recherche, statut et page vivent dans l'URL : le retour depuis le détail
  // d'une commande restitue la liste telle qu'on l'avait laissée.
  const [filtres, setFiltres] = useParametresUrl({ q: '', statut: '', page: '1' });
  const search = filtres.q;
  const statut = filtres.statut;
  const page = lirePage(filtres.page);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectMotif, setRejectMotif] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['commandes', search, statut, page],
    queryFn: () => api.getCommandes({ search, statut, page, limit: 20 }),
  });

  const { data: kpi } = useQuery({
    queryKey: ['commandes-kpi'],
    queryFn: api.getKpi,
  });

  const validerMutation = useMutation({
    mutationFn: (id: string) => api.valider(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['commandes'] });
      qc.invalidateQueries({ queryKey: ['commandes-kpi'] });
      showSuccess(data);
    },
    onError: (e: any) => showError(e),
  });

  const rejeterMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      api.rejeter(id, motif),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['commandes'] });
      qc.invalidateQueries({ queryKey: ['commandes-kpi'] });
      showSuccess(data);
      setShowRejectModal(null);
      setRejectMotif('');
    },
    onError: (e: any) => showError(e),
  });

  const commandes = data?.commandes || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Commandes</h1>
        <button
          type="button"
          onClick={() => navigate('/boutique/commandes/nouveau', { state: etatRetour(location) })}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Créer une commande
        </button>
      </div>

      {/* KPI Cards : 2 par ligne sur téléphone, 4 dès la tablette. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total', value: kpi?.total, color: 'bg-gray-50' },
          { label: 'En attente', value: kpi?.enAttente, color: 'bg-yellow-50' },
          { label: 'Validées', value: kpi?.validees, color: 'bg-green-50' },
          // Un rejet admin passe la commande en « rejetee » (et non plus « annulee »).
          {
            label: 'Annulées / rejetées',
            value: kpi ? (kpi.annulees ?? 0) + (kpi.rejetees ?? 0) : undefined,
            color: 'bg-red-50',
          },
        ].map((k) => (
          <div key={k.label} className={`${k.color} rounded-xl p-4 border border-gray-100`}>
            <p className="text-sm text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{k.value ?? '…'}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100">
          <input
            value={search}
            onChange={(e) => {
              setFiltres({ q: e.target.value, page: '1' });
            }}
            placeholder="Rechercher…"
            aria-label="Rechercher une commande"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
          <select
            value={statut}
            onChange={(e) => {
              setFiltres({ statut: e.target.value, page: '1' });
            }}
            aria-label="Filtrer par statut"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-auto bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            <option value="">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="validee">Validée</option>
            <option value="en_preparation">En préparation</option>
            <option value="expediee">Expédiée</option>
            <option value="livree">Livrée</option>
            <option value="rejetee">Rejetée</option>
            <option value="annulee">Annulée</option>
          </select>
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
                <th className="p-4 font-medium text-gray-500">Référence</th>
                <th className="p-4 font-medium text-gray-500">Client</th>
                <th className="p-4 font-medium text-gray-500">Montant</th>
                <th className="p-4 font-medium text-gray-500 hidden xl:table-cell">Articles</th>
                <th className="p-4 font-medium text-gray-500">Statut</th>
                <th className="p-4 font-medium text-gray-500">Date</th>
                <th className="p-4 font-medium text-gray-500 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {commandes.map((c: any) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 font-mono text-xs tbl-primary">{c.reference}</td>
                  <td className="p-4" data-label="Client">
                    {c.user?.prenom} {c.user?.nom}
                  </td>
                  <td className="p-4 font-medium whitespace-nowrap" data-label="Montant">
                    {c.montantTotal?.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="p-4 text-center hidden xl:table-cell" data-label="Articles">{c.items?.length || '—'}</td>
                  <td className="p-4" data-label="Statut">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        STATUT_COLORS[c.statut] || 'bg-gray-100'
                      }`}
                    >
                      {c.statut}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500" data-label="Date">
                    {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="p-4 tbl-actions" data-label="Actions">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => navigate(`/boutique/commandes/${c.id}`, { state: etatRetour(location) })}
                        title="Voir"
                        aria-label="Voir la commande"
                        className="btn-icon hover:bg-gray-100 text-gray-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {c.statut === 'en_attente' && (
                        <>
                          <button
                            onClick={() => validerMutation.mutate(c.id)}
                            title="Accepter"
                            aria-label="Accepter la commande"
                            className="btn-icon hover:bg-green-50 text-gray-500 hover:text-green-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setShowRejectModal(c.id)}
                            title="Rejeter"
                            aria-label="Rejeter la commande"
                            className="btn-icon hover:bg-red-50 text-gray-500 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {commandes.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 tbl-empty">
                    Aucune commande trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
        <Pagination page={page} totalPages={pagination?.totalPages ?? 1} onChange={(p) => setFiltres({ page: String(p) })} />
      </div>

      {/* Modal de rejet */}
      {showRejectModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Rejeter la commande">
          <div className="modal-box max-w-md">
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Rejeter la commande
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez indiquer le motif du rejet. Ce motif sera visible au client.
              </p>
              <textarea
                value={rejectMotif}
                onChange={(e) => setRejectMotif(e.target.value)}
                placeholder="Motif du rejet (ex: Stock insuffisant, Produit indisponible)…"
                aria-label="Motif du rejet"
                maxLength={500}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                rows={4}
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectMotif('');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (!rejectMotif.trim()) {
                      showError('Le motif du rejet est obligatoire');
                      return;
                    }
                    rejeterMutation.mutate({
                      id: showRejectModal,
                      motif: rejectMotif,
                    });
                  }}
                  disabled={rejeterMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-gray-400 rounded-lg"
                >
                  {rejeterMutation.isPending ? 'En cours…' : 'Rejeter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
