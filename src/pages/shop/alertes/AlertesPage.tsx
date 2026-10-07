import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import {
  Bloc,
  BoutonActualiser,
  EntetePage,
  Squelette,
} from '@/shared/components/dashboard/Blocs';
import { useAlertes } from '@/domains/shop/hooks/useAnalytique';
import { fcfa, nombre } from '@/shared/utils/format';
import {
  CLASSE_GRAVITE,
  PUCE_GRAVITE,
  type Alerte,
} from '@/domains/shop/types/analytique';

/** Seuils d'annulation proposés, en pourcentage. */
const SEUILS = [3, 5, 10];

/**
 * « À surveiller » — ce qui exige une décision, pas un tableau de chiffres.
 *
 * Les rubriques à zéro restent affichées : une liste dont les entrées
 * apparaissent et disparaissent à chaque chargement est illisible, et
 * « 0 produit en rupture » est une information en soi.
 */
export default function AlertesPage() {
  const [seuilAnnulation, setSeuilAnnulation] = useState(5);
  const { data, isLoading, isError, error, refetch, isFetching } = useAlertes({
    seuilAnnulation,
    limiteExemples: 10,
  });

  if (isLoading) return <Squelette tuiles={3} />;

  if (isError) {
    return (
      <Bloc>
        <ErreurChargement
          erreur={error}
          onReessayer={refetch}
          defaut="Impossible de charger les points à surveiller."
        />
      </Bloc>
    );
  }

  const alertes: Alerte[] = data?.alertes ?? [];
  const synthese = data?.synthese;
  const indisponibles = data?.indisponibles ?? [];

  const critiques = alertes.filter((a) => a.gravite === 'critique');
  const attentions = alertes.filter((a) => a.gravite === 'attention');
  const toutVaBien = alertes.every((a) => a.nombre === 0);

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="À surveiller"
        soustitre={
          toutVaBien
            ? 'Aucun point de vigilance en ce moment.'
            : `${nombre(synthese?.total)} point(s) de vigilance · ${nombre(synthese?.critiques)} rubrique(s) critique(s).`
        }
      >
        <div className="inline-flex items-center gap-1.5 text-xs">
          <span className="text-gray-500">Seuil d'annulation</span>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            {SEUILS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeuilAnnulation(s)}
                aria-pressed={seuilAnnulation === s}
                className={`px-2.5 py-1.5 text-xs font-medium border-r border-gray-200 last:border-r-0 transition-colors ${
                  seuilAnnulation === s
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s} %
              </button>
            ))}
          </div>
        </div>
        <BoutonActualiser onClick={() => refetch()} enCours={isFetching} />
      </EntetePage>

      {toutVaBien && (
        <Bloc className="p-8 text-center">
          <Icon name="check-circle" size={28} className="mx-auto text-green-500" />
          <p className="mt-3 font-semibold text-gray-900">Rien à signaler</p>
          <p className="mt-1 text-sm text-gray-500">
            Aucune rupture, aucun retard, aucun vendeur hors seuil.
          </p>
        </Bloc>
      )}

      {/* Les critiques d'abord : c'est l'ordre dans lequel on doit agir. */}
      {critiques.length > 0 && <GroupeAlertes titre="Critique" alertes={critiques} />}
      {attentions.length > 0 && <GroupeAlertes titre="À surveiller" alertes={attentions} />}

      {indisponibles.length > 0 && (
        <Bloc className="p-4">
          <h2 className="font-semibold text-gray-900">Non mesurable pour l'instant</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Ces points ne sont pas surveillés faute de données en base — leur absence d'alerte
            ne veut pas dire que tout va bien.
          </p>
          <ul className="mt-3 space-y-2">
            {indisponibles.map((i) => (
              <li key={i.cle} className="flex items-start gap-2 text-sm">
                <Icon name="eye-off" size={15} className="mt-0.5 text-gray-400 shrink-0" />
                <span>
                  <span className="font-medium text-gray-800">{i.libelle}</span>
                  <span className="text-gray-500"> — {i.raison}</span>
                </span>
              </li>
            ))}
          </ul>
        </Bloc>
      )}
    </div>
  );
}

function GroupeAlertes({ titre, alertes }: { titre: string; alertes: Alerte[] }) {
  return (
    <section className="space-y-2.5 sm:space-y-3">
      <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{titre}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
        {alertes.map((a) => (
          <CarteAlerte key={a.cle} alerte={a} />
        ))}
      </div>
    </section>
  );
}

function CarteAlerte({ alerte }: { alerte: Alerte }) {
  const vide = alerte.nombre === 0;

  return (
    <Bloc className={`p-4 ${vide ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tabular-nums ${
                vide ? 'text-gray-400' : alerte.gravite === 'critique' ? 'text-red-600' : 'text-orange-600'
              }`}
            >
              {nombre(alerte.nombre)}
            </span>
            <span className="text-sm text-gray-700">{alerte.libelle}</span>
          </p>
          {/* Dix versements de 500 F et dix de 500 000 F n'appellent pas la
              même réaction : le montant en jeu accompagne le décompte. */}
          {typeof alerte.montant === 'number' && alerte.montant > 0 && (
            <p className="text-xs text-gray-500 mt-1">{fcfa(alerte.montant)} en jeu</p>
          )}
        </div>
        <span
          className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
            vide ? 'bg-gray-50 text-gray-500 border-gray-200' : CLASSE_GRAVITE[alerte.gravite]
          }`}
        >
          <span aria-hidden="true">{vide ? '🟢' : PUCE_GRAVITE[alerte.gravite]} </span>
          {vide ? 'Rien' : alerte.gravite === 'critique' ? 'Critique' : 'Attention'}
        </span>
      </div>

      {alerte.exemples.length > 0 && (
        <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
          {alerte.exemples.map((e) => (
            <li key={`${alerte.cle}-${e.id}`} className="py-2">
              <p className="text-sm font-medium text-gray-800 truncate">{e.libelle}</p>
              <p className="text-xs text-gray-500">{e.detail}</p>
            </li>
          ))}
        </ul>
      )}

      {!vide && (
        <Link
          to={alerte.lien}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900 hover:underline"
        >
          Traiter <Icon name="arrow-right" size={14} />
        </Link>
      )}
    </Bloc>
  );
}
