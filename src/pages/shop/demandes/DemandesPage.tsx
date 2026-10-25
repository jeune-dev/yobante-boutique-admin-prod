import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { vendeursApi } from '@/domains/shop/api/vendeurs.api';
import { lirePage, useParametresUrl } from '@/shared/hooks/useParametresUrl';
import { useListeFiltree } from '@/shared/hooks/useListeFiltree';
import {
  BarreFiltres,
  BoutonExportExcel,
  FiltreIntervalle,
  FiltrePeriode,
  FiltreSelect,
} from '@/shared/components/filtres/BarreFiltres';
import { dansIntervalle, dansPeriode, libelleIntervalle, libellePeriode } from '@/shared/utils/filtres';
import { enDate, enNombre, type ColonneExport } from '@/shared/utils/exportExcel';
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

const nomVendeur = (p: any) =>
  p.vendeur?.profilVendeur?.nomBoutique ||
  [p.vendeur?.prenom, p.vendeur?.nom].filter(Boolean).join(' ') ||
  '—';

const OPTIONS_MESSAGE = [
  { valeur: 'avec', libelle: 'Avec message du vendeur' },
  { valeur: 'sans', libelle: 'Sans message' },
] as const;

/** Colonnes du fichier Excel des demandes de publication. */
const COLONNES_EXPORT: ColonneExport<any>[] = [
  { titre: 'Produit', valeur: (p) => p.nom, largeur: 32 },
  { titre: 'Boutique', valeur: (p) => p.vendeur?.profilVendeur?.nomBoutique, largeur: 22 },
  { titre: 'Vendeur', valeur: (p) => [p.vendeur?.prenom, p.vendeur?.nom].filter(Boolean).join(' '), largeur: 22 },
  { titre: 'Email vendeur', valeur: (p) => p.vendeur?.email, largeur: 28 },
  { titre: 'Téléphone vendeur', valeur: (p) => p.vendeur?.telephone, largeur: 17 },
  { titre: 'Prix (FCFA)', valeur: (p) => enNombre(p.prix), montant: true, largeur: 13 },
  { titre: 'Stock souhaité', valeur: (p) => enNombre(p.stockAlloue), largeur: 10 },
  { titre: 'Stock', valeur: (p) => enNombre(p.stock) ?? 0, largeur: 8 },
  { titre: 'Statut', valeur: (p) => STATUTS.find((s) => s.cle === p.statutValidation)?.libelle ?? p.statutValidation, largeur: 20 },
  { titre: 'Motif du rejet', valeur: (p) => p.motifRejet, largeur: 34 },
  { titre: 'Message du vendeur', valeur: (p) => p.messageVendeur, largeur: 40 },
  { titre: 'Photos', valeur: (p) => (Array.isArray(p.images) ? p.images.length : 0), largeur: 8 },
  { titre: 'Soumise le', valeur: (p) => enDate(p.createdAt), largeur: 17 },
  { titre: 'Mise à jour le', valeur: (p) => enDate(p.updatedAt), largeur: 17 },
];

