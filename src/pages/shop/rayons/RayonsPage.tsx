import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError } from '@/shared/utils/alert';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import { etatRetour } from '@/shared/hooks/useRetour';
import { lirePage, useParametresUrl } from '@/shared/hooks/useParametresUrl';

const api = {
  getRayons: (params?: any) => shopClient.get('/admin/rayons', { params }),
  creerRayon: (data: any) => shopClient.post('/admin/rayons', data),
  modifierRayon: (id: string, data: any) => shopClient.put(`/admin/rayons/${id}`, data),
  archiverRayon: (id: string) => shopClient.patch(`/admin/rayons/${id}/archiver`),
  getSousRayons: (rayonId: string, params?: any) =>
    shopClient.get(`/admin/rayons/${rayonId}/sous-rayons`, { params }),
  creerSousRayon: (rayonId: string, data: any) =>
    shopClient.post(`/admin/rayons/${rayonId}/sous-rayons`, data),
  modifierSousRayon: (id: string, data: any) =>
    shopClient.put(`/admin/rayons/sous-rayons/${id}`, data),
  archiverSousRayon: (id: string) => shopClient.patch(`/admin/rayons/sous-rayons/${id}/archiver`),
};

export default function RayonsPage() {
  // Onglet, recherche, page et rayon choisi vivent dans l'URL : le retour
  // depuis un sous-rayon rouvre l'onglet Sous-rayons sur le bon rayon.
  const [etatUrl, setEtatUrl] = useParametresUrl({ onglet: 'rayons', q: '', page: '1', rayon: '' });
  const tab = etatUrl.onglet === 'sous-rayons' ? 'sous-rayons' : 'rayons';
  const search = etatUrl.q;
  const page = lirePage(etatUrl.page);
  const selectedRayon = etatUrl.rayon;
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ nom: '', description: '', image: '' });
  const [showSrModal, setShowSrModal] = useState(false);
  const [editSr, setEditSr] = useState<any>(null);
  const [srForm, setSrForm] = useState({ nom: '', description: '' });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: rayonsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['rayons', search, page],
    queryFn: () => api.getRayons({ search, page, limit: 20 }),
  });

  const { data: sousRayonsData } = useQuery({
    queryKey: ['sous-rayons', selectedRayon],
    queryFn: () => api.getSousRayons(selectedRayon),
    enabled: !!selectedRayon,
  });

  const creerMutation = useMutation({
    mutationFn: (data: any) => api.creerRayon(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rayons'] });
      setShowModal(false);
      showSuccess(data);
    },
    onError: (e: any) => showError(e),
  });

  const modifierMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.modifierRayon(id, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rayons'] });
      setShowModal(false);
      showSuccess(data);
    },
    onError: (e: any) => showError(e),
  });

  const archiverMutation = useMutation({
    mutationFn: (id: string) => api.archiverRayon(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['rayons'] });
      showSuccess(data);
    },
  });

  const creerSrMutation = useMutation({
    mutationFn: (data: any) => api.creerSousRayon(selectedRayon, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sous-rayons'] });
      setShowSrModal(false);
      showSuccess(data);
    },
    onError: (e: any) => showError(e),
  });

  const modifierSrMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.modifierSousRayon(id, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sous-rayons'] });
      setShowSrModal(false);
      showSuccess(data);
    },
  });

  const archiverSrMutation = useMutation({
    mutationFn: (id: string) => api.archiverSousRayon(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sous-rayons'] });
      showSuccess(data);
    },
  });

  const rayons = rayonsData?.rayons || [];
  const pagination = rayonsData?.pagination;
  const sousRayons = sousRayonsData?.sousRayons || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) modifierMutation.mutate({ id: editItem.id, data: form });
    else creerMutation.mutate(form);
  };

  const openEdit = (r: any) => {
    setEditItem(r);
    setForm({ nom: r.nom, description: r.description || '', image: r.image || '' });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ nom: '', description: '', image: '' });
    setShowModal(true);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rayons &amp; Sous-rayons</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setEtatUrl({ onglet: 'rayons' })}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'rayons'
              ? 'bg-yellow-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Rayons
        </button>
        <button
          onClick={() => setEtatUrl({ onglet: 'sous-rayons' })}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'sous-rayons'
              ? 'bg-yellow-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Sous-rayons
        </button>
      </div>

      {/* Tab Rayons */}
      {tab === 'rayons' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-gray-100">
            <input
              value={search}
              onChange={(e) => setEtatUrl({ q: e.target.value, page: '1' })}
              placeholder="Rechercher un rayon…"
              aria-label="Rechercher un rayon"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
            <button
              onClick={openCreate}
              className="w-full sm:w-auto bg-yellow-500 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
            >
              + Nouveau rayon
            </button>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Chargement…</div>
          ) : isError ? (
            <ErreurChargement erreur={error} onReessayer={() => refetch()} />
          ) : (
            <div className="tbl-wrap">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 font-medium text-gray-500">Nom</th>
                  <th className="p-4 font-medium text-gray-500">Sous-rayons</th>
                  <th className="p-4 font-medium text-gray-500">Statut</th>
                  <th className="p-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rayons.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4 font-medium tbl-primary">{r.nom}</td>
                    <td className="p-4 text-center" data-label="Sous-rayons">{r.sousRayons?.length || 0}</td>
                    <td className="p-4 text-center" data-label="Statut">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          r.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {r.isActive ? 'Actif' : 'Archivé'}
                      </span>
                    </td>
                    <td className="p-4 text-center tbl-actions" data-label="Actions">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => navigate(`/boutique/produits?rayonId=${r.id}`, { state: etatRetour(location) })}
                          title="Voir les produits"
                          aria-label="Voir les produits"
                          className="btn-icon hover:bg-blue-50 text-gray-500 hover:text-blue-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          title="Modifier"
                          aria-label="Modifier"
                          className="btn-icon hover:bg-yellow-50 text-gray-500 hover:text-yellow-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => archiverMutation.mutate(r.id)}
                          title={r.isActive ? 'Archiver' : 'Restaurer'}
                          aria-label={r.isActive ? 'Archiver' : 'Restaurer'}
                          className="btn-icon hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rayons.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 tbl-empty">
                      Aucun rayon trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          )}
          <Pagination page={page} totalPages={pagination?.totalPages ?? 1} onChange={(p) => setEtatUrl({ page: String(p) })} />
        </div>
      )}

      {/* Tab Sous-rayons */}
      {tab === 'sous-rayons' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-gray-100">
            <select
              value={selectedRayon}
              onChange={(e) => setEtatUrl({ rayon: e.target.value })}
              aria-label="Choisir un rayon"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-auto sm:max-w-xs bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
            >
              <option value="">— Choisir un rayon —</option>
              {rayons.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.nom}
                </option>
              ))}
            </select>
            {selectedRayon && (
              <button
                onClick={() => {
                  setEditSr(null);
                  setSrForm({ nom: '', description: '' });
                  setShowSrModal(true);
                }}
                className="w-full sm:w-auto bg-yellow-500 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
              >
                + Nouveau sous-rayon
              </button>
            )}
          </div>
          {selectedRayon ? (
            <div className="tbl-wrap">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left p-4 font-medium text-gray-500">Nom</th>
                  <th className="p-4 font-medium text-gray-500">Statut</th>
                  <th className="p-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sousRayons.map((sr: any) => (
                  <tr
                    key={sr.id}
                    // La ligne entière mène aux produits rangés dans ce sous-rayon.
                    onClick={() => navigate(`/boutique/rayons/sous-rayon/${sr.id}`, { state: etatRetour(location) })}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="p-4 tbl-primary">
                      <span>
                        <span className="font-medium">{sr.nom}</span>
                        <span className="block text-xs text-gray-400 mt-0.5">
                          Voir et gérer ses produits
                        </span>
                      </span>
                    </td>
                    <td className="p-4 text-center" data-label="Statut">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          sr.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {sr.isActive ? 'Actif' : 'Archivé'}
                      </span>
                    </td>
                    <td className="p-4 text-center tbl-actions" data-label="Actions">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditSr(sr);
                            setSrForm({ nom: sr.nom, description: sr.description || '' });
                            setShowSrModal(true);
                          }}
                          title="Modifier"
                          aria-label="Modifier"
                          className="btn-icon hover:bg-yellow-50 text-gray-500 hover:text-yellow-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            archiverSrMutation.mutate(sr.id);
                          }}
                          title="Archiver"
                          aria-label="Archiver"
                          className="btn-icon hover:bg-gray-100 text-gray-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sousRayons.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-400 tbl-empty">
                      Aucun sous-rayon pour ce rayon
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              Sélectionner un rayon pour voir ses sous-rayons
            </div>
          )}
        </div>
      )}

      {/* Modal Rayon */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={editItem ? 'Modifier le rayon' : 'Nouveau rayon'}
        >
          <div
            className="modal-box max-w-md p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">
              {editItem ? 'Modifier le rayon' : 'Nouveau rayon'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nom *</label>
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 sm:py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creerMutation.isPending || modifierMutation.isPending}
                  className="px-4 py-2.5 sm:py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60"
                >
                  {creerMutation.isPending || modifierMutation.isPending
                    ? 'Enregistrement…'
                    : editItem ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sous-rayon */}
      {showSrModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSrModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label={editSr ? 'Modifier le sous-rayon' : 'Nouveau sous-rayon'}
        >
          <div
            className="modal-box max-w-md p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">
              {editSr ? 'Modifier le sous-rayon' : 'Nouveau sous-rayon'}
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editSr) modifierSrMutation.mutate({ id: editSr.id, data: srForm });
                else creerSrMutation.mutate(srForm);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-gray-700">Nom *</label>
                <input
                  required
                  value={srForm.nom}
                  onChange={(e) => setSrForm((f) => ({ ...f, nom: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={srForm.description}
                  onChange={(e) => setSrForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSrModal(false)}
                  className="px-4 py-2.5 sm:py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creerSrMutation.isPending || modifierSrMutation.isPending}
                  className="px-4 py-2.5 sm:py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60"
                >
                  {creerSrMutation.isPending || modifierSrMutation.isPending
                    ? 'Enregistrement…'
                    : editSr ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
