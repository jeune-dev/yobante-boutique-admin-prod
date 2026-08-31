import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';

const api = {
  getProduits: (p: any) =>
    shopClient.get('/admin/produits', { params: p }),
  supprimerProduit: (id: string) => shopClient.delete(`/admin/produits/${id}`),
  creerPromo: (produitId: string, data: any) =>
    shopClient.post(`/admin/promotions/produit/${produitId}`, data),
};

const SECTIONS = {
  nos_promos_du_moment: { label: 'Promo du moment', title: 'Promo du moment' },
  a_ne_pas_rater: { label: 'À ne pas rater', title: 'À ne pas rater' },
  nos_promos_a_venir: { label: 'Promo à venir', title: 'Promo à venir' },
} as const;

type Section = keyof typeof SECTIONS;

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {label}
      </span>
    </div>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterRayonId, setFilterRayonId] = useState(searchParams.get('rayonId') || '');
  const [promoModal, setPromoModal] = useState<{ produit: any; section: Section } | null>(null);
  const [pct, setPct] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  useEffect(() => {
    const id = searchParams.get('rayonId');
    if (id) setFilterRayonId(id);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-produits', search, page, filterRayonId],
    queryFn: () => api.getProduits({ search, page, limit: 20, rayonId: filterRayonId || undefined }),
  });

  const supprimerMutation = useMutation({
    mutationFn: (id: string) => api.supprimerProduit(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-produits'] });
      showSuccess(data);
    },
    onError: (e: any) => showError(e),
  });

  const promoMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.creerPromo(id, data),
    onSuccess: (data) => {
      setPromoModal(null);
      showSuccess(data);
    },
    onError: (e: any) => showError(e),
  });

  const produits = data?.produits || [];
  const pagination = data?.pagination;
  const prixActuel = promoModal?.produit?.prix || 0;
  const prixPromo = pct
    ? parseFloat((prixActuel * (1 - parseFloat(pct) / 100)).toFixed(2))
    : 0;

  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoModal) return;
    promoMutation.mutate({
      id: promoModal.produit.id,
      data: {
        section: promoModal.section,
        pourcentageReduction: parseFloat(pct),
        dateDebut,
        dateFin,
      },
    });
  };

  const openPromo = (produit: any, section: Section) => {
    setPromoModal({ produit, section });
    setPct('');
    setDateDebut('');
    setDateFin('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
        <button
          onClick={() => navigate('/boutique/produits/nouveau')}
          className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
        >
          + Nouveau produit
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
            placeholder="Rechercher un produit…"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-4 font-medium text-gray-500">Produit</th>
                  <th className="p-4 font-medium text-gray-500">Rayon</th>
                  <th className="p-4 font-medium text-gray-500">Prix</th>
                  <th className="p-4 font-medium text-gray-500">Stock</th>
                  <th className="p-4 font-medium text-gray-500">Statut</th>
                  <th className="p-4 font-medium text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {produits.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            className="w-10 h-10 rounded-lg object-cover"
                            alt=""
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100" />
                        )}
                        <span className="font-medium">{p.nom}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500">
                      {p.rayon?.nom || '—'}
                      {p.sousRayon ? ` / ${p.sousRayon.nom}` : ''}
                    </td>
                    <td className="p-4 font-medium">
                      {p.prix?.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="p-4 text-center">{p.stock}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          p.statutValidation === 'valide'
                            ? 'bg-green-100 text-green-700'
                            : p.statutValidation === 'en_attente'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.statutValidation}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip label="Modifier">
                          <button
                            onClick={() => navigate(`/boutique/produits/${p.id}/modifier`)}
                            className="p-1.5 rounded hover:bg-yellow-50 text-gray-500 hover:text-yellow-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </Tooltip>
                        <Tooltip label="Supprimer">
                          <button
                            onClick={async () => {
                              const confirme = await showConfirm({
                                titre: 'Supprimer le produit',
                                message: `Êtes-vous sûr de vouloir supprimer « ${p.nom} » ? Cette action est irréversible.`,
                                confirmText: 'Supprimer',
                                danger: true,
                              });
                              if (confirme) supprimerMutation.mutate(p.id);
                            }}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </Tooltip>
                        <Tooltip label="Promo du moment">
                          <button
                            onClick={() => openPromo(p, 'nos_promos_du_moment')}
                            className="p-1.5 rounded hover:bg-orange-50 text-gray-500 hover:text-orange-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </button>
                        </Tooltip>
                        <Tooltip label="À ne pas rater">
                          <button
                            onClick={() => openPromo(p, 'a_ne_pas_rater')}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                            </svg>
                          </button>
                        </Tooltip>
                        <Tooltip label="Promo à venir">
                          <button
                            onClick={() => openPromo(p, 'nos_promos_a_venir')}
                            className="p-1.5 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
                {produits.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      Aucun produit trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
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

      {/* Modal Promotion */}
      {promoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPromoModal(null)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-1">
              {SECTIONS[promoModal.section].title}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{promoModal.produit.nom}</p>
            <form onSubmit={handlePromoSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Prix actuel</label>
                <input
                  readOnly
                  value={`${prixActuel.toLocaleString('fr-FR')} FCFA`}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Réduction (%)</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="99"
                  value={pct}
                  onChange={(e) => setPct(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  placeholder="Ex: 20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Prix promotionnel</label>
                <input
                  readOnly
                  value={pct ? `${prixPromo.toLocaleString('fr-FR')} FCFA` : '—'}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Date début</label>
                  <input
                    required
                    type="datetime-local"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date fin</label>
                  <input
                    required
                    type="datetime-local"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPromoModal(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={promoMutation.isPending}
                  className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60"
                >
                  Valider la promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
