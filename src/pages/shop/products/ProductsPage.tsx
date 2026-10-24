import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import AdminBackButton from '@/shared/components/AdminBackButton';
import Icon from '@/shared/components/dashboard/Icon';
import BadgeStock from '@/shared/components/dashboard/BadgeStock';
import { etatRetour } from '@/shared/hooks/useRetour';
import { lirePage, useParametresUrl } from '@/shared/hooks/useParametresUrl';
import { useOuvrirLigne } from '@/shared/hooks/useOuvrirLigne';
import StockModal, { type ProduitStock } from './components/StockModal';
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
import {
  CLASSE_ETAT_PRODUIT,
  ETATS_PRODUIT,
  LIBELLE_ETAT_PRODUIT,
  estEtatProduit,
  libelleEtat,
  type EtatProduit,
} from '@/domains/shop/etatProduit';
import { LIBELLE_NIVEAU_STOCK, type NiveauStock } from '@/domains/shop/types/indicateurs';

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

const LIBELLE_STATUT_VALIDATION: Record<string, string> = {
  en_attente: 'En attente',
  valide_step1: 'En cours de validation',
  valide: 'Publié',
  rejete: 'Rejeté',
};

const OPTIONS_STATUT_VALIDATION = Object.entries(LIBELLE_STATUT_VALIDATION).map(([valeur, libelle]) => ({
  valeur,
  libelle,
}));

const OPTIONS_ETAT = [
  ...ETATS_PRODUIT.map((e) => ({ valeur: e, libelle: LIBELLE_ETAT_PRODUIT[e] })),
  { valeur: 'non_precise', libelle: 'Non précisé' },
];

const OPTIONS_VISIBILITE = [
  { valeur: 'visible', libelle: 'En vente (visible)' },
  { valeur: 'masque', libelle: 'Masqué' },
] as const;

const OPTIONS_MIS_EN_AVANT = [
  { valeur: 'oui', libelle: 'Mis en avant' },
  { valeur: 'non', libelle: 'Non mis en avant' },
] as const;

const OPTIONS_STOCK = (Object.keys(LIBELLE_NIVEAU_STOCK) as NiveauStock[]).map((n) => ({
  valeur: n,
  libelle: LIBELLE_NIVEAU_STOCK[n],
}));

/**
 * Niveau de stock d'un produit : celui calculé par le backend, sinon déduit
 * du seul stock (0 = rupture) pour que le filtre fonctionne sans indicateurs.
 */
const niveauStock = (p: any): string =>
  p.indicateurs?.niveauStock ?? (Number(p.stock ?? 0) <= 0 ? 'rupture' : 'normal');

const nomVendeur = (p: any) =>
  p.vendeur?.profilVendeur?.nomBoutique ||
  [p.vendeur?.prenom, p.vendeur?.nom].filter(Boolean).join(' ') ||
  '';

