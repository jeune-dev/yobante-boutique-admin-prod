import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
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
import { useSyntheseFinance } from '@/domains/shop/hooks/useFinance';
import { bornesDepuisPeriode, fcfa, libelleBornes, nombre, pourcent } from '@/shared/utils/format';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';

/**
 * Synthèse financière : qui encaisse quoi sur la période.
 *
 * Aucun solde n'est stocké côté serveur — tout se recalcule depuis les ventes
 * livrées à chaque lecture. Un solde enregistré divergerait du réel au premier
 * retour ou au premier changement de taux, sans que personne ne s'en aperçoive.
 */
export default function SyntheseFinancePage() {
  const [periode, setPeriode] = useState<FiltrePeriode>({ periode: 'mois' });
  const { data, isLoading, isError, error, refetch, isFetching } = useSyntheseFinance(
    bornesDepuisPeriode(periode)
  );

  if (isLoading) return <Squelette tuiles={4} />;

  if (isError) {
    return (
      <Bloc>
        <ErreurChargement
          erreur={error}
          onReessayer={refetch}
          defaut="Impossible de charger la synthèse financière."
        />
      </Bloc>
    );
  }

  const s = data!.synthese;

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Synthèse financière"
        soustitre={`Ventes, commissions et reversements · ${libelleBornes(data!.periode)}`}
      >
        <SelecteurPeriode valeur={periode} onChange={setPeriode} />
        <BoutonActualiser onClick={() => refetch()} enCours={isFetching} />
      </EntetePage>

      {/* ── Ce que garde la plateforme ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="rounded-xl p-4 bg-gradient-to-br from-gray-900 to-gray-700 text-white">
          <p className="text-xs text-white/70">Revenu de la plateforme</p>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight mt-1 break-words tabular-nums">
            {fcfa(s.revenuPlateforme)}
          </p>
          <p className="text-xs text-white/60 mt-2">{s.formuleRevenu}</p>
        </div>

        <Bloc className="p-4">
          <p className="text-xs text-gray-500">Chiffre d'affaires livré</p>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 mt-1 break-words tabular-nums">
            {fcfa(s.caTotal)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Marketplace {fcfa(s.caMarketplace)} · propre {fcfa(s.caPropre)}
          </p>
        </Bloc>

        <Bloc className="p-4">
          <p className="text-xs text-gray-500">Commission prélevée</p>
          <p className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900 mt-1 break-words tabular-nums">
            {fcfa(s.commission)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Taux moyen {pourcent(s.tauxCommissionMoyen)} · défaut {s.tauxCommissionDefaut} %
          </p>
        </Bloc>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
        {/* ── Détail des flux ─────────────────────────────────────────────── */}
        <Bloc className="p-4">
          <Titre>Détail des flux</Titre>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Chiffre
              libelle="Part marketplace"
              valeur={pourcent(s.partMarketplace)}
              aide="Du chiffre d'affaires total"
            />
            <Chiffre
              libelle="Marge ventes propres"
              valeur={fcfa(s.margePropre)}
              ton={s.margePropre > 0 ? 'bon' : 'critique'}
              aide="CA propre − coût d'achat"
            />
            <Chiffre
              libelle="Frais de livraison"
              valeur={fcfa(s.fraisLivraison)}
              aide="Encaissés avec les commandes livrées"
            />
            <Chiffre
              libelle="Remboursements"
              valeur={fcfa(s.remboursements)}
              ton={s.remboursements > 0 ? 'attention' : 'neutre'}
              aide={`${nombre(s.nombreRemboursements)} retour(s) remboursé(s)`}
            />
          </div>
        </Bloc>

        {/* ── Dette vendeurs ─────────────────────────────────────────────── */}
        <Bloc className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Titre>Reversements aux vendeurs</Titre>
            <Link
              to="/boutique/finance/reversements"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 hover:underline"
            >
              Gérer
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <Chiffre
              libelle="Dû aux vendeurs"
              valeur={fcfa(s.montantVendeurs)}
              aide="CA marketplace − commission, sur la période"
            />
            <Chiffre libelle="Déjà versé" valeur={fcfa(s.reversementsPayes)} ton="bon" />
            <Chiffre
              libelle="En attente"
              valeur={fcfa(s.reversementsEnAttente)}
              ton={s.reversementsEnAttente > 0 ? 'attention' : 'neutre'}
              aide={`${nombre(s.nombreReversementsEnAttente)} versement(s) enregistré(s), pas encore payé(s)`}
            />
            <Chiffre
              libelle="Versements en attente"
              valeur={nombre(s.nombreReversementsEnAttente)}
              ton={s.nombreReversementsEnAttente > 0 ? 'attention' : 'neutre'}
            />
          </div>

          {s.nombreReversementsEnAttente > 0 && (
            <p className="flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-2 mt-3">
              <Icon name="alert-triangle" size={13} className="mt-0.5 shrink-0" />
              <span>
                {nombre(s.nombreReversementsEnAttente)} versement(s) totalisant{' '}
                {fcfa(s.reversementsEnAttente)} attendent d'être payés.
              </span>
            </p>
          )}

          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
            Les reversements sont comptés sur <strong>leur propre date</strong>, pas sur celle des
            commandes : un versement de janvier peut solder des ventes de décembre.
          </p>
        </Bloc>
      </div>

      {/* ── Exemple de calcul ───────────────────────────────────────────── */}
      <Bloc className="p-4">
        <Titre>Comment se partage une vente marketplace</Titre>
        <p className="text-sm text-gray-500 mt-0.5">
          Au taux par défaut de {s.tauxCommissionDefaut} %, sur une vente de 20 000 FCFA.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vente</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{fcfa(20000)}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Commission plateforme
            </p>
            <p className="text-lg font-bold text-green-700 tabular-nums">
              {fcfa((20000 * s.tauxCommissionDefaut) / 100)}
            </p>
            <p className="text-xs text-gray-400">{s.tauxCommissionDefaut} %</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Montant vendeur
            </p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">
              {fcfa(20000 - (20000 * s.tauxCommissionDefaut) / 100)}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Un taux négocié sur le profil d'un vendeur prime sur ce taux par défaut, et s'applique
          ligne à ligne — changer un taux recalcule donc tout l'historique du vendeur.
        </p>
      </Bloc>
    </div>
  );
}
