import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import Pagination from '@/shared/components/tables/Pagination';
import {
  Bloc,
  BoutonActualiser,
  Chiffre,
  EntetePage,
  Pastille,
  Squelette,
  Vide,
} from '@/shared/components/dashboard/Blocs';
import { useIndicateursStock } from '@/domains/shop/hooks/useAnalytique';
import { date, decimal, fcfa, nombre, pourcent } from '@/shared/utils/format';
import type { ProduitStock } from '@/domains/shop/types/analytique';

/** Les vues du stock, chacune répondant à une décision différente. */
type Vue = 'tout' | 'rupture' | 'alerte' | 'surstock' | 'sans-prix';

const VUES: Array<{ cle: Vue; libelle: string; aide: string }> = [
  { cle: 'tout', libelle: 'Tous', aide: 'Tout le catalogue actif' },
  { cle: 'alerte', libelle: 'Sous seuil', aide: 'Moins de deux semaines de ventes en stock' },
  { cle: 'surstock', libelle: 'Surstock', aide: 'Plus de deux mois d’écoulement immobilisés' },
  { cle: 'sans-prix', libelle: 'Sans prix d’achat', aide: 'Marge et valeur de stock incalculables' },
];

const PAR_PAGE = 25;

type Tri = 'couverture' | 'stock' | 'valeur' | 'ventes' | 'nom';

/**
 * Stocks : couverture, rotation et valeur.
 *
 * Une seule requête sert les cinq vues : le backend renvoie tout le catalogue
 * actif avec ses indicateurs calculés, et le tri comme le filtrage se font
 * ici. Cinq appels successifs auraient rechargé les mêmes lignes à chaque
 * changement d'onglet.
 */