export default function DemandesPage() {
  const qc = useQueryClient();
  // Statut et recherche sont filtrés par le serveur ; vendeur, période,
  // prix et message le sont dans le navigateur. Tout vit dans l'URL.
  const [filtres, setFiltres] = useParametresUrl({
    statut: 'en_attente',
    q: '',
    page: '1',
    vendeur: '',
    du: '',
    au: '',
    prixMin: '',
    prixMax: '',
    message: '',
  });
  const statut = STATUTS.some((s) => s.cle === filtres.statut) ? filtres.statut : 'en_attente';
  const search = filtres.q;
  const page = lirePage(filtres.page);
  const [demandeOuverte, setDemandeOuverte] = useState<any>(null);

  const filtresLocaux = [filtres.vendeur, filtres.du, filtres.au, filtres.prixMin, filtres.prixMax, filtres.message];
  const nbActifs = filtresLocaux.filter(Boolean).length;

  const { data: vendeursData } = useQuery({
    queryKey: ['vendeurs', 'options-filtre'],
    queryFn: () => vendeursApi.lister({ limit: 100 }),
    staleTime: 5 * 60_000,
  });
  const optionsVendeurs = (vendeursData?.vendeurs ?? []).map((v) => ({
    valeur: v.id,
    libelle: v.nomBoutique || v.boutique?.nom || [v.prenom, v.nom].filter(Boolean).join(' ') || v.email || v.id,
  }));

  const liste = useListeFiltree<any>({
    cle: ['demandes', { statut, search }],
    chargerPage: async (p, limit) => {
      const r: any = await api.getDemandes({ statutValidation: statut, search, page: p, limit });
      return { lignes: r?.produits ?? [], totalPages: r?.pagination?.totalPages ?? 1, total: r?.pagination?.total };
    },
    page,
    parPage: 20,
    filtresLocauxActifs: filtresLocaux.some(Boolean),
    filtreLocal: (p) =>
      (!filtres.vendeur || (p.vendeurId ?? p.vendeur?.id) === filtres.vendeur) &&
      dansPeriode(p.createdAt, filtres.du, filtres.au) &&
      dansIntervalle(p.prix, filtres.prixMin, filtres.prixMax) &&
      (!filtres.message || !!String(p.messageVendeur ?? '').trim() === (filtres.message === 'avec')),
  });
  const { isLoading, isError, error, refetch } = liste;

  const produits: any[] = liste.lignes;

  const rafraichir = () => qc.invalidateQueries({ queryKey: ['demandes'] });

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
            onClick={() => setFiltres({ statut: s.cle, page: '1' })}
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <BarreFiltres
          nbActifs={nbActifs}
          onReinitialiser={() =>
            setFiltres({ vendeur: '', du: '', au: '', prixMin: '', prixMax: '', message: '', page: '1' })
          }
          recherche={
            <input
              value={search}
              onChange={(e) => setFiltres({ q: e.target.value, page: '1' })}
              placeholder="Rechercher un produit…"
              aria-label="Rechercher un produit"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
          }
          actions={
            <BoutonExportExcel
              charger={liste.chargerPourExport}
              nomFichier={`demandes-publication_${statut}`}
              colonnes={COLONNES_EXPORT}
              filtres={{
                Statut: STATUTS.find((s) => s.cle === statut)?.libelle,
                Recherche: search,
                Vendeur: optionsVendeurs.find((o) => o.valeur === filtres.vendeur)?.libelle ?? filtres.vendeur,
                'Date de soumission': libellePeriode(filtres.du, filtres.au),
                'Prix (FCFA)': libelleIntervalle(filtres.prixMin, filtres.prixMax),
                Message: OPTIONS_MESSAGE.find((o) => o.valeur === filtres.message)?.libelle,
              }}
            />
          }
        >
          <FiltreSelect
            libelle="Vendeur"
            valeur={filtres.vendeur}
            onChange={(v) => setFiltres({ vendeur: v, page: '1' })}
            tous="Tous les vendeurs"
            options={optionsVendeurs}
          />
          <FiltrePeriode
            libelle="Date de soumission"
            du={filtres.du}
            au={filtres.au}
            onChange={(du, au) => setFiltres({ du, au, page: '1' })}
          />
          <FiltreIntervalle
            libelle="Prix (FCFA)"
            min={filtres.prixMin}
            max={filtres.prixMax}
            onChange={(prixMin, prixMax) => setFiltres({ prixMin, prixMax, page: '1' })}
          />
          <FiltreSelect
            libelle="Message du vendeur"
            valeur={filtres.message}
            onChange={(v) => setFiltres({ message: v, page: '1' })}
            options={OPTIONS_MESSAGE}
          />
        </BarreFiltres>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : isError ? (
          <ErreurChargement erreur={error} onReessayer={() => refetch()} />
        ) : produits.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            {nbActifs > 0 ? 'Aucune demande ne correspond aux filtres.' : 'Aucune demande dans cette catégorie.'}
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
                              className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-100"
                              alt=""
                            />
                            {p.images.length > 1 && (
                              <span className="absolute -bottom-1 -right-1 text-xs font-semibold bg-gray-900 text-white rounded-full px-1.5">
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

        <Pagination page={page} totalPages={liste.totalPages} onChange={(p) => setFiltres({ page: String(p) })} />
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
