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
} from '@/shared/components/dashboard/Blocs';
import { useIndicateursClients } from '@/domains/shop/hooks/useAnalytique';
import { bornesDepuisPeriode, decimal, fcfa, libelleBornes, nombre, pourcent } from '@/shared/utils/format';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';

/**
 * Indicateurs clients : acquisition sur la période, fidélité sur toute la base.
 *
 * Les deux familles n'ont volontairement pas le même périmètre — le réachat
 * d'un client inscrit l'an dernier compte autant que celui d'un nouveau, et
 * le restreindre à la période donnerait un taux de fidélité toujours proche
 * de zéro. L'écran le dit plutôt que de laisser croire à une incohérence.
 */
export default function ClientsAnalyticsPage() {
  const [periode, setPeriode] = useState<FiltrePeriode>({ periode: 'mois' });
  const { data, isLoading, isError, error, refetch, isFetching } = useIndicateursClients(
    bornesDepuisPeriode(periode)
  );

  if (isLoading) return <Squelette tuiles={4} />;

  if (isError) {
    return (
      <Bloc>
        <ErreurChargement
          erreur={error}
          onReessayer={refetch}
          defaut="Impossible de charger les indicateurs clients."
        />
      </Bloc>
    );
  }

  const c = data!.clients;
  const nonAcheteurs = Math.max(0, c.clientsTotal - c.acheteurs);
  const fideles = Math.max(0, c.acheteurs - c.inactifs);

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Analytique clients"
        soustitre={`Acquisition, conversion et fidélité · ${libelleBornes(data!.periode)}`}
      >
        <SelecteurPeriode valeur={periode} onChange={setPeriode} />
        <BoutonActualiser onClick={() => refetch()} enCours={isFetching} />
      </EntetePage>

      {/* ── Acquisition : bornée par la période ──────────────────────────── */}
      <Bloc className="p-4">
        <Titre aide="Calculé sur les comptes créés pendant la période choisie">
          Acquisition sur la période
        </Titre>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Chiffre libelle="Nouveaux clients" valeur={nombre(c.inscrits)} aide="Comptes créés sur la période" />
          <Chiffre
            libelle="Ont commandé"
            valeur={nombre(c.convertis)}
            ton={c.convertis > 0 ? 'bon' : 'neutre'}
            aide="Parmi les nouveaux inscrits"
          />
          <Chiffre
            libelle="Taux de conversion"
            valeur={pourcent(c.tauxConversion)}
            aide={c.formuleTauxConversion}
          />
          <Chiffre
            libelle="Délai avant 1er achat"
            valeur={c.joursAvantPremierAchat === null ? '—' : `${decimal(c.joursAvantPremierAchat, 1)} j`}
            aide="Temps moyen entre l'inscription et la première commande"
          />
        </div>

        <div className="mt-3">
          <Reserve>
            Ce taux de conversion rapporte les <strong>inscrits qui ont commandé</strong> aux
            inscrits de la période. Le taux visiteurs → commandes demandé au cahier des charges
            exige un suivi des visites qui n'existe pas encore en base.
          </Reserve>
        </div>
      </Bloc>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
        {/* ── Fidélité : toute la base ──────────────────────────────────── */}
        <Bloc className="p-4">
          <Titre aide="Calculé sur l'ensemble des clients, toutes périodes confondues">
            Fidélité (base complète)
          </Titre>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Chiffre libelle="Clients au total" valeur={nombre(c.clientsTotal)} />
            <Chiffre libelle="Acheteurs" valeur={nombre(c.acheteurs)} aide="Ont passé au moins une commande" />
            <Chiffre
              libelle="Taux de réachat"
              valeur={pourcent(c.tauxReachat)}
              ton={c.tauxReachat >= 30 ? 'bon' : 'attention'}
              aide="Acheteurs ayant commandé plus d'une fois"
            />
            <Chiffre
              libelle="Taux de churn"
              valeur={pourcent(c.tauxChurn)}
              ton={c.tauxChurn >= 50 ? 'critique' : c.tauxChurn >= 25 ? 'attention' : 'bon'}
              aide={`Aucune commande depuis ${c.fenetreChurnJours} jours`}
            />
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
            <Chiffre
              libelle="Valeur vie client"
              valeur={fcfa(c.valeurVieClient)}
              aide="Dépense moyenne déjà réalisée par acheteur"
            />
            <Chiffre
              libelle="Commandes / acheteur"
              valeur={decimal(c.commandesParAcheteur)}
              aide="Nombre moyen de commandes par client acheteur"
            />
          </div>

          <p className="text-xs text-gray-500 mt-3">
            La valeur vie client affichée est la dépense <strong>déjà constatée</strong>, non une
            projection : sans durée de vie observable, panier × fréquence × fidélité serait une
            estimation inventée.
          </p>
        </Bloc>

        {/* ── Répartition de la base ─────────────────────────────────────── */}
        <Bloc className="p-4">
          <Titre>Où en est la base client</Titre>
          <div className="mt-4 space-y-3">
            <Barre
              libelle="Clients fidèles"
              valeur={nombre(fideles)}
              max={Math.max(c.clientsTotal, 1)}
              couleur="bg-green-500"
              detail="Ont acheté et sont restés actifs"
            />
            <Barre
              libelle="Clients inactifs"
              valeur={nombre(c.inactifs)}
              max={Math.max(c.clientsTotal, 1)}
              couleur="bg-orange-500"
              detail={`Ont acheté, mais rien depuis ${c.fenetreChurnJours} jours — cible de relance`}
            />
            <Barre
              libelle="Inscrits sans achat"
              valeur={nombre(nonAcheteurs)}
              max={Math.max(c.clientsTotal, 1)}
              couleur="bg-gray-300"
              detail="Compte créé, aucune commande — jamais convertis"
            />
          </div>

          <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
            Un inscrit sans achat n'est pas un client perdu : il n'a jamais été gagné. Les deux
            cas appellent des actions différentes, d'où leur séparation.
          </p>
        </Bloc>
      </div>
    </div>
  );
}
