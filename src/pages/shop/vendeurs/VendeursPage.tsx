import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError } from '@/shared/utils/alert';

const api = {
  getVendeurs: (p: any) =>
    shopClient.get('/admin/vendeurs', { params: p }),
  creerVendeur: (data: any) => shopClient.post('/admin/vendeurs', data),
  validerStep1: (id: string) => shopClient.patch(`/admin/vendeurs/${id}/valider-step1`),
  validerStep2: (id: string) => shopClient.patch(`/admin/vendeurs/${id}/valider-step2`),
  rejeter: (id: string) => shopClient.patch(`/admin/vendeurs/${id}/rejeter`),
};

const STATUT_COLORS: Record<string, string> = {
  actif: 'bg-green-100 text-green-700',
  en_attente: 'bg-yellow-100 text-yellow-700',
  rejete: 'bg-red-100 text-red-700',
  suspendu: 'bg-gray-100 text-gray-500',
};

export default function VendeursPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    nomBoutique: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vendeurs', search, page],
    queryFn: () => api.getVendeurs({ search, page, limit: 20 }),
  });

  const creerMutation = useMutation({
    mutationFn: (data: any) => api.creerVendeur(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['vendeurs'] });
      setShowModal(false);
      setForm({ nom: '', prenom: '', email: '', telephone: '', nomBoutique: '' });
      showSuccess(data);
    },
    onError: (e: any) => showError(e),
  });

  const validerStep1Mutation = useMutation({
    mutationFn: (id: string) => api.validerStep1(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['vendeurs'] });
      showSuccess(data);
    },
  });

  const validerStep2Mutation = useMutation({
    mutationFn: (id: string) => api.validerStep2(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['vendeurs'] });
      showSuccess(data);
    },
  });

  const rejeterMutation = useMutation({
    mutationFn: (id: string) => api.rejeter(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['vendeurs'] });
      showSuccess(data);
    },
  });

  const vendeurs = data?.vendeurs || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendeurs</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
        >
          + Nouveau vendeur
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un vendeur…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-4 font-medium text-gray-500">Vendeur</th>
                  <th className="p-4 font-medium text-gray-500">Boutique</th>
                  <th className="p-4 font-medium text-gray-500">Contact</th>
                  <th className="p-4 font-medium text-gray-500">Statut</th>
                  <th className="p-4 font-medium text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendeurs.map((v: any) => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4 font-medium">
                      {v.prenom} {v.nom}
                    </td>
                    <td className="p-4 text-gray-600">{v.nomBoutique || '—'}</td>
                    <td className="p-4 text-gray-500 text-xs">
                      <div>{v.email}</div>
                      <div>{v.telephone}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          STATUT_COLORS[v.statut] || 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {v.statut || 'en_attente'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        {(v.statut === 'en_attente' || !v.statut) && (
                          <>
                            <button
                              onClick={() => validerStep1Mutation.mutate(v.id)}
                              title="Valider étape 1"
                              className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
                            >
                              Step 1
                            </button>
                            <button
                              onClick={() => validerStep2Mutation.mutate(v.id)}
                              title="Valider étape 2 (activer)"
                              className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs hover:bg-green-100"
                            >
                              Activer
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Rejeter ce vendeur ?')) rejeterMutation.mutate(v.id);
                              }}
                              title="Rejeter"
                              className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                            >
                              Rejeter
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {vendeurs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      Aucun vendeur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination?.totalPages > 1 && (
          <div className="flex justify-center p-4 gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded text-sm ${
                  page === p ? 'bg-yellow-500 text-white' : 'hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal Créer vendeur */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Nouveau vendeur</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                creerMutation.mutate(form);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Prénom *</label>
                  <input
                    required
                    value={form.prenom}
                    onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom *</label>
                  <input
                    required
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Téléphone</label>
                <input
                  value={form.telephone}
                  onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nom de la boutique</label>
                <input
                  value={form.nomBoutique}
                  onChange={(e) => setForm((f) => ({ ...f, nomBoutique: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creerMutation.isPending}
                  className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60"
                >
                  {creerMutation.isPending ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
