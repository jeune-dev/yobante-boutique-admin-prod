import { useState } from 'react';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import SelecteurPeriode from '@/shared/components/dashboard/SelecteurPeriode';
import {
  Bloc,
  BoutonActualiser,
  Chiffre,
  EntetePage,
  Squelette,
  Titre,
} from '@/shared/components/dashboard/Blocs';
import { useKpiAccueil } from '@/domains/shop/hooks/useAnalytique';
import { useSyntheseFinance } from '@/domains/shop/hooks/useFinance';
import { bornesDepuisPeriode, fcfa, libelleBornes, nombre, pourcent } from '@/shared/utils/format';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';

/**
 * Rentabilité : comment le chiffre d'affaires se partage.
 *
 * Le cahier des charges demande « marge totale = marge application + marge
 * totale des vendeurs ». Seule la première est calculable : la part vendeur
 * est connue, mais son coût d'achat ne l'est pas — Yobante ne l'enregistre
 * pas. On affiche donc la part reversée aux vendeurs pour ce qu'elle est,
 * un chiffre d'affaires vendeur, pas une marge.
 */
export default function RentabilitePage() {
  const [periode, setPeriode] = useState<FiltrePeriode>({ periode: 'mois' });
  const bornes = bornesDepuisPeriode(periode);

  const financeQ = useSyntheseFinance(bornes);
  const kpiQ = useKpiAccueil(bornes);

  if (financeQ.isLoading || kpiQ.isLoading) return <Squelette tuiles={4} />;

  if (financeQ.isError) {
    return (
      <Bloc>
        <ErreurChargement
          erreur={financeQ.error}
          onReessayer={financeQ.refetch}
          defaut="Impossible de charger la rentabilité."
        />
      </Bloc>
    );
  }

  const s = financeQ.data!.synthese;
  const kpi = kpiQ.data?.kpi;

  // Ce que la vente a produit en tout : la part gardée par la plateforme
  // plus celle due aux vendeurs. La somme ne vaut pas le CA — le coût
  // d'achat des produits propres en a été retiré.
  const valeurCreee = s.revenuPlateforme + s.montantVendeurs;
  const max = Math.max(s.caTotal, 1);

  const etapes = [
    { libelle: "Chiffre d'affaires livré", montant: s.caTotal, couleur: 'bg-gray-900', signe: '' },
    { libelle: 'dont marketplace', montant: s.caMarketplace, couleur: 'bg-purple-400', signe: '', secondaire: true },
    { libelle: 'dont vente propre', montant: s.caPropre, couleur: 'bg-gray-400', signe: '', secondaire: true },
    { libelle: 'Part reversée aux vendeurs', montant: -s.montantVendeurs, couleur: 'bg-orange-400', signe: '−' },
    { libelle: 'Coût d\'achat des produits propres', montant: -(s.caPropre - s.margePropre), couleur: 'bg-orange-300', signe: '−' },
    { libelle: 'Remboursements', montant: -s.remboursements, couleur: 'bg-red-400', signe: '−' },
    { libelle: 'Frais de livraison encaissés', montant: s.fraisLivraison, couleur: 'bg-green-400', signe: '+' },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Rentabilité"
        soustitre={`Partage du chiffre d'affaires · ${libelleBornes(financeQ.data!.periode)}`}
      >
        <SelecteurPeriode valeur={periode} onChange={setPeriode} />
        <BoutonActualiser
          onClick={() => {
            financeQ.refetch();
            kpiQ.refetch();
          }}
          enCours={financeQ.isFetching || kpiQ.isFetching}
        />
      </EntetePage>

      {/* ── Les trois chiffres qui résument la période ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900 to-gray-700 text-white">
          <p className="text-xs text-white/70">Revenu de la plateforme</p>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight mt-1 break-words tabular-nums">
            {fcfa(s.revenuPlateforme)}
          </p>
          <p className="text-xs text-white/60 mt-2">{s.formuleRevenu}</p>
        </div>

        <Bloc className="p-4">
          <p className="text-xs text-gray-500">Part due aux vendeurs</p>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 mt-1 break-words tabular-nums">
            {fcfa(s.montantVendeurs)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            CA marketplace {fcfa(s.caMarketplace)} − commission {fcfa(s.commission)}
          </p>
        </Bloc>

        <Bloc className="p-4">
          <p className="text-xs text-gray-500">Valeur créée au total</p>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 mt-1 break-words tabular-nums">
            {fcfa(valeurCreee)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Plateforme + vendeurs, coûts d'achat propres déduits
          </p>
        </Bloc>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* ── Décomposition ───────────────────────────────────────────────── */}
        <Bloc className="lg:col-span-3 p-4">
          <Titre>Du chiffre d'affaires au revenu</Titre>
          <p className="text-xs text-gray-500 mt-0.5">
            Chaque barre est proportionnelle au chiffre d'affaires de la période.
          </p>

          <div className="mt-4 space-y-3">
            {etapes.map((e) => (
              <div key={e.libelle}>
                <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
                  <span className={e.secondaire ? 'text-gray-500 pl-3 text-[13px]' : 'text-gray-700'}>
                    {e.libelle}
                  </span>
                  <span className="font-semibold text-gray-900 shrink-0 tabular-nums whitespace-nowrap">
                    {e.signe} {fcfa(Math.abs(e.montant))}
                  </span>
                </div>
                <div className={`bg-gray-100 rounded-full overflow-hidden ${e.secondaire ? 'h-1 ml-3' : 'h-1.5'}`}>
                  <div
                    className={`h-full rounded-full ${e.couleur}`}
                    style={{ width: `${Math.min(100, (Math.abs(e.montant) / max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-baseline justify-between">
            <span className="font-semibold text-gray-900">Revenu de la plateforme</span>
            <span className="text-lg font-bold text-green-700 tabular-nums">
              {fcfa(s.revenuPlateforme)}
            </span>
          </div>
        </Bloc>

        {/* ── Marges et taux ──────────────────────────────────────────────── */}
        <Bloc className="lg:col-span-2 p-4">
          <Titre>Marges et taux</Titre>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Chiffre
              libelle="Commission"
              valeur={fcfa(s.commission)}
              ton="bon"
              aide="Prélevée sur les ventes marketplace"
            />
            <Chiffre
              libelle="Taux moyen"
              valeur={pourcent(s.tauxCommissionMoyen)}
              aide={`Taux par défaut : ${s.tauxCommissionDefaut} %`}
            />
            <Chiffre
              libelle="Marge sur ventes propres"
              valeur={fcfa(s.margePropre)}
              ton={s.margePropre > 0 ? 'bon' : 'critique'}
              aide="CA propre − coût d'achat"
            />
            <Chiffre
              libelle="Part marketplace"
              valeur={pourcent(s.partMarketplace)}
              aide="Du chiffre d'affaires total"
            />
            <Chiffre
              libelle="Remboursements"
              valeur={fcfa(s.remboursements)}
              ton={s.remboursements > 0 ? 'attention' : 'neutre'}
              aide={`${nombre(s.nombreRemboursements)} retour(s) remboursé(s)`}
            />
            <Chiffre
              libelle="Frais encaissés"
              valeur={fcfa(s.fraisLivraison)}
              aide="Livraison facturée au client"
            />
          </div>

          {kpi && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <Chiffre
                libelle="Marge brute boutique"
                valeur={`${fcfa(kpi.margeBrute)} · ${pourcent(kpi.tauxMarge)}`}
                aide="Tous produits confondus, CA − coût d'achat"
                ton={kpi.margeBrute > 0 ? 'bon' : 'critique'}
              />
            </div>
          )}
        </Bloc>
      </div>
    </div>
  );
}
