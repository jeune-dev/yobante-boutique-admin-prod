import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import AdminBackButton from '@/shared/components/AdminBackButton';
import Icon from '@/shared/components/dashboard/Icon';
import MenuActions from '@/shared/components/MenuActions';
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
import { EntetePage } from '@/shared/components/dashboard/Blocs';
import { montant } from '@/shared/utils/format';

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
      <EntetePage
        className="mb-6"
        titre="Produits"
        soustitre="Catalogue de la boutique : prix, stock, promotions et visibilité."
      >
        <button
          type="button"
          onClick={() => navigate('/boutique/produits/nouveau', { state: etatRetour(location) })}
          className="btn-primaire w-full sm:w-auto"
        >
          <Icon name="plus" size={16} />
          Nouveau produit
        </button>
      </EntetePage>

      <div className="carte">
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
              className="champ w-full sm:w-72"
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
                <tr className="text-left">
                  <th className="px-4">Produit</th>
                  <th className="px-4">Prix &amp; marge</th>
                  <th className="px-4 hidden lg:table-cell">Ventes</th>
                  <th className="px-4">Stock</th>
                  <th className="px-4">Statut</th>
                  <th className="px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {produits.map((p: any) => (
                  <tr key={p.id} {...ouvrir(`/boutique/produits/${p.id}`)} className="border-b border-gray-50 last:border-0">
                    {/* Nom, rayon et état regroupés : une colonne par
                        information écrasait le nom et repliait le rayon sur
                        quatre lignes. */}
                    <td className="px-4 tbl-primary min-w-[16rem]">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.images?.[0] ? (
                          <img
                            src={p.images[0]}
                            className="w-12 h-12 rounded-xl object-contain bg-white border border-gray-100 shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-300 flex items-center justify-center shrink-0">
                            <Icon name="image" size={18} />
                          </div>
                        )}
                        <div className="min-w-0">
                          {/* Le nom ouvre la fiche détaillée du produit. */}
                          <Link
                            to={`/boutique/produits/${p.id}`}
                            state={etatRetour(location)}
                            className="font-semibold text-gray-900 line-clamp-2 hover:underline"
                          >
                            {p.nom}
                          </Link>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-gray-500">
                            <span>
                              {p.rayon?.nom || 'Sans rayon'}
                              {p.sousRayon ? ` › ${p.sousRayon.nom}` : ''}
                            </span>
                            {estEtatProduit(p.etat) && (
                              <span
                                className={`badge inline-block ${CLASSE_ETAT_PRODUIT[p.etat as EtatProduit]}`}
                              >
                                {LIBELLE_ETAT_PRODUIT[p.etat as EtatProduit]}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-4 whitespace-nowrap"
                      data-label="Prix & marge"
                      title={
                        p.indicateurs?.margeBrute == null
                          ? "Renseignez le prix d'achat pour obtenir la marge"
                          : `Marge brute cumulée sur ${p.indicateurs.quantiteVendue} vente(s)`
                      }
                    >
                      <div className="text-right md:text-left">
                        <p className="font-semibold text-gray-900 tabular-nums">
                          {montant(p.prix)}
                          {p.venduAuPoids ? ' / kg' : ''}
                        </p>
                        {p.prixAchat != null && (
                          <p className="text-[13px] text-gray-500 tabular-nums">
                            achat {Number(p.prixAchat).toLocaleString('fr-FR')}
                          </p>
                        )}
                        {/* Prix d'achat absent : on le dit, plutôt que d'afficher
                            un 0 qui se lirait comme une marge nulle. */}
                        {p.indicateurs?.margeUnitaire == null ? (
                          <p className="text-[13px] text-gray-400">marge —</p>
                        ) : (
                          <p className="text-[13px] font-medium text-emerald-700 tabular-nums">
                            marge {Number(p.indicateurs.margeUnitaire).toLocaleString('fr-FR')} ({p.indicateurs.tauxMarge}%)
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 whitespace-nowrap hidden lg:table-cell" data-label="Ventes">
                      <div className="text-right md:text-left">
                        <p className="font-semibold text-gray-900 tabular-nums">
                          {p.indicateurs?.quantiteVendue ?? 0}{' '}
                          <span className="font-normal text-gray-500">vendu(s)</span>
                        </p>
                        <p className="text-[13px] text-gray-500 tabular-nums">
                          CA {Number(p.indicateurs?.chiffreAffaires ?? 0).toLocaleString('fr-FR')}
                        </p>
                        {!!p.indicateurs?.margeBrute && (
                          <p className="text-[13px] text-gray-500 tabular-nums">
                            brute {Number(p.indicateurs.margeBrute).toLocaleString('fr-FR')}
                          </p>
                        )}
                        {!!p.indicateurs?.nombreRetours && (
                          <p
                            className="text-[13px] text-orange-600"
                            title={`${p.indicateurs.quantiteRetournee} article(s) retourné(s)`}
                          >
                            {p.indicateurs.tauxRetour}% retour
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 whitespace-nowrap" data-label="Stock">
                      <div className="text-right md:text-left">
                        {p.indicateurs?.niveauStock ? (
                          <BadgeStock niveau={p.indicateurs.niveauStock} stock={p.stock} compact />
                        ) : (
                          <span className="font-semibold text-gray-900">{p.stock}</span>
                        )}
                        <p
                          className="mt-1 text-[13px]"
                          title={
                            p.indicateurs?.joursCouverture == null
                              ? 'Aucune vente sur la fenêtre : rythme d’écoulement inconnu'
                              : `Au rythme des ${p.indicateurs.fenetreCouvertureJours} derniers jours`
                          }
                        >
                          {p.indicateurs?.joursCouverture == null ? (
                            <span className="text-gray-400">couverture —</span>
                          ) : (
                            <span
                              className={
                                p.indicateurs.joursCouverture <= 7
                                  ? 'font-semibold text-red-600'
                                  : p.indicateurs.joursCouverture <= 21
                                    ? 'font-medium text-orange-600'
                                    : 'text-gray-500'
                              }
                            >
                              {p.indicateurs.joursCouverture} j de couverture
                            </span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="px-4" data-label="Statut">
                      <span
                        className={`badge inline-block ${
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
                    <td className="px-4 tbl-actions" data-label="Actions">
                      {/* Les actions courantes restent visibles ; promotions et
                          suppression passent dans le menu « ⋯ ». */}
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip label="Voir les détails">
                          <button
                            onClick={() =>
                              navigate(`/boutique/produits/${p.id}`, { state: etatRetour(location) })
                            }
                            aria-label="Voir les détails"
                            className="btn-icon hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                          >
                            <Icon name="eye" size={17} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Modifier le stock">
                          <button
                            onClick={() => setStockModal(p)}
                            aria-label="Modifier le stock"
                            className="btn-icon hover:bg-yellow-50 text-gray-500 hover:text-yellow-600"
                          >
                            <Icon name="package" size={17} />
                          </button>
                        </Tooltip>
                        <Tooltip label="Modifier">
                          <button
                            onClick={() => navigate(`/boutique/produits/${p.id}/modifier`, { state: etatRetour(location) })}
                            aria-label="Modifier"
                            className="btn-icon hover:bg-yellow-50 text-gray-500 hover:text-yellow-600"
                          >
                            <Icon name="pencil" size={17} />
                          </button>
                        </Tooltip>
                        <MenuActions
                          actions={[
                            { libelle: 'Promo du moment', icone: 'zap', onClick: () => openPromo(p, 'nos_promos_du_moment') },
                            { libelle: 'À ne pas rater', icone: 'flame', onClick: () => openPromo(p, 'a_ne_pas_rater') },
                            { libelle: 'Promo à venir', icone: 'calendar', onClick: () => openPromo(p, 'nos_promos_a_venir') },
                            {
                              libelle: 'Supprimer',
                              icone: 'trash',
                              danger: true,
                              onClick: async () => {
                                const confirme = await showConfirm({
                                  titre: 'Supprimer le produit',
                                  message: `Êtes-vous sûr de vouloir supprimer « ${p.nom} » ? Cette action est irréversible.`,
                                  confirmText: 'Supprimer',
                                  danger: true,
                                });
                                if (confirme) supprimerMutation.mutate(p.id);
                              },
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {produits.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 tbl-empty">
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
            <h2 className="text-lg font-semibold mb-1 text-gray-900">
              {SECTIONS[promoModal.section].title}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{promoModal.produit.nom}</p>
            <form onSubmit={handlePromoSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Prix actuel</label>
                <input
                  readOnly
                  value={montant(prixActuel)}
                  className="champ mt-1 w-full cursor-not-allowed bg-gray-50 text-gray-500"
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
                  className="champ mt-1 w-full"
                  placeholder="Ex: 20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Prix promotionnel</label>
                <input
                  readOnly
                  value={pct ? montant(prixPromo) : '—'}
                  className="champ mt-1 w-full cursor-not-allowed bg-gray-50 text-gray-500"
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
                    className="champ mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date fin</label>
                  <input
                    required
                    type="datetime-local"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="champ mt-1 w-full"
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
                  className="btn-primaire sm:py-2"
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
