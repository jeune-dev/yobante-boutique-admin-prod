import { useState } from 'react';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import SelecteurPeriode from '@/shared/components/dashboard/SelecteurPeriode';
import {
  Barre,
  Bloc,
  BoutonActualiser,
  Chiffre,
  EntetePage,
  Reserve,
  Squelette,
  Titre,
  Vide,
} from '@/shared/components/dashboard/Blocs';
import { useCaParRayon, useKpiAccueil } from '@/domains/shop/hooks/useAnalytique';
import { bornesDepuisPeriode, fcfa, libelleBornes, nombre, pourcent } from '@/shared/utils/format';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';
import type { CaRayon } from '@/domains/shop/types/analytique';
import { useOuvrirLigne } from '@/shared/hooks/useOuvrirLigne';

/**
 * Analytique des ventes : d'où vient le chiffre d'affaires et ce qu'il laisse.
 *
 * Deux découpages complémentaires sur la même période : par origine
 * (marketplace / vente propre) et par rayon. Le détail produit par produit
 * vit sur l'écran « Produits ».
 */
export default function VentesPage() {
  const ouvrir = useOuvrirLigne();
  const [periode, setPeriode] = useState<FiltrePeriode>({ periode: 'mois' });
  const bornes = bornesDepuisPeriode(periode);

  const kpiQ = useKpiAccueil(bornes);
  const rayonsQ = useCaParRayon(bornes);

  if (kpiQ.isLoading) return <Squelette tuiles={6} />;

  if (kpiQ.isError) {
    return (
      <Bloc>
        <ErreurChargement
          erreur={kpiQ.error}
          onReessayer={kpiQ.refetch}
          defaut="Impossible de charger les indicateurs de vente."
        />
      </Bloc>
    );
  }

  const kpi = kpiQ.data!.kpi;
  const rayons: CaRayon[] = rayonsQ.data?.rayons ?? [];
  const totalRayons = rayonsQ.data?.total ?? 0;
  const maxRayon = Math.max(...rayons.map((r) => r.chiffreAffaires), 1);

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Analytique des ventes"
        soustitre={`Chiffre d'affaires, marge et répartition · ${libelleBornes(kpiQ.data!.periode)}`}
      >
        <SelecteurPeriode valeur={periode} onChange={setPeriode} />
        <BoutonActualiser
          onClick={() => {
            kpiQ.refetch();
            rayonsQ.refetch();
          }}
          enCours={kpiQ.isFetching || rayonsQ.isFetching}
        />
      </EntetePage>

      {/* ── Le compte de résultat commercial de la période ───────────────── */}
      <Bloc className="p-4">
        <Titre>Résultat commercial</Titre>
        <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3 mt-4">
          <Chiffre libelle="Chiffre d'affaires" valeur={fcfa(kpi.chiffreAffaires)} aide="Commandes livrées uniquement" />
          <Chiffre
            libelle="Marge brute"
            valeur={fcfa(kpi.margeBrute)}
            ton={kpi.margeBrute > 0 ? 'bon' : 'critique'}
            aide="CA − coût d'achat des produits vendus"
          />
          <Chiffre libelle="Taux de marge" valeur={pourcent(kpi.tauxMarge)} />
          <Chiffre libelle="Commandes" valeur={nombre(kpi.nombreCommandes)} aide={`${nombre(kpi.commandesLivrees)} livrée(s)`} />
          <Chiffre
            libelle="Panier moyen"
            valeur={fcfa(kpi.panierMoyen)}
            aide="CA ÷ toutes les commandes de la période"
          />
          <Chiffre libelle="Articles vendus" valeur={nombre(kpi.articlesVendus)} />
        </div>

        {/* Le panier « toutes commandes » est minoré par les annulations : on
            donne les deux plutôt que de choisir à la place du lecteur. */}
        <p className="text-xs text-gray-500 mt-3">
          Rapporté aux seules commandes livrées, le panier moyen est de{' '}
          <strong className="text-gray-700">{fcfa(kpi.panierMoyenLivrees)}</strong>.
        </p>

        {!kpi.margeComplete && (
          <div className="mt-3">
            <Reserve>
              {nombre(kpi.lignesSansPrixAchat)} ligne(s) vendue(s) sur {nombre(kpi.lignesTotal)} n'ont
              pas de prix d'achat renseigné : la marge affichée est <strong>minorée</strong>.
              Complétez les fiches produits pour obtenir un chiffre exact.
            </Reserve>
          </div>
        )}
      </Bloc>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {/* ── Marketplace contre vente propre ───────────────────────────── */}
        <Bloc className="p-4">
          <Titre aide="Un produit rattaché à un vendeur est marketplace ; sans vendeur, il est vendu par Yobante">
            Marketplace / propre
          </Titre>
          <div className="mt-4 space-y-3">
            <Barre
              libelle="Marketplace"
              valeur={fcfa(kpi.caMarketplace)}
              max={Math.max(kpi.caMarketplace, kpi.caPropre, 1)}
              couleur="bg-purple-500"
              detail={`${pourcent(kpi.partMarketplace)} du chiffre d'affaires`}
            />
            <Barre
              libelle="Vente propre"
              valeur={fcfa(kpi.caPropre)}
              max={Math.max(kpi.caMarketplace, kpi.caPropre, 1)}
              couleur="bg-gray-900"
              detail={`${pourcent(100 - kpi.partMarketplace)} du chiffre d'affaires`}
            />
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
            <Chiffre libelle="Frais de livraison" valeur={fcfa(kpi.fraisLivraisonEncaisses)} aide="Encaissés sur les commandes livrées" />
            <Chiffre libelle="Clients actifs" valeur={nombre(kpi.clientsActifs)} aide="Ont passé au moins une commande sur la période" />
          </div>
        </Bloc>

        {/* ── CA par rayon ───────────────────────────────────────────────── */}
        <Bloc className="lg:col-span-2 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Titre>Chiffre d'affaires par rayon</Titre>
            <p className="text-xs text-gray-400">{fcfa(totalRayons)} au total</p>
          </div>

          {rayonsQ.isError ? (
            <ErreurChargement erreur={rayonsQ.error} onReessayer={rayonsQ.refetch} />
          ) : rayons.length === 0 ? (
            <Vide texte="Aucune vente livrée sur la période." />
          ) : (
            <div className="scroller tbl-wrap mt-3">
              <table className="w-full text-sm tbl-cards">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2 font-medium">Rayon</th>
                    <th className="pb-2 font-medium text-right">CA</th>
                    <th className="pb-2 font-medium text-right">Part</th>
                    <th className="pb-2 font-medium text-right">Marge</th>
                    <th className="pb-2 font-medium text-right">Taux</th>
                    <th className="pb-2 font-medium text-right">Articles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rayons.map((r) => (
                    <tr key={r.id ?? r.rayon} {...ouvrir(r.id ? `/boutique/produits?rayonId=${r.id}` : undefined)}>
                      <td data-label="Rayon" className="py-2.5 pr-3">
                        <span className="font-medium text-gray-800">{r.rayon}</span>
                        {/* La barre rend la hiérarchie lisible sans lire les chiffres. */}
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1 max-w-[180px]">
                          <div
                            className="h-full bg-gray-900 rounded-full"
                            style={{ width: `${(r.chiffreAffaires / maxRayon) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td data-label="CA" className="py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                        {fcfa(r.chiffreAffaires)}
                      </td>
                      <td data-label="Part" className="py-2.5 text-right text-gray-500 tabular-nums">{pourcent(r.part)}</td>
                      <td data-label="Marge" className="py-2.5 text-right text-gray-700 whitespace-nowrap tabular-nums">
                        {fcfa(r.margeBrute)}
                      </td>
                      <td data-label="Taux" className="py-2.5 text-right tabular-nums">
                        <span className={r.tauxMarge >= 0 ? 'text-green-700' : 'text-red-700'}>
                          {pourcent(r.tauxMarge)}
                        </span>
                      </td>
                      <td data-label="Articles" className="py-2.5 text-right text-gray-500 tabular-nums">{nombre(r.articlesVendus)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Bloc>
      </div>
    </div>
  );
}
