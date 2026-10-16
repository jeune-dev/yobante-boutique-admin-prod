import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';
import SelecteurPeriode from '@/shared/components/dashboard/SelecteurPeriode';
import { Chiffre, Reserve, TitreIcone, Tuile } from '@/shared/components/dashboard/Blocs';
import { libelleStatut } from '@/domains/shop/statutsCommande';
import Cliquable from '@/shared/components/dashboard/Cliquable';
import { useOuvrirLigne } from '@/shared/hooks/useOuvrirLigne';
import { useAlertes, useKpiAccueil } from '@/domains/shop/hooks/useAnalytique';
import { useSyntheseFinance } from '@/domains/shop/hooks/useFinance';
import { bornesDepuisPeriode, pourcent } from '@/shared/utils/format';
import {
  LIBELLE_NIVEAU_STOCK,
  PUCE_NIVEAU_STOCK,
  type FiltrePeriode,
} from '@/domains/shop/types/indicateurs';

const api = {
  getKpi: (filtres: FiltrePeriode) =>
    shopClient.get('/admin/dashboard/kpi-complet', { params: filtres }),
};

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const fcfa = (v: unknown) => `${Number(v ?? 0).toLocaleString('fr-FR')} FCFA`;
const nombre = (v: unknown) => Number(v ?? 0).toLocaleString('fr-FR');

/** Couleur associée à chaque statut de commande, réutilisée dans la page. */
const COULEUR_STATUT: Record<string, string> = {
  en_attente: 'bg-orange-100 text-orange-700',
  en_modification: 'bg-amber-100 text-amber-800',
  validee: 'bg-blue-100 text-blue-700',
  en_preparation: 'bg-indigo-100 text-indigo-700',
  expediee: 'bg-purple-100 text-purple-700',
  livree: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
};

/** Couleur de la barre de répartition, alignée sur le badge du statut. */
const BARRE_STATUT: Record<string, string> = {
  en_attente: 'bg-orange-400',
  en_modification: 'bg-amber-400',
  validee: 'bg-blue-500',
  en_preparation: 'bg-indigo-500',
  expediee: 'bg-purple-500',
  livree: 'bg-green-500',
  annulee: 'bg-red-400',
};

/** Podium des meilleures ventes : or, argent, bronze. */
const RANG = ['bg-amber-100 text-amber-700', 'bg-slate-200 text-slate-700', 'bg-orange-100 text-orange-700'];

