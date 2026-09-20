import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';
import DemandeDetailModal from './DemandeDetailModal';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';

/** Les demandes en cours d'instruction restent visibles jusqu'à publication. */
const STATUTS = [
  { cle: 'en_attente', libelle: 'En attente' },
  { cle: 'valide_step1', libelle: 'En cours de validation' },
  { cle: 'rejete', libelle: 'Rejetées' },
  { cle: 'valide', libelle: 'Publiées' },
] as const;

const api = {
  getDemandes: (p: any) => shopClient.get('/admin/produits', { params: p }),
};

const formaterPrix = (v: any) => Number(v ?? 0).toLocaleString('fr-FR');

export default function DemandesPage() {
  const qc = useQueryClient();
  const [statut, setStatut] = useState<string>('en_attente');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [demandeOuverte, setDemandeOuverte] = useState<any>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['demandes', statut, search, page],
    queryFn: () => api.getDemandes({ statutValidation: statut, search, page, limit: 20 }),
  });

  const produits: any[] = (data as any)?.produits ?? [];
  const pagination = (data as any)?.pagination;

  const rafraichir = () => qc.invalidateQueries({ queryKey: ['demandes'] });

  const nomVendeur = (p: any) =>
    p.vendeur?.profilVendeur?.nomBoutique ||
    [p.vendeur?.prenom, p.vendeur?.nom].filter(Boolean).join(' ') ||
    '—';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Demandes de publication</h1>
        <p className="text-sm text-gray-500 mt-1">
          Produits soumis par les vendeurs depuis l'application.
        </p>
      </div>

      {/* Filtre par statut */}
      <div className="flex flex-wrap gap-2 mb-5">
        {STATUTS.map((s) => (
          <button
            key={s.cle}
            onClick={() => {
              setStatut(s.cle);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statut === s.cle
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {s.libelle}
          </button>
        ))}
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
            aria-label="Rechercher un produit"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : isError ? (
          <ErreurChargement erreur={error} onReessayer={() => refetch()} />
        ) : produits.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            Aucune demande dans cette catégorie.
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-4 font-medium text-gray-500">Produit</th>
                  <th className="p-4 font-medium text-gray-500">Vendeur</th>
                  <th className="p-4 font-medium text-gray-500">Prix</th>
                  <th className="p-4 font-medium text-gray-500">Stock</th>
                  <th className="p-4 font-medium text-gray-500">Soumise le</th>
                  <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {produits.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setDemandeOuverte(p)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="p-4 tbl-primary">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.images?.[0] ? (
                          <span className="relative shrink-0">
                            <img
                              src={p.images[0]}
                              className="w-10 h-10 rounded-lg object-cover"
                              alt=""
                            />
                            {p.images.length > 1 && (
                              <span className="absolute -bottom-1 -right-1 text-[10px] font-semibold bg-gray-900 text-white rounded-full px-1.5">
                                {p.images.length}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                            <Icon name="image" size={16} className="text-gray-300" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block font-medium text-gray-900 line-clamp-2">
                            {p.nom}
                          </span>
                          {p.messageVendeur && (
                            <span className="block text-xs text-blue-600 truncate">
                              Message joint
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600" data-label="Vendeur">{nomVendeur(p)}</td>
                    <td className="p-4 whitespace-nowrap" data-label="Prix">{formaterPrix(p.prix)} FCFA</td>
                    <td className="p-4 text-gray-600" data-label="Stock">{p.stock ?? 0}</td>
                    <td className="p-4 text-gray-500" data-label="Soumise le">
                      {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-4 text-right tbl-actions" data-label="Actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDemandeOuverte(p);
                        }}
                        className="px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                      >
                        Consulter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={pagination?.totalPages ?? 1} onChange={setPage} />
      </div>

      {demandeOuverte && (
        <DemandeDetailModal
          demande={demandeOuverte}
          onFermer={() => setDemandeOuverte(null)}
          onTraitee={rafraichir}
        />
      )}
    </div>
  );
}
