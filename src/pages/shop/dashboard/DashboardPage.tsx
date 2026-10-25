import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';
import SelecteurPeriode from '@/shared/components/dashboard/SelecteurPeriode';
import { ACCENTS, Reserve, type Accent } from '@/shared/components/dashboard/Blocs';
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

// Le franc CFA n'a pas de subdivision : les décimales n'apportent que du bruit.
const fcfa = (v: unknown) =>
  `${Number(v ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`;
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
    <div className="space-y-5 sm:space-y-6">
      {/* ── Entête ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Icon name="layout-dashboard" size={24} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Vue d'ensemble</h1>
            <p className="text-sm sm:text-[15px] text-gray-500 mt-0.5 first-letter:uppercase">
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
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Icon name="refresh-cw" size={16} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* ── Ce qui réclame une action, avant tout chiffre ────────────────── */}
      {alertesVives.length > 0 && (
        <div
          className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-4 py-3.5 sm:px-5 ${
            critiques.length > 0 ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'
          }`}
        >
          <span
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              critiques.length > 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
            }`}
          >
            <Icon name="alert-triangle" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-gray-900">
              {critiques.length > 0 ? (
                <>
                  <strong className="text-red-700">{critiques.length} point(s) critique(s)</strong>
                  {alertesVives.length > critiques.length &&
                    ` et ${alertesVives.length - critiques.length} à surveiller`}
                </>
              ) : (
                <>
                  <strong>{alertesVives.length} point(s)</strong> à surveiller
                </>
              )}
            </p>
            <p className="text-sm text-gray-600 mt-0.5">
              {alertesVives
                .slice(0, 3)
                .map((a) => `${nombre(a.nombre)} ${a.libelle}`)
                .join(' · ')}
            </p>
          </div>
          <Link
            to="/boutique/alertes"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm border border-gray-200 hover:bg-gray-50 shrink-0"
          >
            Tout voir <Icon name="arrow-right" size={15} />
          </Link>
        </div>
      )}

      {/* ── Chiffre d'affaires et totaux de la boutique ──────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Cliquable
          vers="/boutique/analytics/ventes"
          titre="Chiffre d'affaires"
          survol="hover:shadow-lg hover:brightness-110"
          className="lg:col-span-2 relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-slate-700 text-white shadow-sm"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-yellow-400/10"
          />
          <div className="relative">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm sm:text-[15px] font-medium text-white/75">Chiffre d'affaires du mois</p>
              <span className="w-10 h-10 rounded-xl bg-yellow-400 text-gray-900 flex items-center justify-center shrink-0">
                <Icon name="trending-up" size={20} />
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-bold mt-2 break-words">
              <Montant valeur={kpi.caMois} />
            </p>
            <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
              {[
                ["Aujourd'hui", kpi.caJour],
                ['7 jours', kpi.caSemaine],
                ['Période choisie', kpi.chiffreAffaires],
              ].map(([libelle, valeur]) => (
                <div key={libelle} className="min-w-0">
                  <dt className="text-xs sm:text-sm text-white/60">{libelle}</dt>
                  <dd className="mt-1 text-base sm:text-lg font-semibold text-yellow-300 break-words">
                    <Montant valeur={valeur} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Cliquable>

        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <Total icone="users" libelle="Clients" vers="/boutique/clients" valeur={nombre(kpi.totalClients)} teinte="bg-blue-50 text-blue-600" />
          <Total icone="store" libelle="Vendeurs" vers="/boutique/vendeurs" valeur={nombre(kpi.totalVendeurs)} teinte="bg-violet-50 text-violet-600" />
          <Total icone="package" libelle="Produits actifs" vers="/boutique/produits" valeur={nombre(kpi.totalProduits)} teinte="bg-emerald-50 text-emerald-600" />
          <Total icone="shopping-cart" libelle="Commandes" vers="/boutique/commandes" valeur={nombre(kpi.totalCommandes)} teinte="bg-amber-50 text-amber-600" />
          <Total
            icone="clock"
            libelle="En attente"
            sous="à traiter"
            vers="/boutique/commandes?statut=en_attente"
            valeur={nombre(kpi.commandesEnAttente)}
            teinte="bg-orange-50 text-orange-600"
          />
          <Total icone="tag" libelle="Promos actives" vers="/boutique/accueil" valeur={nombre(kpi.promotionsActives)} teinte="bg-rose-50 text-rose-600" />
        </div>
      </div>

      {/* ── Ventes, puis rentabilité, sur la période choisie ─────────────── */}
      <div className="grid gap-5 sm:gap-6 2xl:grid-cols-2">
        <Section icone="trending-up" accent="ambre" titre="Ventes de la période" sousTitre={libellePeriode}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <Indicateur
              libelle="Ventes"
              icone="shopping-bag"
              accent="ambre"
              vers="/boutique/analytics/ventes"
              valeur={nombre(kpi.nombreVentes)}
              aide="Articles vendus (commandes livrées)"
            />
            <Indicateur
              libelle="Commandes"
              icone="shopping-cart"
              accent="bleu"
              vers="/boutique/commandes"
              valeur={nombre(kpi.nombreCommandes)}
              aide="Commandes passées sur la période"
            />
            <Indicateur
              libelle="Panier moyen"
              icone="wallet"
              accent="violet"
              vers="/boutique/analytics/ventes"
              valeur={<Montant valeur={kpi.panierMoyen} />}
              aide={`Rapporté aux ${kpi.basePanierMoyen ?? 'commandes livrées'}`}
            />
            <Indicateur
              libelle="Clients inscrits"
              icone="users"
              accent="cyan"
              vers="/boutique/analytics/clients"
              valeur={nombre(kpi.clientsInscrits)}
              aide="Nouveaux comptes sur la période"
            />
            <Indicateur
              libelle="Taux de conversion"
              icone="trending-up"
              accent="vert"
              vers="/boutique/analytics/clients"
              valeur={`${Number(kpi.tauxConversion ?? 0).toLocaleString('fr-FR')} %`}
              aide={kpi.formuleTauxConversion}
            />
            <Indicateur
              libelle="Livrées / à livrer"
              icone="truck"
              accent="indigo"
              vers="/boutique/commandes?statut=livree"
              valeur={`${nombre(kpi.commandesLivrees)} / ${nombre(kpi.commandesALivrer)}`}
              aide="À livrer : validée, en préparation ou expédiée"
            />
          </div>
        </Section>

        {/* Marge, commission, clients actifs et taux de rupture : les quatre
            indicateurs du cahier des charges qui manquaient à cet écran. */}
        <Section
          icone="pie-chart"
          accent="vert"
          titre="Rentabilité & tension"
          sousTitre={libellePeriode}
          action={
            <Link
              to="/boutique/analytics/rentabilite"
              className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:underline"
            >
              Détail de la rentabilité <Icon name="arrow-right" size={14} />
            </Link>
          }
        >
          {accueilQ.isError || financeQ.isError ? (
            <Vide texte="Indicateurs de marge et de commission indisponibles." />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <Indicateur
                  libelle="Marge brute"
                  icone="coins"
                  accent="vert"
                  vers="/boutique/analytics/rentabilite"
                  valeur={accueil ? <Montant valeur={accueil.margeBrute} /> : '…'}
                  aide="CA − coût d'achat des produits vendus"
                />
                <Indicateur
                  libelle="Taux de marge"
                  icone="percent"
                  accent="cyan"
                  vers="/boutique/analytics/rentabilite"
                  valeur={accueil ? pourcent(accueil.tauxMarge) : '…'}
                />
                <Indicateur
                  libelle="Commission marketplace"
                  icone="banknote"
                  accent="violet"
                  vers="/boutique/finance/commissions"
                  valeur={finance ? <Montant valeur={finance.commission} /> : '…'}
                  aide={
                    finance
                      ? `Taux moyen ${pourcent(finance.tauxCommissionMoyen)}`
                      : 'Prélevée sur les ventes vendeurs'
                  }
                />
                <Indicateur
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
                <Indicateur
                  libelle="Taux de rupture"
                  icone="alert-triangle"
                  accent="rose"
                  vers="/boutique/stock?vue=rupture"
                  valeur={accueil ? pourcent(accueil.tauxRupture) : '…'}
                  aide="Produits à zéro ÷ produits actifs, à l'instant présent"
                />
                <Indicateur
                  libelle="Valeur du stock"
                  icone="boxes"
                  accent="ambre"
                  vers="/boutique/stock"
                  valeur={accueil ? <Montant valeur={accueil.valeurStockAchat} /> : '…'}
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
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* ── Revenus par mois ──────────────────────────────────────────── */}
        <Section
          icone="bar-chart"
          accent="ambre"
          titre={`Revenus par mois (${new Date().getFullYear()})`}
          sousTitre={
            revenus.length > 0 ? (
              <>
                Total de l'année{' '}
                <span className="font-semibold text-gray-900 tabular-nums">
                  {fcfa(revenus.reduce((t, x) => t + (Number(x.revenus) || 0), 0))}
                </span>
              </>
            ) : undefined
          }
          className="lg:col-span-2 flex flex-col"
        >
          {revenus.length === 0 ? (
            <Vide texte="Aucun revenu enregistré cette année." />
          ) : (
            <div className="flex items-end gap-1.5 sm:gap-2 h-56 lg:h-auto lg:flex-1 lg:min-h-[14rem]">
              {revenus.map((r, i) => {
                const valeur = Number(r.revenus) || 0;
                const courant = i === new Date().getMonth();
                return (
                  <div key={i} className="flex-1 min-w-0 h-full flex flex-col items-center gap-2 group">
                    {/* La barre est positionnée dans un bloc de hauteur
                        définie : une hauteur en % sur un enfant flex ne se
                        résolvait pas et toutes les barres restaient plates. */}
                    <div className="w-full flex-1 min-h-0 relative rounded-t-lg bg-gray-50">
                      <div
                        className={`absolute bottom-0 inset-x-0 rounded-t-lg bg-gradient-to-t transition-opacity group-hover:opacity-90 ${
                          courant ? 'from-amber-500 to-yellow-400 shadow-sm' : 'from-amber-300 to-yellow-200'
                        }`}
                        style={{
                          height: `${Math.round((valeur / maxRevenu) * 100)}%`,
                          minHeight: valeur > 0 ? '4px' : '2px',
                        }}
                        title={`${MOIS[i]} : ${fcfa(valeur)}`}
                      />
                    </div>
                    <span
                      className={`text-xs truncate max-w-full ${
                        courant ? 'font-bold text-amber-700' : 'font-medium text-gray-500'
                      }`}
                    >
                      {MOIS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── Répartition des commandes ─────────────────────────────────── */}
        <Section
          icone="clipboard-list"
          accent="bleu"
          titre="Commandes par statut"
          sousTitre={totalStatuts > 0 ? `${nombre(totalStatuts)} commande(s) au total` : undefined}
        >
          {commandesParStatut.length === 0 ? (
            <Vide texte="Aucune commande." />
          ) : (
            <div className="space-y-2">
              {commandesParStatut.map((s) => {
                const part = totalStatuts ? (Number(s.count) / totalStatuts) * 100 : 0;
                return (
                  <div
                    key={s.statut}
                    {...ouvrir(`/boutique/commandes?statut=${s.statut}`)}
                    className="-mx-2 px-2 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <span className="flex items-center gap-2.5 text-[15px] text-gray-700">
                        <span
                          aria-hidden="true"
                          className={`w-2.5 h-2.5 rounded-full ${BARRE_STATUT[s.statut] ?? 'bg-gray-400'}`}
                        />
                        {libelleStatut(s.statut)}
                      </span>
                      <span className="text-[15px] font-bold text-gray-900 tabular-nums">
                        {s.count}
                        <span className="ml-1.5 text-xs font-medium text-gray-400">
                          {Math.round(part)} %
                        </span>
                      </span>
                    </div>
                    {/* La barre rend la répartition lisible d'un coup d'œil. */}
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* ── Meilleures ventes ─────────────────────────────────────────── */}
        <Section icone="star" accent="ambre" titre="Meilleures ventes" sousTitre="Quantités vendues par produit">
          {produitsPlusVendus.length === 0 ? (
            <Vide texte="Aucune vente enregistrée." />
          ) : (
            <div className="divide-y divide-gray-50">
              {produitsPlusVendus.map((p, i) => (
                <div
                  key={p.produitId}
                  {...ouvrir(p.produitId ? `/boutique/produits/${p.produitId}/modifier` : null)}
                  className="flex items-center gap-3 -mx-2 px-2 py-2.5 rounded-lg hover:bg-gray-50"
                >
                  <span
                    className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center shrink-0 ${
                      RANG[i] ?? 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-[15px] text-gray-800 truncate">{p.nom}</span>
                  <span className="text-[15px] font-bold text-gray-900 shrink-0 tabular-nums">
                    {p.totalVendu}
                    <span className="ml-1 text-xs font-medium text-gray-400">vendu(s)</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Stocks ────────────────────────────────────────────────────── */}
        <Section icone="boxes" accent="vert" titre="Stocks" sousTitre="Niveaux d'alerte, à l'instant présent">
          {/* Les quatre paliers d'alerte, du plus sain au plus grave. Les
              seuils viennent du backend pour rester alignés sur la liste des
              produits. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
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
            <>
              <p className="text-sm font-semibold text-gray-700 mb-1">Produits en rupture</p>
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                {produitsRupture.map((p) => (
                  <div
                    key={p.id}
                    {...ouvrir(`/boutique/produits/${p.id}/modifier`)}
                    className="flex items-center justify-between gap-3 text-sm py-2 px-2 hover:bg-gray-50 rounded-lg"
                  >
                    <span className="truncate text-gray-800">{p.nom}</span>
                    <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                      Rupture
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>
      </div>

      {/* ── Commandes récentes ─────────────────────────────────────────── */}
      <Section
        icone="clock"
        accent="indigo"
        titre="Commandes récentes"
        action={
          <Link
            to="/boutique/commandes"
            className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:underline"
          >
            Toutes les commandes <Icon name="arrow-right" size={14} />
          </Link>
        }
      >
        {commandesRecentes.length === 0 ? (
          <Vide texte="Aucune commande récente." />
        ) : (
          <div className="tbl-wrap">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                  <th className="py-2.5 px-3 rounded-l-lg">Référence</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Montant</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3 rounded-r-lg">Date</th>
                </tr>
              </thead>
              <tbody>
                {commandesRecentes.map((c) => (
                  <tr
                    key={c.id}
                    {...ouvrir(`/boutique/commandes/${c.id}`)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <td className="py-3 px-3 font-mono text-[13px] text-gray-700 tbl-primary">{c.reference}</td>
                    <td className="py-3 px-3 text-gray-900 font-medium" data-label="Client">
                      {[c.user?.prenom, c.user?.nom].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap tabular-nums" data-label="Montant">
                      {fcfa(c.montantTotal)}
                    </td>
                    <td className="py-3 px-3" data-label="Statut">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          COULEUR_STATUT[c.statut] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {libelleStatut(c.statut)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500 whitespace-nowrap" data-label="Date">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Composants de présentation ────────────────────────────────────────

function Bloc({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/** Carte de section : pastille d'icône, titre lisible, sous-titre et action. */
function Section({
  icone,
  accent,
  titre,
  sousTitre,
  action,
  className = '',
  children,
}: {
  icone: string;
  accent: Accent;
  titre: React.ReactNode;
  sousTitre?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 ${className}`}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ACCENTS[accent].pastille}`}
          >
            <Icon name={icone} size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight text-gray-900">{titre}</h2>
            {sousTitre && <p className="mt-0.5 text-sm text-gray-500">{sousTitre}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/**
 * Indicateur de la période : libellé sur une ligne, valeur en grand, aide
 * lisible dessous. Plus aéré que le `Chiffre` partagé, conçu pour les grilles
 * denses des pages d'analyse.
 */
function Indicateur({
  libelle,
  icone,
  accent,
  valeur,
  aide,
  vers,
}: {
  libelle: string;
  icone: string;
  accent: Accent;
  valeur: React.ReactNode;
  aide?: string;
  vers?: string;
}) {
  return (
    <Cliquable
      vers={vers}
      titre={aide}
      survol={`hover:shadow-md ${ACCENTS[accent].bord}`}
      className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4"
    >
      <div className="flex items-center gap-2.5">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ACCENTS[accent].pastille}`}>
          <Icon name={icone} size={18} />
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-gray-600">{libelle}</p>
        {vers && (
          <Icon name="chevron-right" size={16} className="shrink-0 text-gray-300 group-hover:text-gray-600" />
        )}
      </div>
      <p className="mt-3 text-2xl font-bold leading-tight text-gray-900 break-words tabular-nums">{valeur}</p>
      {aide && <p className="mt-1 text-[13px] leading-snug text-gray-500">{aide}</p>}
    </Cliquable>
  );
}

/** Total de la boutique, à l'instant présent. */
function Total({
  icone,
  libelle,
  valeur,
  sous,
  teinte,
  vers,
}: {
  icone: string;
  libelle: string;
  valeur: React.ReactNode;
  sous?: string;
  teinte: string;
  vers?: string;
}) {
  return (
    <Cliquable
      vers={vers}
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
      survol="hover:shadow-md hover:border-gray-200"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${teinte}`}>
          <Icon name={icone} size={22} />
        </span>
        {vers && (
          <Icon name="chevron-right" size={16} className="shrink-0 text-gray-300 group-hover:text-gray-600" />
        )}
      </div>
      <p className="mt-3 text-2xl sm:text-3xl font-bold leading-none text-gray-900 tabular-nums">{valeur}</p>
      <p className="mt-1.5 text-sm font-medium text-gray-600">
        {libelle}
        {sous && <span className="font-normal text-gray-400"> · {sous}</span>}
      </p>
    </Cliquable>
  );
}

/**
 * Montant en FCFA : la devise en plus petit, pour que le chiffre reste
 * lisible et tienne sur une ligne même dans une carte étroite.
 */
function Montant({ valeur }: { valeur: unknown }) {
  return (
    <span className="tabular-nums whitespace-nowrap">
      {Number(valeur ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
      <span className="ml-1 text-[0.6em] font-semibold opacity-70">FCFA</span>
    </span>
  );
}

function Vide({ texte }: { texte: string }) {
  return <p className="text-[15px] text-gray-400 py-10 text-center">{texte}</p>;
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
    <Cliquable
      vers={vers}
      titre={aide}
      survol="hover:brightness-95 hover:shadow-sm"
      className={`rounded-xl px-3 py-3 text-center ${teinte}`}
    >
      <p className="text-2xl font-bold tabular-nums leading-none">{valeur}</p>
      {/* La pastille double la couleur d'un repère non chromatique. */}
      <p className="mt-1.5 text-[13px] font-medium leading-tight">
        {puce && <span aria-hidden="true">{puce} </span>}
        {libelle}
      </p>
      {aide && <p className="mt-0.5 text-xs leading-tight opacity-75">{aide}</p>}
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