/** Colonnes du fichier Excel des produits. */
const COLONNES_EXPORT: ColonneExport<any>[] = [
  { titre: 'Nom', valeur: (p) => p.nom, largeur: 32 },
  { titre: 'Référence', valeur: (p) => p.reference, largeur: 14 },
  { titre: 'Rayon', valeur: (p) => p.rayon?.nom, largeur: 18 },
  { titre: 'Sous-rayon', valeur: (p) => p.sousRayon?.nom, largeur: 18 },
  { titre: 'Vendeur', valeur: nomVendeur, largeur: 22 },
  { titre: 'Prix (FCFA)', valeur: (p) => enNombre(p.prix), montant: true, largeur: 13 },
  { titre: 'Prix promo (FCFA)', valeur: (p) => enNombre(p.prixPromo), montant: true, largeur: 13 },
  { titre: 'Vendu au poids', valeur: (p) => !!p.venduAuPoids, largeur: 10 },
  { titre: "Prix d'achat (FCFA)", valeur: (p) => enNombre(p.prixAchat), montant: true, largeur: 13 },
  { titre: 'Marge unitaire (FCFA)', valeur: (p) => enNombre(p.indicateurs?.margeUnitaire), montant: true, largeur: 13 },
  { titre: 'Taux de marge (%)', valeur: (p) => enNombre(p.indicateurs?.tauxMarge), largeur: 10 },
  { titre: 'Marge brute (FCFA)', valeur: (p) => enNombre(p.indicateurs?.margeBrute), montant: true, largeur: 13 },
  { titre: 'Quantité vendue', valeur: (p) => enNombre(p.indicateurs?.quantiteVendue) ?? 0, largeur: 10 },
  { titre: "Chiffre d'affaires (FCFA)", valeur: (p) => enNombre(p.indicateurs?.chiffreAffaires) ?? 0, montant: true, largeur: 15 },
  { titre: 'Stock', valeur: (p) => enNombre(p.stock) ?? 0, largeur: 8 },
  { titre: 'Niveau de stock', valeur: (p) => LIBELLE_NIVEAU_STOCK[niveauStock(p) as NiveauStock], largeur: 16 },
  { titre: 'Couverture (jours)', valeur: (p) => enNombre(p.indicateurs?.joursCouverture), largeur: 10 },
  { titre: 'Taux de retour (%)', valeur: (p) => enNombre(p.indicateurs?.tauxRetour), largeur: 10 },
  { titre: 'État', valeur: (p) => libelleEtat(p.etat) || 'Non précisé', largeur: 13 },
  { titre: 'Statut', valeur: (p) => LIBELLE_STATUT_VALIDATION[p.statutValidation] ?? p.statutValidation, largeur: 16 },
  { titre: 'En vente', valeur: (p) => p.isActive !== false, largeur: 9 },
  { titre: 'Mis en avant', valeur: (p) => !!p.isFeatured, largeur: 10 },
  { titre: 'Créé le', valeur: (p) => enDate(p.createdAt), largeur: 17 },
];

/**
 * Infobulle au survol (souris uniquement : au doigt, `aria-label` et `title`
 * des boutons prennent le relais). Non rendue tant qu'on ne survole pas :
 * transparente ou invisible, elle occupait encore de la place et, en bout de
 * ligne, faisait apparaître un défilement horizontal parasite du tableau.
 */
function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 hidden group-hover:block whitespace-nowrap pointer-events-none z-10">
        {label}
      </span>
    </div>
  );
}

