import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import SelecteurPeriode from '@/shared/components/dashboard/SelecteurPeriode';
import { Bloc, BoutonActualiser, EntetePage, Squelette, Vide } from '@/shared/components/dashboard/Blocs';
import { useTopProduits } from '@/domains/shop/hooks/useAnalytique';
import { bornesDepuisPeriode, fcfa, nombre, pourcent } from '@/shared/utils/format';
import { LIBELLE_ORIGINE, type OrigineProduit, type TopProduit } from '@/domains/shop/types/analytique';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';

const ORIGINES: OrigineProduit[] = ['tout', 'marketplace', 'propre'];
const TAILLES = [20, 50, 100];

/** Seuls les champs du rayon utiles au menu déroulant. */
interface OptionRayon {
  id: string;
  nom: string;
}

/**
 * Meilleures ventes, filtrables par rayon et par origine.
 *
 * Le classement porte sur le chiffre d'affaires, pas sur les quantités :
 * mille sachets à 100 F ne pèsent pas autant qu'une commande à 100 000 F, et
 * c'est le CA qu'on arbitre. Les quantités restent affichées à côté.
 */
export default function ProduitsPage() {
  const [periode, setPeriode] = useState<FiltrePeriode>({ periode: 'mois' });
  const [origine, setOrigine] = useState<OrigineProduit>('tout');
  const [rayonId, setRayonId] = useState<string>('');
  const [limit, setLimit] = useState(20);

  const { data: rayons = [] } = useQuery<OptionRayon[]>({
    queryKey: ['rayons-actifs'],
    queryFn: () =>
      shopClient
        .get<{ rayons?: OptionRayon[] }>('/admin/rayons', { params: { actif: true, limit: 100 } })
        .then((r) => r.rayons ?? []),
    staleTime: 10 * 60_000,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useTopProduits({
    ...bornesDepuisPeriode(periode),
    origine,
    limit,
    ...(rayonId ? { rayonId } : {}),
  });

  const produits: TopProduit[] = data?.produits ?? [];
  const caTotal = produits.reduce((s, p) => s + p.chiffreAffaires, 0);

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Produits les plus vendus"
        soustitre={`Classement par chiffre d'affaires · ${LIBELLE_ORIGINE[origine].toLowerCase()}`}
      >
        <SelecteurPeriode valeur={periode} onChange={setPeriode} />
        <BoutonActualiser onClick={() => refetch()} enCours={isFetching} />
      </EntetePage>

      <Bloc className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            {ORIGINES.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOrigine(o)}
                aria-pressed={origine === o}
                className={`px-2.5 py-1.5 text-xs font-medium border-r border-gray-200 last:border-r-0 transition-colors ${
                  origine === o ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {LIBELLE_ORIGINE[o]}
              </button>
            ))}
          </div>

          <select
            value={rayonId}
            onChange={(e) => setRayonId(e.target.value)}
            aria-label="Filtrer par rayon"
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 bg-white"
          >
            <option value="">Tous les rayons</option>
            {rayons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
          </select>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            aria-label="Nombre de produits"
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 bg-white"
          >
            {TAILLES.map((t) => (
              <option key={t} value={t}>
                Top {t}
              </option>
            ))}
          </select>

          {produits.length > 0 && (
            <span className="ml-auto text-xs text-gray-400">
              {fcfa(caTotal)} sur {nombre(produits.length)} produit(s)
            </span>
          )}
        </div>
      </Bloc>

      <Bloc>
        {isLoading ? (
          <Squelette tuiles={4} />
        ) : isError ? (
          <ErreurChargement
            erreur={error}
            onReessayer={refetch}
            defaut="Impossible de charger le classement."
          />
        ) : produits.length === 0 ? (
          <Vide texte="Aucune vente livrée ne correspond à ces filtres." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="px-3 sm:px-4 py-2.5 font-medium">#</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium">Produit</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium">Vendeur</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Qté</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">CA</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Marge</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produits.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="px-3 sm:px-4 py-2.5 text-gray-400 tabular-nums">{i + 1}</td>
                    <td className="px-3 sm:px-4 py-2.5">
                      <Link
                        to={`/boutique/produits/${p.id}/modifier`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {p.nom}
                      </Link>
                      <p className="text-xs text-gray-400">{p.rayon}</p>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          p.marketplace
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {p.vendeur}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right text-gray-700 tabular-nums">
                      {nombre(p.quantiteVendue)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                      {fcfa(p.chiffreAffaires)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap tabular-nums">
                      <span className={p.margeBrute > 0 ? 'text-green-700' : 'text-gray-400'}>
                        {fcfa(p.margeBrute)}
                      </span>
                      <span className="block text-[11px] text-gray-400">{pourcent(p.tauxMarge)}</span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums">
                      {/* Un best-seller en rupture est le pire cas : on le signale
                          ici plutôt que d'obliger à ouvrir l'écran Stock. */}
                      {p.stock <= 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                          <Icon name="alert-triangle" size={13} /> 0
                        </span>
                      ) : (
                        <span className="text-gray-600">{nombre(p.stock)}</span>
                      )}
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