export default function StockPage() {
  // La vue est dans l'URL : l'alerte « produits en rupture » du dashboard
  // amène directement sur le bon onglet, et le lien reste partageable.
  const [params, setParams] = useSearchParams();
  // Vue inconnue (ancien lien « ?vue=rupture ») : retour à la vue complète.
  const demandee = params.get('vue') as Vue | null;
  const vue: Vue = VUES.some((v) => v.cle === demandee) ? (demandee as Vue) : 'tout';
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState<Tri>('couverture');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch, isFetching } = useIndicateursStock();

  const synthese = data?.synthese;
  const fenetre = data?.fenetreJours ?? 21;

  const filtres = useMemo(() => {
    // Le tableau par défaut est construit ici et non au-dessus : un `?? []`
    // hors du useMemo crée une référence neuve à chaque rendu et relance le
    // calcul sur tout le catalogue à chaque frappe dans la recherche.
    const tous: ProduitStock[] = data?.produits ?? [];

    const parVue: Record<Vue, (p: ProduitStock) => boolean> = {
      tout: () => true,
      rupture: (p) => p.enRupture,
      alerte: (p) => p.sousSeuilVentes,
      surstock: (p) => p.rotationFaible,
      'sans-prix': (p) => p.prixAchat === null,
    };

    const q = recherche.trim().toLowerCase();
    const liste = tous.filter(
      (p) => parVue[vue](p) && (!q || p.nom.toLowerCase().includes(q) || p.rayon.toLowerCase().includes(q))
    );

    const CLES: Record<Tri, (a: ProduitStock, b: ProduitStock) => number> = {
      // `null` = le stock ne s'épuise pas : ces produits passent en dernier,
      // sinon ils occuperaient le haut de la liste la plus urgente.
      couverture: (a, b) => (a.joursCouverture ?? Infinity) - (b.joursCouverture ?? Infinity),
      stock: (a, b) => a.stock - b.stock,
      valeur: (a, b) => (b.valeurStock ?? 0) - (a.valeurStock ?? 0),
      ventes: (a, b) => b.ventesMoyennesJour - a.ventesMoyennesJour,
      nom: (a, b) => a.nom.localeCompare(b.nom, 'fr'),
    };
    return [...liste].sort(CLES[tri]);
  }, [data, vue, recherche, tri]);

  const totalPages = Math.max(1, Math.ceil(filtres.length / PAR_PAGE));
  const pageSure = Math.min(page, totalPages);
  const visibles = filtres.slice((pageSure - 1) * PAR_PAGE, pageSure * PAR_PAGE);

  const changerVue = (v: Vue) => {
    setParams(v === 'tout' ? {} : { vue: v }, { replace: true });
    setPage(1);
  };

  if (isLoading) return <Squelette tuiles={4} />;

  if (isError) {
    return (
      <Bloc>
        <ErreurChargement
          erreur={error}
          onReessayer={refetch}
          defaut="Impossible de charger l'état des stocks."
        />
      </Bloc>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Stocks"
        soustitre={`${nombre(synthese?.produitsActifs)} produit(s) actif(s) · ventes moyennes mesurées sur ${fenetre} jours.`}
      >
        <BoutonActualiser onClick={() => refetch()} enCours={isFetching} />
      </EntetePage>

      {/* ── État général ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <Chiffre
          libelle="Valeur du stock"
          valeur={fcfa(synthese?.valeurStockAchat)}
          aide="À prix d'achat, produits actifs"
        />
        <Chiffre
          libelle="Taux de rupture"
          valeur={pourcent(synthese?.tauxRupture)}
          ton={
            (synthese?.tauxRupture ?? 0) >= 10
              ? 'critique'
              : (synthese?.tauxRupture ?? 0) >= 3
                ? 'attention'
                : 'bon'
          }
          aide="Produits à zéro ÷ produits actifs, à l'instant présent"
        />
        <Chiffre
          libelle="Sous seuil"
          valeur={nombre(synthese?.sousSeuilVentes)}
          ton={(synthese?.sousSeuilVentes ?? 0) > 0 ? 'attention' : 'bon'}
          aide="Moins de 14 jours de ventes observées en stock"
        />
        <Chiffre
          libelle="Surstock"
          valeur={nombre(synthese?.rotationFaible)}
          aide="Plus de 60 jours de couverture"
        />
      </div>

      <Bloc className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Pastille
            libelle="En rupture"
            valeur={nombre(synthese?.enRupture)}
            puce="⚫"
            teinte="bg-gray-800 text-white"
            aide="Stock à zéro : chaque jour est une vente perdue"
          />
          <Pastille
            libelle="Sous seuil"
            valeur={nombre(synthese?.sousSeuilVentes)}
            puce="🔴"
            teinte="bg-red-50 text-red-700"
            aide="À réapprovisionner sous quinze jours"
          />
          <Pastille
            libelle="Surstock"
            valeur={nombre(synthese?.rotationFaible)}
            puce="🟠"
            teinte="bg-orange-50 text-orange-700"
            aide="Trésorerie immobilisée"
          />
          <Pastille
            libelle="Sans prix d'achat"
            valeur={nombre(synthese?.produitsSansPrixAchat)}
            puce="🟡"
            teinte="bg-yellow-50 text-yellow-700"
            aide="Ni marge ni valeur de stock calculables"
          />
        </div>

      </Bloc>

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <Bloc className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap rounded-lg border border-gray-200 overflow-hidden">
            {VUES.map((v) => (
              <button
                key={v.cle}
                type="button"
                onClick={() => changerVue(v.cle)}
                aria-pressed={vue === v.cle}
                title={v.aide}
                className={`px-3 py-2 text-sm font-medium border-r border-gray-200 last:border-r-0 transition-colors ${
                  vue === v.cle ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v.libelle}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[160px]">
            <Icon
              name="search"
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                setPage(1);
              }}
              placeholder="Produit ou rayon…"
              aria-label="Rechercher un produit"
              className="w-full pl-8 pr-2.5 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>

          <select
            value={tri}
            onChange={(e) => setTri(e.target.value as Tri)}
            aria-label="Trier"
            className="px-2.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white"
          >
            <option value="couverture">Couverture la plus courte</option>
            <option value="stock">Stock le plus faible</option>
            <option value="valeur">Valeur la plus élevée</option>
            <option value="ventes">Ventes les plus fortes</option>
            <option value="nom">Nom</option>
          </select>
        </div>
      </Bloc>

      {/* ── Liste ────────────────────────────────────────────────────────── */}
      <Bloc>
        {visibles.length === 0 ? (
          <Vide
            texte={
              recherche
                ? 'Aucun produit ne correspond à cette recherche.'
                : vue === 'rupture'
                  ? 'Aucune rupture de stock. '
                  : 'Aucun produit dans cette vue.'
            }
          />
        ) : (
          <>
            <div className="px-3 sm:px-4 pt-3 text-xs text-gray-400">
              {nombre(filtres.length)} produit(s) · {VUES.find((v) => v.cle === vue)?.aide}
            </div>
            <div className="tbl-wrap">
              <table className="w-full text-sm tbl-cards">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="px-3 sm:px-4 py-2.5 font-medium">Produit</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Stock</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Dispo.</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Ventes / j</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Couverture</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Valeur</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium">État</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visibles.map((p) => (
                    <tr key={p.id}>
                      <td data-label="Produit" className="px-3 sm:px-4 py-2.5 min-w-[180px]">
                        <p className="font-medium text-gray-900">{p.nom}</p>
                        <p className="text-xs text-gray-400">
                          {p.rayon} · modifié le {date(p.derniereMaj)}
                        </p>
                      </td>
                      <td data-label="Stock" className="px-3 sm:px-4 py-2.5 text-right tabular-nums">
                        <span
                          className={
                            p.enRupture ? 'font-bold text-red-700' : 'font-semibold text-gray-900'
                          }
                        >
                          {nombre(p.stock)}
                        </span>
                      </td>
                      <td data-label="Dispo."
                        className="px-3 sm:px-4 py-2.5 text-right text-gray-500 tabular-nums"
                        title="Stock moins les quantités déjà réservées par des commandes"
                      >
                        {nombre(p.stockDisponible)}
                      </td>
                      <td data-label="Ventes / j" className="px-3 sm:px-4 py-2.5 text-right text-gray-600 tabular-nums">
                        {decimal(p.ventesMoyennesJour)}
                        <span className="block text-xs text-gray-400">
                          {decimal(p.ventesMoyennes14j)} sur 14 j
                        </span>
                      </td>
                      <td data-label="Couverture" className="px-3 sm:px-4 py-2.5 text-right tabular-nums">
                        {/* « Ne s'épuise pas » n'est pas « 0 jour » : un produit
                            qui ne se vend pas n'a pas de date de rupture. */}
                        {p.joursCouverture === null ? (
                          <span className="text-gray-300" title="Aucune vente sur la fenêtre observée">
                            —
                          </span>
                        ) : (
                          <span
                            className={
                              p.joursCouverture <= 14
                                ? 'font-semibold text-red-700'
                                : p.joursCouverture > 60
                                  ? 'text-orange-700'
                                  : 'text-gray-700'
                            }
                          >
                            {nombre(p.joursCouverture)} j
                          </span>
                        )}
                      </td>
                      <td data-label="Valeur" className="px-3 sm:px-4 py-2.5 text-right text-gray-600 whitespace-nowrap tabular-nums">
                        {p.valeurStock === null ? (
                          <span className="text-gray-300" title="Prix d'achat non renseigné">
                            —
                          </span>
                        ) : (
                          fcfa(p.valeurStock)
                        )}
                      </td>
                      <td data-label="État" className="px-3 sm:px-4 py-2.5">
                        <EtatStock produit={p} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pageSure} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </Bloc>
    </div>
  );
}

/** Étiquette d'état : la plus grave l'emporte quand plusieurs s'appliquent. */
function EtatStock({ produit }: { produit: ProduitStock }) {
  const etats = [
    produit.enRupture && { libelle: 'Rupture', puce: '⚫', classe: 'bg-gray-800 text-white border-gray-800' },
    produit.sousSeuilVentes && {
      libelle: 'Sous seuil',
      puce: '🔴',
      classe: 'bg-red-50 text-red-700 border-red-200',
    },
    produit.rotationFaible && {
      libelle: 'Surstock',
      puce: '🟠',
      classe: 'bg-orange-50 text-orange-700 border-orange-200',
    },
  ].filter(Boolean) as Array<{ libelle: string; puce: string; classe: string }>;

  if (etats.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
        <span aria-hidden="true">🟢</span> Normal
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {etats.map((e) => (
        <span
          key={e.libelle}
          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${e.classe}`}
        >
          <span aria-hidden="true">{e.puce}</span> {e.libelle}
        </span>
      ))}
    </div>
  );
}
