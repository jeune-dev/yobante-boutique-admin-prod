import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminBackButton from '@/shared/components/AdminBackButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError } from '@/shared/utils/alert';

const api = {
  getCommande: (id: string) =>
    shopClient.get(`/admin/commandes/${id}`).then((r: any) => r.commande ?? r),
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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectMotif, setRejectMotif] = useState('');

  const { data: commande, isLoading } = useQuery({
    queryKey: ['commande', id],
    queryFn: () => api.getCommande(id!),
    enabled: !!id,
  });

  const validerMutation = useMutation({
    mutationFn: () => api.valider(id!),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['commande', id] });
      qc.invalidateQueries({ queryKey: ['commandes'] });
      showSuccess(data);
    },
  });

  const rejeterMutation = useMutation({
    mutationFn: ({ motif }: { motif: string }) => api.rejeter(id!, motif),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['commande', id] });
      qc.invalidateQueries({ queryKey: ['commandes'] });
      showSuccess(data);
      setShowRejectModal(false);
      setRejectMotif('');
    },
    onError: (e: any) => showError(e),
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-400">Chargement…</div>;
  }

  if (!commande) {
    return <div className="p-8 text-center text-red-400">Commande introuvable</div>;
  }

  const items = commande.items || commande.CommandeItems || [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
        <button
          onClick={() => navigate('/boutique/commandes')}
          aria-label="Retour aux commandes"
          className="btn-icon -ml-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">
          Commande {commande.reference}
        </h1>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            STATUT_COLORS[commande.statut] || 'bg-gray-100'
          }`}
        >
          {commande.statut}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Client</p>
          <p className="font-semibold">
            {commande.user?.prenom} {commande.user?.nom}
          </p>
          <p className="text-sm text-gray-500">{commande.user?.email}</p>
          <p className="text-sm text-gray-500">{commande.user?.telephone}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Livraison</p>
          <p className="font-semibold">{commande.adresse?.ville || '—'}</p>
          <p className="text-sm text-gray-500">{commande.adresse?.rue || ''}</p>
          <p className="text-sm text-gray-500 mt-1">
            Paiement : {commande.methodePaiement}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Articles</h2>
        </div>
        <div className="tbl-wrap">
          <table className="w-full text-sm tbl-cards">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-medium text-gray-500">Produit</th>
                <th className="p-4 font-medium text-gray-500">Qté</th>
                <th className="p-4 font-medium text-gray-500">Prix unit.</th>
                <th className="p-4 font-medium text-gray-500">Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="p-4 tbl-primary">{item.produit?.nom || item.Produit?.nom || `Produit #${item.produitId}`}</td>
                  <td className="p-4" data-label="Qté">{item.quantite}</td>
                  <td className="p-4 whitespace-nowrap" data-label="Prix unit.">{item.prixUnitaire?.toLocaleString('fr-FR')} FCFA</td>
                  <td className="p-4 font-medium whitespace-nowrap" data-label="Sous-total">{item.sousTotal?.toLocaleString('fr-FR')} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end p-4 border-t border-gray-100">
          <span className="font-bold text-lg">
            Total : {commande.montantTotal?.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      </div>

      {commande.motifRejet && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-red-900 mb-2">Motif du rejet :</p>
          <p className="text-sm text-red-700 whitespace-pre-wrap">{commande.motifRejet}</p>
        </div>
      )}

      {commande.statut === 'en_attente' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => validerMutation.mutate()}
            disabled={validerMutation.isPending}
            className="px-4 py-2.5 sm:py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-60"
          >
            Valider la commande
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={rejeterMutation.isPending}
            className="px-4 py-2.5 sm:py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-60"
          >
            Rejeter
          </button>
        </div>
      )}

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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                rows={4}
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
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
                    rejeterMutation.mutate({ motif: rejectMotif });
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