export default function DashboardPage() {
  // Un clic sur une ligne (commande, produit, statut) ouvre sa page.
  const ouvrir = useOuvrirLigne();
  // La période ne pilote que les KPI de ventes ; les totaux globaux et les
  // stocks restent à l'instant présent, ce qu'on attend d'un tableau de bord.
  const [periode, setPeriode] = useState<FiltrePeriode>({ periode: 'mois' });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-kpi', periode],
    queryFn: () => api.getKpi(periode),
    refetchInterval: 60_000,
  });

  // Marge, commission et taux de rupture ne sont pas dans `kpi-complet` : ils
  // viennent de l'analytique et de la finance, interrogées sur la même période.
  // Trois appels parallèles plutôt qu'un agrégat serveur de plus, dont la
  // moindre évolution casserait le tableau de bord entier.
  const bornesAnalytique = bornesDepuisPeriode(periode);
  const accueilQ = useKpiAccueil(bornesAnalytique);
  const financeQ = useSyntheseFinance(bornesAnalytique);
  const alertesQ = useAlertes({ limiteExemples: 1 });

  if (isLoading) return <Squelette />;

  // Auparavant l'échec était silencieux : les cartes affichaient « … » sans
  // qu'on sache si le chiffre valait zéro ou si l'appel avait échoué.
  if (isError) {
    return (
      <Bloc className="p-8 text-center">
        <Icon name="alert-triangle" size={28} className="mx-auto text-red-400" />
        <p className="mt-3 font-semibold text-gray-900">
          Impossible de charger le tableau de bord
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {(error as any)?.message ?? 'Erreur inconnue'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800"
        >
          Réessayer
        </button>
      </Bloc>
    );
  }

  const kpi = data?.kpi ?? {};
  const revenus: any[] = data?.revenusParMois ?? [];
  const produitsPlusVendus: any[] = data?.produitsPlusVendus ?? [];
  const commandesParStatut: any[] = data?.commandesParStatut ?? [];
  const commandesRecentes: any[] = data?.commandesRecentes ?? [];
  const produitsRupture: any[] = data?.produitsRupture ?? [];
  const kpiStocks = data?.kpiStocks ?? {};

  // Le backend renvoie les bornes qu'il a réellement appliquées : on les
  // affiche plutôt que de reconstituer le libellé, qui pourrait diverger.
  const bornes = data?.periode;
  const libellePeriode =
    bornes?.type === 'tout'
      ? 'depuis le début'
      : bornes?.debut && bornes?.fin
        ? `${new Date(bornes.debut).toLocaleDateString('fr-FR')} → ${new Date(bornes.fin).toLocaleDateString('fr-FR')}`
        : 'période en cours';

  const maxRevenu = Math.max(...revenus.map((r) => Number(r.revenus) || 0), 1);
  const totalStatuts = commandesParStatut.reduce((s, c) => s + Number(c.count || 0), 0);

  const accueil = accueilQ.data?.kpi;
  const finance = financeQ.data?.synthese;
  // Les rubriques vides ne sont pas des alertes : on ne compte que celles qui
  // réclament réellement une action.
  const alertesVives = (alertesQ.data?.alertes ?? []).filter((a) => a.nombre > 0);
  const critiques = alertesVives.filter((a) => a.gravite === 'critique');

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Icon name="layout-dashboard" size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-gray-900">Vue d'ensemble</h1>
            <p className="text-sm text-gray-500 mt-0.5 first-letter:uppercase">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}activité de la boutique en temps réel
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelecteurPeriode valeur={periode} onChange={setPeriode} />
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <Icon name="refresh-cw" size={15} />
            {isFetching ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* ── Ce qui réclame une action, avant tout chiffre ────────────────── */}
      {alertesVives.length > 0 && (
        <Bloc
          className={`p-3.5 ${critiques.length > 0 ? 'border-red-100 bg-red-50/40' : 'border-orange-100 bg-orange-50/40'}`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Icon
              name="alert-triangle"
              size={16}
              className={critiques.length > 0 ? 'text-red-600 shrink-0' : 'text-orange-600 shrink-0'}
            />
            <p className="text-sm text-gray-800 min-w-0">
              {critiques.length > 0 ? (
                <>
                  <strong className="text-red-800">{critiques.length} point(s) critique(s)</strong>
                  {alertesVives.length > critiques.length &&
                    ` et ${alertesVives.length - critiques.length} à surveiller`}
                </>
              ) : (
                <>
                  <strong>{alertesVives.length} point(s)</strong> à surveiller
                </>
              )}
              <span className="text-gray-500">
                {' — '}
                {alertesVives
                  .slice(0, 3)
                  .map((a) => `${nombre(a.nombre)} ${a.libelle}`)
                  .join(' · ')}
              </span>
            </p>
            <Link
              to="/boutique/alertes"
              className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:underline shrink-0"
            >
              Tout voir <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </Bloc>
      )}

      {/* ── Indicateurs de vente sur la période choisie ──────────────────── */}
      <Bloc className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <TitreIcone icone="trending-up" accent="ambre">Ventes · {libellePeriode}</TitreIcone>
          <p className="text-xs text-gray-400">
            Chiffre d'affaires {fcfa(kpi.chiffreAffaires)} sur la période
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-3">
          <Chiffre
            libelle="Ventes"
            icone="shopping-bag"
            accent="ambre"
                vers="/boutique/analytics/ventes"
            valeur={nombre(kpi.nombreVentes)}
            aide="Articles vendus (commandes livrées)"
          />
          <Chiffre
            libelle="Commandes"
            icone="shopping-cart"
            accent="bleu"
                vers="/boutique/commandes"
            valeur={nombre(kpi.nombreCommandes)}
            aide="Commandes passées sur la période"
          />
          <Chiffre
            libelle="Panier moyen"
            icone="wallet"
            accent="violet"
                vers="/boutique/analytics/ventes"
            valeur={fcfa(kpi.panierMoyen)}
            aide={`Rapporté aux ${kpi.basePanierMoyen ?? 'commandes livrées'}`}
          />
          <Chiffre
            libelle="Clients inscrits"
            icone="users"
            accent="cyan"
                vers="/boutique/analytics/clients"
            valeur={nombre(kpi.clientsInscrits)}
            aide="Nouveaux comptes sur la période"
          />
          <Chiffre
            libelle="Taux de conversion"
            icone="trending-up"
            accent="vert"
                vers="/boutique/analytics/clients"
            valeur={`${Number(kpi.tauxConversion ?? 0).toLocaleString('fr-FR')} %`}
            aide={kpi.formuleTauxConversion}
          />
          <Chiffre
            libelle="Livrées / à livrer"
            icone="truck"
            accent="indigo"
                vers="/boutique/commandes?statut=livree"
            valeur={`${nombre(kpi.commandesLivrees)} / ${nombre(kpi.commandesALivrer)}`}
            aide="À livrer : validée, en préparation ou expédiée"
          />
        </div>
      </Bloc>

      {/* ── Rentabilité et tension, sur la même période ──────────────────── */}
      {/* Marge, commission, clients actifs et taux de rupture : les quatre
          indicateurs du cahier des charges qui manquaient à cet écran. */}
      <Bloc className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <TitreIcone icone="pie-chart" accent="vert">Rentabilité &amp; tension</TitreIcone>
          <Link
            to="/boutique/analytics/rentabilite"
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 hover:underline"
          >
            Détail de la rentabilité
          </Link>
        </div>

        {accueilQ.isError || financeQ.isError ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            Indicateurs de marge et de commission indisponibles.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-3">
              <Chiffre
                libelle="Marge brute"
                icone="coins"
                accent="vert"
                vers="/boutique/analytics/rentabilite"
                valeur={accueil ? fcfa(accueil.margeBrute) : '…'}
                aide="CA − coût d'achat des produits vendus"
              />
              <Chiffre
                libelle="Taux de marge"
                icone="percent"
                accent="cyan"
                vers="/boutique/analytics/rentabilite"
                valeur={accueil ? pourcent(accueil.tauxMarge) : '…'}
              />
              <Chiffre
                libelle="Commission marketplace"
                icone="banknote"
                accent="violet"
                vers="/boutique/finance/commissions"
                valeur={finance ? fcfa(finance.commission) : '…'}
                aide={
                  finance
                    ? `Taux moyen ${pourcent(finance.tauxCommissionMoyen)}`
                    : 'Prélevée sur les ventes vendeurs'
                }
              />
              <Chiffre
                libelle="Clients actifs"
                icone="activity"
                accent="bleu"
                vers={`/boutique/clients?${new URLSearchParams({
                  ...(bornesAnalytique.debut ? { du: bornesAnalytique.debut } : {}),
                  ...(bornesAnalytique.fin ? { au: bornesAnalytique.fin } : {}),
                  ...(!bornesAnalytique.debut && !bornesAnalytique.fin ? { segment: 'acheteurs' } : {}),
                })}`}
                valeur={accueil ? nombre(accueil.clientsActifs) : '…'}
                aide="Ont commandé au moins une fois sur la période"
              />
              <Chiffre
                libelle="Taux de rupture"
                icone="alert-triangle"
                accent="rose"
                vers="/boutique/stock?vue=rupture"
                valeur={accueil ? pourcent(accueil.tauxRupture) : '…'}
                aide="Produits à zéro ÷ produits actifs, à l'instant présent"
              />
              <Chiffre
                libelle="Valeur du stock"
                icone="boxes"
                accent="ambre"
                vers="/boutique/stock"
                valeur={accueil ? fcfa(accueil.valeurStockAchat) : '…'}
                aide="À prix d'achat"
              />
            </div>

            {/* Une marge affichée sans réserve alors que des prix d'achat
                manquent laisserait croire à un chiffre exact. */}
            {accueil && !accueil.margeComplete && (
              <div className="mt-3">
                <Reserve>
                  {nombre(accueil.lignesSansPrixAchat)} ligne(s) vendue(s) sur{' '}
                  {nombre(accueil.lignesTotal)} n'ont pas de prix d'achat : la marge est{' '}
                  <strong>minorée</strong>.{' '}
                  <Link to="/boutique/stock?vue=sans-prix" className="underline font-semibold">
                    Compléter les fiches
                  </Link>
                </Reserve>
              </div>
            )}
          </>
        )}
      </Bloc>

      {/* ── Chiffre d'affaires, mis en avant ─────────────────────────────── */}
      {/* Téléphone : le chiffre d'affaires en pleine largeur, les deux
          compteurs côte à côte dessous ; 3 colonnes dès la tablette. */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
        <Cliquable
          vers="/boutique/analytics/ventes"
          titre="Chiffre d'affaires"
          survol="hover:shadow-md hover:brightness-110"
          className="col-span-2 md:col-span-1 relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-slate-700 text-white"
        >
          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-white/70">Chiffre d'affaires du mois</p>
              <span className="w-7 h-7 rounded-lg bg-yellow-400 text-gray-900 flex items-center justify-center shrink-0">
                <Icon name="trending-up" size={15} />
              </span>
            </div>
            <p className="text-xl sm:text-2xl font-bold mt-1 break-words tabular-nums">{fcfa(kpi.caMois)}</p>
            <p className="text-xs text-white/60 mt-2">
              Aujourd'hui <span className="text-yellow-300 font-semibold">{fcfa(kpi.caJour)}</span> · 7 jours{' '}
              <span className="text-yellow-300 font-semibold">{fcfa(kpi.caSemaine)}</span>
            </p>
          </div>
        </Cliquable>

        <Tuile
          icone="users"
          libelle="Clients"
                vers="/boutique/clients"
          valeur={nombre(kpi.totalClients)}
          teinte="bg-blue-50 text-blue-600"
        />
        <Tuile
          icone="store"
          libelle="Vendeurs"
                vers="/boutique/vendeurs"
          valeur={nombre(kpi.totalVendeurs)}
          teinte="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <Tuile
          icone="package"
          libelle="Produits actifs"
                vers="/boutique/produits"
          valeur={nombre(kpi.totalProduits)}
          teinte="bg-emerald-50 text-emerald-600"
        />
        <Tuile
          icone="shopping-cart"
          libelle="Commandes"
                vers="/boutique/commandes"
          valeur={nombre(kpi.totalCommandes)}
          teinte="bg-amber-50 text-amber-600"
        />
        <Tuile
          icone="clock"
          libelle="En attente"
                vers="/boutique/commandes?statut=en_attente"
          valeur={nombre(kpi.commandesEnAttente)}
          sous="à traiter"
          teinte="bg-orange-50 text-orange-600"
        />
        <Tuile
          icone="tag"
          libelle="Promos actives"
                vers="/boutique/accueil"
          valeur={nombre(kpi.promotionsActives)}
          teinte="bg-rose-50 text-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {/* ── Revenus par mois ──────────────────────────────────────────── */}
        <Bloc className="lg:col-span-2 p-4 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TitreIcone icone="bar-chart" accent="ambre">Revenus par mois ({new Date().getFullYear()})</TitreIcone>
            {revenus.length > 0 && (
              <p className="text-xs text-gray-500">
                Total de l'année{' '}
                <span className="font-semibold text-gray-900 tabular-nums">
                  {fcfa(revenus.reduce((t, x) => t + (Number(x.revenus) || 0), 0))}
                </span>
              </p>
            )}
          </div>
          {revenus.length === 0 ? (
            <Vide texte="Aucun revenu enregistré cette année." />
          ) : (
            <div className="flex items-end gap-1 sm:gap-1.5 h-40 lg:h-auto lg:flex-1 lg:min-h-[10rem] mt-4">
              {revenus.map((r, i) => {
                const valeur = Number(r.revenus) || 0;
                return (
                  <div key={i} className="flex-1 min-w-0 h-full flex flex-col items-center gap-1.5 group">
                    {/* La barre est positionnée dans un bloc de hauteur
                        définie : une hauteur en % sur un enfant flex ne se
                        résolvait pas et toutes les barres restaient plates. */}
                    <div className="w-full flex-1 min-h-0 relative">
                      <div
                        className={`absolute bottom-0 inset-x-0 rounded-t-md bg-gradient-to-t transition-opacity group-hover:opacity-90 ${
                          i === new Date().getMonth()
                            ? 'from-amber-500 to-yellow-400 shadow-sm'
                            : 'from-amber-200 to-yellow-100'
                        }`}
                        style={{
                          height: `${Math.round((valeur / maxRevenu) * 100)}%`,
                          minHeight: valeur > 0 ? '4px' : '2px',
                        }}
                        title={`${MOIS[i]} : ${fcfa(valeur)}`}
                      />
                    </div>
                    <span
                      className={`text-[10px] truncate max-w-full ${
                        i === new Date().getMonth() ? 'font-semibold text-amber-700' : 'text-gray-400'
                      }`}
                    >
                      {MOIS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Bloc>

        {/* ── Répartition des commandes ─────────────────────────────────── */}
        <Bloc className="p-4">
          <TitreIcone icone="clipboard-list" accent="bleu">Commandes par statut</TitreIcone>
          {commandesParStatut.length === 0 ? (
            <Vide texte="Aucune commande." />
          ) : (
            <div className="space-y-3 mt-3">
              {commandesParStatut.map((s) => {
                const part = totalStatuts ? (Number(s.count) / totalStatuts) * 100 : 0;
                return (
                  <div
                    key={s.statut}
                    {...ouvrir(`/boutique/commandes?statut=${s.statut}`)}
                    className="-mx-2 px-2 py-1 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-2 text-gray-600">
                        <span
                          aria-hidden="true"
                          className={`w-2 h-2 rounded-full ${BARRE_STATUT[s.statut] ?? 'bg-gray-400'}`}
                        />
                        {libelleStatut(s.statut)}
                      </span>
                      <span className="font-semibold text-gray-900">{s.count}</span>
                    </div>
                    {/* La barre rend la répartition lisible d'un coup d'œil. */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${BARRE_STATUT[s.statut] ?? 'bg-gray-400'}`}
                        style={{ width: `${part}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Bloc>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
        {/* ── Meilleures ventes ─────────────────────────────────────────── */}
        <Bloc className="p-4">
          <TitreIcone icone="star" accent="ambre">Meilleures ventes</TitreIcone>
          {produitsPlusVendus.length === 0 ? (
            <Vide texte="Aucune vente enregistrée." />
          ) : (
            <div className="space-y-2.5 mt-3">
              {produitsPlusVendus.map((p, i) => (
                <div
                  key={p.produitId}
                  {...ouvrir(p.produitId ? `/boutique/produits/${p.produitId}/modifier` : null)}
                  className="flex items-center gap-3 -mx-2 px-2 py-1 rounded-lg hover:bg-gray-50"
                >
                  <span
                    className={`w-6 h-6 rounded-md text-xs font-bold flex items-center justify-center shrink-0 ${
                      RANG[i] ?? 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-800 truncate">{p.nom}</span>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">
                    {p.totalVendu}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Bloc>

        {/* ── Stocks ────────────────────────────────────────────────────── */}
        <Bloc className="p-4">
          <TitreIcone icone="boxes" accent="vert">Stocks</TitreIcone>
          {/* Les quatre paliers d'alerte, du plus sain au plus grave. Les
              seuils viennent du backend pour rester alignés sur la liste des
              produits. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 mb-4">
            <Pastille
              libelle={LIBELLE_NIVEAU_STOCK.normal}
              puce={PUCE_NIVEAU_STOCK.normal}
              valeur={kpiStocks.normal ?? kpiStocks.stockOk ?? 0}
              vers="/boutique/stock"
              teinte="bg-green-50 text-green-700"
              aide={`Plus de ${kpiStocks.seuils?.FAIBLE ?? 5} en stock`}
            />
            <Pastille
              libelle={LIBELLE_NIVEAU_STOCK.faible}
              puce={PUCE_NIVEAU_STOCK.faible}
              valeur={kpiStocks.faible ?? kpiStocks.stockFaible ?? 0}
              vers="/boutique/stock?vue=alerte"
              teinte="bg-orange-50 text-orange-700"
              aide={`Jusqu'à ${kpiStocks.seuils?.FAIBLE ?? 5} en stock`}
            />
            <Pastille
              libelle={LIBELLE_NIVEAU_STOCK.rupture_imminente}
              puce={PUCE_NIVEAU_STOCK.rupture_imminente}
              valeur={kpiStocks.rupture_imminente ?? 0}
              vers="/boutique/stock?vue=alerte"
              teinte="bg-red-50 text-red-700"
              aide={`Jusqu'à ${kpiStocks.seuils?.RUPTURE_IMMINENTE ?? 2} en stock`}
            />
            <Pastille
              libelle={LIBELLE_NIVEAU_STOCK.rupture}
              puce={PUCE_NIVEAU_STOCK.rupture}
              valeur={kpiStocks.rupture ?? kpiStocks.produitsEnRupture ?? 0}
              vers="/boutique/stock?vue=rupture"
              teinte="bg-gray-800 text-white"
              aide="Stock épuisé"
            />
          </div>
          {produitsRupture.length === 0 ? (
            <Vide texte="Aucun produit en rupture." />
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {produitsRupture.map((p) => (
                <div
                  key={p.id}
                  {...ouvrir(`/boutique/produits/${p.id}/modifier`)}
                  className="flex items-center justify-between text-xs py-1.5 px-1 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded"
                >
                  <span className="truncate text-gray-700">{p.nom}</span>
                  <span className="text-red-500 font-semibold ml-2 shrink-0">Rupture</span>
                </div>
              ))}
            </div>
          )}
        </Bloc>
      </div>

      {/* ── Commandes récentes ─────────────────────────────────────────── */}
      <Bloc className="p-4">
        <TitreIcone icone="clock" accent="indigo">Commandes récentes</TitreIcone>
        {commandesRecentes.length === 0 ? (
          <Vide texte="Aucune commande récente." />
        ) : (
          <div className="tbl-wrap mt-3">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase">
                  <th className="pb-2 font-medium">Référence</th>
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Montant</th>
                  <th className="pb-2 font-medium">Statut</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {commandesRecentes.map((c) => (
                  <tr key={c.id} {...ouvrir(`/boutique/commandes/${c.id}`)} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 font-mono text-xs text-gray-600 tbl-primary">{c.reference}</td>
                    <td className="py-2.5 text-gray-800" data-label="Client">
                      {[c.user?.prenom, c.user?.nom].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="py-2.5 font-medium text-gray-900 whitespace-nowrap" data-label="Montant">{fcfa(c.montantTotal)}</td>
                    <td className="py-2.5" data-label="Statut">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          COULEUR_STATUT[c.statut] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {libelleStatut(c.statut)}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-400 whitespace-nowrap" data-label="Date">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bloc>
    </div>
  );
}

// ── Composants de présentation ────────────────────────────────────────

function Bloc({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Vide({ texte }: { texte: string }) {
  return <p className="text-sm text-gray-400 py-8 text-center">{texte}</p>;
}

function Pastille({
  libelle,
  valeur,
  teinte,
  puce,
  aide,
  vers,
}: {
  libelle: string;
  valeur: number;
  teinte: string;
  puce?: string;
  aide?: string;
  /** Liste des produits concernés. */
  vers?: string;
}) {
  return (
    <Cliquable vers={vers} titre={aide} survol="hover:brightness-95 hover:shadow-sm" className={`rounded-lg p-2.5 text-center ${teinte}`}>
      <p className="text-base font-bold tabular-nums">{valeur}</p>
      {/* La pastille double la couleur d'un repère non chromatique. */}
      <p className="text-[11px] leading-tight">
        {puce && <span aria-hidden="true">{puce} </span>}
        {libelle}
      </p>
    </Cliquable>
  );
}

/** Silhouette affichée pendant le chargement, plutôt qu'un texte seul. */
function Squelette() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-gray-100 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-gray-100 rounded-xl" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}

// Named export kept for backward compatibility
export { DashboardPage as ShopDashboard };
