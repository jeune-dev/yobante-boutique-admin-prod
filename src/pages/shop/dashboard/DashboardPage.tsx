import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';

const api = {
  getKpi: () => shopClient.get('/admin/dashboard/kpi-complet'),
};

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const fcfa = (v: unknown) => `${Number(v ?? 0).toLocaleString('fr-FR')} FCFA`;
const nombre = (v: unknown) => Number(v ?? 0).toLocaleString('fr-FR');

/** Couleur associée à chaque statut de commande, réutilisée dans la page. */
const COULEUR_STATUT: Record<string, string> = {
  en_attente: 'bg-orange-100 text-orange-700',
  validee: 'bg-blue-100 text-blue-700',
  en_preparation: 'bg-indigo-100 text-indigo-700',
  expediee: 'bg-purple-100 text-purple-700',
  livree: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-kpi'],
    queryFn: api.getKpi,
    refetchInterval: 60_000,
  });

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

  const maxRevenu = Math.max(...revenus.map((r) => Number(r.revenus) || 0), 1);
  const totalStatuts = commandesParStatut.reduce((s, c) => s + Number(c.count || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Vue d'ensemble</h1>
          <p className="text-sm text-gray-500 mt-0.5">Activité de la boutique en temps réel.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <Icon name="refresh-cw" size={15} />
          {isFetching ? 'Actualisation…' : 'Actualiser'}
        </button>
      </div>

      {/* ── Chiffre d'affaires, mis en avant ─────────────────────────────── */}
      {/* Téléphone : le chiffre d'affaires en pleine largeur, les deux
          compteurs côte à côte dessous ; 3 colonnes dès la tablette. */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="col-span-2 md:col-span-1 rounded-xl p-5 bg-gradient-to-br from-gray-900 to-gray-700 text-white">
          <p className="text-xs text-white/70">Chiffre d'affaires du mois</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 break-words">{fcfa(kpi.caMois)}</p>
          <p className="text-xs text-white/60 mt-2">
            Aujourd'hui {fcfa(kpi.caJour)} · 7 jours {fcfa(kpi.caSemaine)}
          </p>
        </div>

        <Tuile
          icone="users"
          libelle="Clients"
          valeur={nombre(kpi.totalClients)}
          teinte="bg-blue-50 text-blue-600"
        />
        <Tuile
          icone="store"
          libelle="Vendeurs"
          valeur={nombre(kpi.totalVendeurs)}
          teinte="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Tuile
          icone="package"
          libelle="Produits actifs"
          valeur={nombre(kpi.totalProduits)}
          teinte="bg-green-50 text-green-600"
        />
        <Tuile
          icone="shopping-cart"
          libelle="Commandes"
          valeur={nombre(kpi.totalCommandes)}
          teinte="bg-yellow-50 text-yellow-600"
        />
        <Tuile
          icone="clock"
          libelle="En attente"
          valeur={nombre(kpi.commandesEnAttente)}
          sous="à traiter"
          teinte="bg-orange-50 text-orange-600"
        />
        <Tuile
          icone="tag"
          libelle="Promos actives"
          valeur={nombre(kpi.promotionsActives)}
          teinte="bg-pink-50 text-pink-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* ── Revenus par mois ──────────────────────────────────────────── */}
        <Bloc className="lg:col-span-2 p-5">
          <Titre>Revenus par mois ({new Date().getFullYear()})</Titre>
          {revenus.length === 0 ? (
            <Vide texte="Aucun revenu enregistré cette année." />
          ) : (
            <div className="flex items-end gap-1 sm:gap-1.5 h-44 mt-4">
              {revenus.map((r, i) => {
                const valeur = Number(r.revenus) || 0;
                return (
                  <div key={i} className="flex-1 min-w-0 h-full flex flex-col items-center gap-1.5 group">
                    {/* La barre est positionnée dans un bloc de hauteur
                        définie : une hauteur en % sur un enfant flex ne se
                        résolvait pas et toutes les barres restaient plates. */}
                    <div className="w-full flex-1 min-h-0 relative">
                      <div
                        className="absolute bottom-0 inset-x-0 bg-yellow-400 group-hover:bg-yellow-500 rounded-t transition-colors"
                        style={{
                          height: `${Math.round((valeur / maxRevenu) * 100)}%`,
                          minHeight: valeur > 0 ? '4px' : '2px',
                        }}
                        title={`${MOIS[i]} : ${fcfa(valeur)}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 truncate max-w-full">{MOIS[i]}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Bloc>

        {/* ── Répartition des commandes ─────────────────────────────────── */}
        <Bloc className="p-5">
          <Titre>Commandes par statut</Titre>
          {commandesParStatut.length === 0 ? (
            <Vide texte="Aucune commande." />
          ) : (
            <div className="space-y-3 mt-4">
              {commandesParStatut.map((s) => {
                const part = totalStatuts ? (Number(s.count) / totalStatuts) * 100 : 0;
                return (
                  <div key={s.statut}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600 capitalize">
                        {String(s.statut).replace(/_/g, ' ')}
                      </span>
                      <span className="font-semibold text-gray-900">{s.count}</span>
                    </div>
                    {/* La barre rend la répartition lisible d'un coup d'œil. */}
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded-full"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* ── Meilleures ventes ─────────────────────────────────────────── */}
        <Bloc className="p-5">
          <Titre>Meilleures ventes</Titre>
          {produitsPlusVendus.length === 0 ? (
            <Vide texte="Aucune vente enregistrée." />
          ) : (
            <div className="space-y-2.5 mt-4">
              {produitsPlusVendus.map((p, i) => (
                <div key={p.produitId} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-md bg-gray-50 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">
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
        <Bloc className="p-5">
          <Titre>Stocks</Titre>
          <div className="grid grid-cols-3 gap-2 mt-4 mb-4">
            <Pastille
              libelle="En rupture"
              valeur={kpiStocks.produitsEnRupture ?? 0}
              teinte="bg-red-50 text-red-700"
            />
            <Pastille
              libelle="Stock faible"
              valeur={kpiStocks.stockFaible ?? 0}
              teinte="bg-orange-50 text-orange-700"
            />
            <Pastille
              libelle="Stock OK"
              valeur={kpiStocks.stockOk ?? 0}
              teinte="bg-green-50 text-green-700"
            />
          </div>
          {produitsRupture.length === 0 ? (
            <Vide texte="Aucun produit en rupture." />
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {produitsRupture.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50 last:border-0"
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
      <Bloc className="p-5">
        <Titre>Commandes récentes</Titre>
        {commandesRecentes.length === 0 ? (
          <Vide texte="Aucune commande récente." />
        ) : (
          <div className="tbl-wrap mt-4">
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
                  <tr key={c.id} className="border-t border-gray-50">
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
                        {String(c.statut).replace(/_/g, ' ')}
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

function Titre({ children }: { children: React.ReactNode }) {
  return <h2 className="font-semibold text-gray-900">{children}</h2>;
}

function Vide({ texte }: { texte: string }) {
  return <p className="text-sm text-gray-400 py-8 text-center">{texte}</p>;
}

function Tuile({
  icone,
  libelle,
  valeur,
  sous,
  teinte,
}: {
  icone: string;
  libelle: string;
  valeur: string;
  sous?: string;
  teinte: string;
}) {
  return (
    <Bloc className="p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${teinte}`}>
        <Icon name={icone} size={18} />
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-3">{valeur}</p>
      <p className="text-sm text-gray-500">{libelle}</p>
      {sous && <p className="text-xs text-gray-400">{sous}</p>}
    </Bloc>
  );
}

function Pastille({
  libelle,
  valeur,
  teinte,
}: {
  libelle: string;
  valeur: number;
  teinte: string;
}) {
  return (
    <div className={`rounded-lg p-3 text-center ${teinte}`}>
      <p className="text-lg font-bold">{valeur}</p>
      <p className="text-[11px]">{libelle}</p>
    </div>
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