export default function ProductsPage() {
  const ouvrir = useOuvrirLigne();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  // Recherche, page et rayon (lien « Voir les produits » de la page Rayons)
  // vivent dans l'URL : ils survivent à l'aller-retour vers la modification.
  // Recherche et rayon sont filtrés par le serveur ; les autres critères le
  // sont dans le navigateur (et transmis au serveur quand la route les
  // connaît, ce qui allège le chargement sans changer le résultat).
  const [filtres, setFiltres] = useParametresUrl({
    q: '',
    page: '1',
    rayonId: '',
    sousRayonId: '',
    statut: '',
    etat: '',
    visibilite: '',
    enAvant: '',
    stock: '',
    prixMin: '',
    prixMax: '',
    creeDu: '',
    creeAu: '',
  });
  const search = filtres.q;
  const page = lirePage(filtres.page);
  const filterRayonId = filtres.rayonId;
  const filtresLocaux = [
    filtres.sousRayonId,
    filtres.statut,
    filtres.etat,
    filtres.visibilite,
    filtres.enAvant,
    filtres.stock,
    filtres.prixMin,
    filtres.prixMax,
    filtres.creeDu,
    filtres.creeAu,
  ];
  const nbActifs = [filterRayonId, ...filtresLocaux].filter(Boolean).length;
  const [promoModal, setPromoModal] = useState<{ produit: any; section: Section } | null>(null);
  const [stockModal, setStockModal] = useState<ProduitStock | null>(null);
  const [pct, setPct] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const { data: rayonsData } = useQuery({
    queryKey: ['rayons-select'],
    queryFn: () =>
      shopClient
        .get('/admin/rayons', { params: { actif: true, limit: 100 } })
        .then((r: any) => r.rayons ?? []),
    staleTime: 5 * 60_000,
  });
  const { data: sousRayonsData } = useQuery({
    queryKey: ['sous-rayons-select', filterRayonId],
    queryFn: () =>
      shopClient
        .get(`/admin/rayons/${filterRayonId}/sous-rayons`)
        .then((r: any) => r.sousRayons ?? []),
    enabled: !!filterRayonId,
    staleTime: 5 * 60_000,
  });
  const optionsRayons = ((rayonsData as any[]) ?? []).map((r: any) => ({ valeur: r.id, libelle: r.nom }));
  const optionsSousRayons = ((sousRayonsData as any[]) ?? []).map((r: any) => ({ valeur: r.id, libelle: r.nom }));

  const paramsServeur = {
    search,
    rayonId: filterRayonId || undefined,
    sousRayonId: filtres.sousRayonId || undefined,
    statutValidation: filtres.statut || undefined,
    isActive: filtres.visibilite ? filtres.visibilite === 'visible' : undefined,
    isFeatured: filtres.enAvant ? filtres.enAvant === 'oui' : undefined,
  };

  const liste = useListeFiltree<any>({
    cle: ['admin-produits', paramsServeur],
    chargerPage: async (p, limit) => {
      const r: any = await api.getProduits({ ...paramsServeur, page: p, limit });
      return { lignes: r?.produits ?? [], totalPages: r?.pagination?.totalPages ?? 1, total: r?.pagination?.total };
    },
    page,
    parPage: 20,
    filtresLocauxActifs: filtresLocaux.some(Boolean),
    filtreLocal: (p) =>
      (!filtres.sousRayonId || (p.sousRayonId ?? p.sousRayon?.id) === filtres.sousRayonId) &&
      (!filtres.statut || p.statutValidation === filtres.statut) &&
      (!filtres.etat ||
        (filtres.etat === 'non_precise' ? !estEtatProduit(p.etat) : p.etat === filtres.etat)) &&
      (!filtres.visibilite || (p.isActive !== false) === (filtres.visibilite === 'visible')) &&
      (!filtres.enAvant || !!p.isFeatured === (filtres.enAvant === 'oui')) &&
      (!filtres.stock || niveauStock(p) === filtres.stock) &&
      dansIntervalle(p.prix, filtres.prixMin, filtres.prixMax) &&
      dansPeriode(p.createdAt, filtres.creeDu, filtres.creeAu),
  });
  const { isLoading, isError, error, refetch } = liste;

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

  const produits = liste.lignes;
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
      {/* Liste filtrée depuis la page Rayons : retour possible vers celle-ci. */}
      {filterRayonId && <AdminBackButton parent="/boutique/rayons" className="mb-3" />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Produits</h1>
        <button
          onClick={() => navigate('/boutique/produits/nouveau', { state: etatRetour(location) })}
          className="w-full sm:w-auto bg-yellow-500 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
        >
          + Nouveau produit
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <BarreFiltres
          nbActifs={nbActifs}
          onReinitialiser={() =>
            setFiltres({
              rayonId: '',
              sousRayonId: '',
              statut: '',
              etat: '',
              visibilite: '',
              enAvant: '',
              stock: '',
              prixMin: '',
              prixMax: '',
              creeDu: '',
              creeAu: '',
              page: '1',
            })
          }
          recherche={
            <input
              value={search}
              onChange={(e) => setFiltres({ q: e.target.value, page: '1' })}
              placeholder="Rechercher un produit…"
              aria-label="Rechercher un produit"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
          }
          actions={
            <BoutonExportExcel
              charger={liste.chargerPourExport}
              nomFichier="produits"
              colonnes={COLONNES_EXPORT}
              filtres={{
                Recherche: search,
                Rayon: optionsRayons.find((o) => o.valeur === filterRayonId)?.libelle ?? filterRayonId,
                'Sous-rayon':
                  optionsSousRayons.find((o) => o.valeur === filtres.sousRayonId)?.libelle ?? filtres.sousRayonId,
                Statut: LIBELLE_STATUT_VALIDATION[filtres.statut],
                État: OPTIONS_ETAT.find((o) => o.valeur === filtres.etat)?.libelle,
                Visibilité: OPTIONS_VISIBILITE.find((o) => o.valeur === filtres.visibilite)?.libelle,
                'Mise en avant': OPTIONS_MIS_EN_AVANT.find((o) => o.valeur === filtres.enAvant)?.libelle,
                'Niveau de stock': LIBELLE_NIVEAU_STOCK[filtres.stock as NiveauStock],
                'Prix (FCFA)': libelleIntervalle(filtres.prixMin, filtres.prixMax),
                'Date de création': libellePeriode(filtres.creeDu, filtres.creeAu),
              }}
            />
          }
        >
          <FiltreSelect
            libelle="Rayon"
            valeur={filterRayonId}
            // Le sous-rayon retenu appartient à l'ancien rayon : on le vide.
            onChange={(v) => setFiltres({ rayonId: v, sousRayonId: '', page: '1' })}
            options={
              filterRayonId && !optionsRayons.some((o) => o.valeur === filterRayonId)
                ? [...optionsRayons, { valeur: filterRayonId, libelle: 'Rayon sélectionné' }]
                : optionsRayons
            }
          />
          <FiltreSelect
            libelle="Sous-rayon"
            valeur={filtres.sousRayonId}
            onChange={(v) => setFiltres({ sousRayonId: v, page: '1' })}
            tous={filterRayonId ? 'Tous' : "Choisir d'abord un rayon"}
            options={optionsSousRayons}
          />
          <FiltreSelect
            libelle="Statut de publication"
            valeur={filtres.statut}
            onChange={(v) => setFiltres({ statut: v, page: '1' })}
            options={OPTIONS_STATUT_VALIDATION}
          />
          <FiltreSelect
            libelle="État"
            valeur={filtres.etat}
            onChange={(v) => setFiltres({ etat: v, page: '1' })}
            options={OPTIONS_ETAT}
          />
          <FiltreSelect
            libelle="Visibilité"
            valeur={filtres.visibilite}
            onChange={(v) => setFiltres({ visibilite: v, page: '1' })}
            tous="Toutes"
            options={OPTIONS_VISIBILITE}
          />
          <FiltreSelect
            libelle="Mise en avant"
            valeur={filtres.enAvant}
            onChange={(v) => setFiltres({ enAvant: v, page: '1' })}
            options={OPTIONS_MIS_EN_AVANT}
          />
          <FiltreSelect
            libelle="Niveau de stock"
            valeur={filtres.stock}
            onChange={(v) => setFiltres({ stock: v, page: '1' })}
            options={OPTIONS_STOCK}
          />
          <FiltreIntervalle
            libelle="Prix (FCFA)"
            min={filtres.prixMin}
            max={filtres.prixMax}
            onChange={(prixMin, prixMax) => setFiltres({ prixMin, prixMax, page: '1' })}
          />
          <FiltrePeriode
            libelle="Date de création"
            du={filtres.creeDu}
            au={filtres.creeAu}
            onChange={(creeDu, creeAu) => setFiltres({ creeDu, creeAu, page: '1' })}
          />
        </BarreFiltres>
        {liste.tronque && (
          <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
            Seuls les 10 000 premiers produits ont été filtrés : affinez la recherche ou le rayon.
          </p>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : isError ? (
          <ErreurChargement erreur={error} onReessayer={() => refetch()} />
        ) : (
          <div className="tbl-wrap">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-4 font-medium text-gray-500">Produit</th>
                  <th className="p-4 font-medium text-gray-500 hidden xl:table-cell">Rayon</th>
                  <th className="p-4 font-medium text-gray-500">Prix</th>
                  {/* Colonnes d'analyse : masquées sous `lg`, où la largeur ne
                      permet pas de les lire sans écraser le reste. */}
                  <th className="p-4 font-medium text-gray-500 hidden lg:table-cell">Marge</th>
                  <th className="p-4 font-medium text-gray-500 hidden lg:table-cell text-center">
                    Vendus
                  </th>
                  <th className="p-4 font-medium text-gray-500 hidden xl:table-cell">CA</th>
                  <th className="p-4 font-medium text-gray-500">Stock</th>
                  <th className="p-4 font-medium text-gray-500 hidden lg:table-cell text-center">
                    Couverture
                  </th>
                  <th className="p-4 font-medium text-gray-500">Statut</th>
                  <th className="p-4 font-medium text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {produits.map((p: any) => (
                  <tr key={p.id} {...ouvrir(`/boutique/produits/${p.id}`)} className="border-b border-gray-50">
                    <td className="p-4 tbl-primary">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-100 shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                        )}
                        <span className="min-w-0">
                          {/* Le nom ouvre la fiche détaillée du produit. */}
                          <Link
                            to={`/boutique/produits/${p.id}`}
                            state={etatRetour(location)}
                            className="font-medium line-clamp-2 hover:underline"
                          >
                            {p.nom}
                          </Link>
                          {estEtatProduit(p.etat) && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-xs align-middle ${CLASSE_ETAT_PRODUIT[p.etat as EtatProduit]}`}
                            >
                              {LIBELLE_ETAT_PRODUIT[p.etat as EtatProduit]}
                            </span>
                          )}
                          {/* Sous 1280 px, la colonne Rayon est masquée : on
                              rappelle l'information sous le nom. */}
                          <span className="hidden md:block xl:hidden text-xs text-gray-400">
                            {p.rayon?.nom || '—'}
                            {p.sousRayon ? ` / ${p.sousRayon.nom}` : ''}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-500 hidden xl:table-cell" data-label="Rayon">
                      {p.rayon?.nom || '—'}
                      {p.sousRayon ? ` / ${p.sousRayon.nom}` : ''}
                    </td>
                    <td className="p-4 font-medium whitespace-nowrap" data-label="Prix">
                      {p.prix?.toLocaleString('fr-FR')} FCFA
                      {p.venduAuPoids ? ' / kg' : ''}
                      {p.prixAchat != null && (
                        <span className="block text-xs font-normal text-gray-400">
                          achat {Number(p.prixAchat).toLocaleString('fr-FR')}
                        </span>
                      )}
                    </td>
                    <td
                      className="p-4 whitespace-nowrap hidden lg:table-cell"
                      data-label="Marge"
                      title={
                        p.indicateurs?.margeBrute == null
                          ? "Renseignez le prix d'achat pour obtenir la marge"
                          : `Marge brute cumulée sur ${p.indicateurs.quantiteVendue} vente(s)`
                      }
                    >
                      {/* Prix d'achat absent : on le dit, plutôt que d'afficher
                          un 0 qui se lirait comme une marge nulle. */}
                      {p.indicateurs?.margeUnitaire == null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <>
                          <span className="font-medium text-gray-900">
                            {Number(p.indicateurs.margeUnitaire).toLocaleString('fr-FR')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {' '}
                            ({p.indicateurs.tauxMarge}%)
                          </span>
                          {!!p.indicateurs.margeBrute && (
                            <span className="block text-xs text-gray-400">
                              brute {Number(p.indicateurs.margeBrute).toLocaleString('fr-FR')}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="p-4 text-center hidden lg:table-cell" data-label="Vendus">
                      <span className="font-medium text-gray-900">
                        {p.indicateurs?.quantiteVendue ?? 0}
                      </span>
                      {!!p.indicateurs?.nombreRetours && (
                        <span
                          className="block text-xs text-orange-500"
                          title={`${p.indicateurs.quantiteRetournee} article(s) retourné(s)`}
                        >
                          {p.indicateurs.tauxRetour}% retour
                        </span>
                      )}
                    </td>
                    <td
                      className="p-4 whitespace-nowrap hidden xl:table-cell text-gray-700"
                      data-label="CA"
                    >
                      {Number(p.indicateurs?.chiffreAffaires ?? 0).toLocaleString('fr-FR')}
                    </td>
                    <td className="p-4 text-center" data-label="Stock">
                      {p.indicateurs?.niveauStock ? (
                        <BadgeStock niveau={p.indicateurs.niveauStock} stock={p.stock} compact />
                      ) : (
                        p.stock
                      )}
                    </td>
                    <td
                      className="p-4 text-center hidden lg:table-cell"
                      data-label="Couverture"
                      title={
                        p.indicateurs?.joursCouverture == null
                          ? 'Aucune vente sur la fenêtre : rythme d’écoulement inconnu'
                          : `Au rythme des ${p.indicateurs.fenetreCouvertureJours} derniers jours`
                      }
                    >
                      {p.indicateurs?.joursCouverture == null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span
                          className={
                            p.indicateurs.joursCouverture <= 7
                              ? 'font-semibold text-red-600'
                              : p.indicateurs.joursCouverture <= 21
                                ? 'font-medium text-orange-600'
                                : 'text-gray-700'
                          }
                        >
                          {p.indicateurs.joursCouverture} j
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center" data-label="Statut">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          p.statutValidation === 'valide'
                            ? 'bg-green-100 text-green-700'
                            : p.statutValidation === 'en_attente'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {LIBELLE_STATUT_VALIDATION[p.statutValidation] ?? p.statutValidation}
                      </span>
                    </td>
                    <td className="p-4 tbl-actions" data-label="Actions">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip label="Voir les détails">
                          <button
                            onClick={() =>
                              navigate(`/boutique/produits/${p.id}`, { state: etatRetour(location) })
                            }
                            aria-label="Voir les détails"
                            className="btn-icon hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                          >
                            <Icon name="eye" size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Modifier le stock">
                          <button
                            onClick={() => setStockModal(p)}
                            aria-label="Modifier le stock"
                            className="btn-icon hover:bg-yellow-50 text-gray-500 hover:text-yellow-600"
                          >
                            <Icon name="package" size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Modifier">
                          <button
                            onClick={() => navigate(`/boutique/produits/${p.id}/modifier`, { state: etatRetour(location) })}
                            aria-label="Modifier"
                            className="btn-icon hover:bg-yellow-50 text-gray-500 hover:text-yellow-600"
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
                            aria-label="Supprimer"
                            className="btn-icon hover:bg-red-50 text-gray-500 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </Tooltip>
                        <Tooltip label="Promo du moment">
                          <button
                            onClick={() => openPromo(p, 'nos_promos_du_moment')}
                            aria-label="Promo du moment"
                            className="btn-icon hover:bg-orange-50 text-gray-500 hover:text-orange-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </button>
                        </Tooltip>
                        <Tooltip label="À ne pas rater">
                          <button
                            onClick={() => openPromo(p, 'a_ne_pas_rater')}
                            aria-label="À ne pas rater"
                            className="btn-icon hover:bg-red-50 text-gray-500 hover:text-red-500"
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
                            aria-label="Promo à venir"
                            className="btn-icon hover:bg-blue-50 text-gray-500 hover:text-blue-500"
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
                    <td colSpan={10} className="p-8 text-center text-gray-400 tbl-empty">
                      Aucun produit trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={liste.totalPages} onChange={(p) => setFiltres({ page: String(p) })} />
      </div>

      {/* Ajustement de stock — la liste se rafraîchit via l'invalidation de
          la query « admin-produits » faite par la modale elle-même. */}
      {stockModal && <StockModal produit={stockModal} onFermer={() => setStockModal(null)} />}

      {/* Modal Promotion */}
      {promoModal && (
        <div
          className="modal-overlay"
          onClick={() => setPromoModal(null)}
          role="dialog"
          aria-modal="true"
          aria-label={SECTIONS[promoModal.section].title}
        >
          <div
            className="modal-box max-w-md p-5 sm:p-6"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPromoModal(null)}
                  className="px-4 py-2.5 sm:py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={promoMutation.isPending}
                  className="px-4 py-2.5 sm:py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60"
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
