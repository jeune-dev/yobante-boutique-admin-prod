import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import Pagination from '@/shared/components/tables/Pagination';
import {
  Bloc,
  BoutonActualiser,
  Chiffre,
  EntetePage,
  Squelette,
  Vide,
} from '@/shared/components/dashboard/Blocs';
import { showConfirm, showError, showSuccess } from '@/shared/utils/alert';
import { useChangerStatutReversement, useReversements } from '@/domains/shop/hooks/useFinance';
import { date, fcfa, nombre } from '@/shared/utils/format';
import {
  CLASSE_STATUT_REVERSEMENT,
  LIBELLE_STATUT_REVERSEMENT,
  type Reversement,
  type StatutReversement,
} from '@/domains/shop/types/finance';

const FILTRES: Array<{ libelle: string; valeur?: StatutReversement }> = [
  { libelle: 'Tous' },
  { libelle: 'En attente', valeur: 'en_attente' },
  { libelle: 'Payés', valeur: 'paye' },
  { libelle: 'Annulés', valeur: 'annule' },
];

/**
 * Journal des reversements aux vendeurs.
 *
 * Un reversement se crée depuis l'écran « Commissions », où l'on voit le
 * montant dû — le créer ici obligerait à saisir un montant de mémoire. Cet
 * écran-ci suit leur cycle de vie : en attente → payé, ou annulé.
 */
export default function ReversementsPage() {
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState<StatutReversement | undefined>();

  const { data, isLoading, isError, error, refetch, isFetching } = useReversements({
    page,
    limit: 20,
    statut,
  });
  const changer = useChangerStatutReversement();

  const reversements: Reversement[] = data?.reversements ?? [];
  const pagination = data?.pagination;

  const basculer = (r: Reversement, nouveau: StatutReversement) => {
    const nom = r.vendeur ? `${r.vendeur.prenom} ${r.vendeur.nom}` : 'ce vendeur';
    showConfirm({
      titre:
        nouveau === 'paye'
          ? 'Confirmer le paiement ?'
          : nouveau === 'annule'
            ? 'Annuler ce reversement ?'
            : 'Remettre en attente ?',
      message:
        nouveau === 'paye'
          ? `${fcfa(r.montant)} seront comptés comme versés à ${nom}, et déduits de son solde dû.`
          : nouveau === 'annule'
            ? `Le reversement ${r.reference} de ${fcfa(r.montant)} ne sera plus déduit du solde de ${nom}.`
            : `Le reversement ${r.reference} repassera en attente de paiement.`,
      confirmText: 'Confirmer',
      danger: nouveau === 'annule',
    }).then((confirme) => {
      if (!confirme) return;
      changer.mutate(
        { id: r.id, statut: nouveau },
        { onSuccess: (res) => showSuccess(res), onError: (e) => showError(e) }
      );
    });
  };

  // Totaux de la page affichée uniquement : l'API ne renvoie pas d'agrégat,
  // et la synthèse financière donne déjà les totaux de toute la période.
  const totaux = reversements.reduce(
    (s, r) => {
      const m = Number(r.montant) || 0;
      return {
        attente: s.attente + (r.statut === 'en_attente' ? m : 0),
        paye: s.paye + (r.statut === 'paye' ? m : 0),
        nbAttente: s.nbAttente + (r.statut === 'en_attente' ? 1 : 0),
      };
    },
    { attente: 0, paye: 0, nbAttente: 0 }
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Reversements"
        soustitre={`${nombre(pagination?.total ?? reversements.length)} versement(s) enregistré(s).`}
      >
        <Link
          to="/boutique/finance/commissions"
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800"
        >
          <Icon name="plus" size={15} /> Nouveau reversement
        </Link>
        <BoutonActualiser onClick={() => refetch()} enCours={isFetching} />
      </EntetePage>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
        <Chiffre
          libelle="En attente (page)"
          valeur={fcfa(totaux.attente)}
          ton={totaux.attente > 0 ? 'attention' : 'neutre'}
          aide={`${nombre(totaux.nbAttente)} versement(s) à payer`}
        />
        <Chiffre libelle="Payés (page)" valeur={fcfa(totaux.paye)} ton="bon" />
        <Chiffre
          libelle="Total enregistré"
          valeur={nombre(pagination?.total ?? 0)}
          aide="Tous statuts, toutes périodes"
        />
      </div>

      <Bloc className="p-3 sm:p-4">
        <div className="inline-flex flex-wrap rounded-lg border border-gray-200 overflow-hidden">
          {FILTRES.map((f) => (
            <button
              key={f.libelle}
              type="button"
              onClick={() => {
                setStatut(f.valeur);
                setPage(1);
              }}
              aria-pressed={statut === f.valeur}
              className={`px-3 py-2 text-sm font-medium border-r border-gray-200 last:border-r-0 transition-colors ${
                statut === f.valeur ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.libelle}
            </button>
          ))}
        </div>
      </Bloc>

      <Bloc>
        {isLoading ? (
          <Squelette tuiles={3} />
        ) : isError ? (
          <ErreurChargement
            erreur={error}
            onReessayer={refetch}
            defaut="Impossible de charger les reversements."
          />
        ) : reversements.length === 0 ? (
          <Vide
            texte={
              statut
                ? `Aucun reversement « ${LIBELLE_STATUT_REVERSEMENT[statut]} ».`
                : 'Aucun reversement enregistré. Créez-en un depuis l’écran Commissions.'
            }
          />
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="w-full text-sm tbl-cards">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                    <th className="px-3 sm:px-4 py-2.5 font-medium">Référence</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium">Vendeur</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Montant</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium">Moyen</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium">Statut</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium">Dates</th>
                    <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reversements.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <td data-label="Référence" className="px-3 sm:px-4 py-2.5 font-mono text-xs text-gray-700 whitespace-nowrap">
                        {r.reference}
                      </td>
                      <td data-label="Vendeur" className="px-3 sm:px-4 py-2.5 min-w-[140px]">
                        {r.vendeur ? (
                          <>
                            <p className="font-medium text-gray-900 truncate">
                              {r.vendeur.prenom} {r.vendeur.nom}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{r.vendeur.email}</p>
                          </>
                        ) : (
                          <span className="text-gray-400">Vendeur supprimé</span>
                        )}
                      </td>
                      <td data-label="Montant" className="px-3 sm:px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                        {fcfa(r.montant)}
                      </td>
                      <td data-label="Moyen" className="px-3 sm:px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {r.methode || '—'}
                      </td>
                      <td data-label="Statut" className="px-3 sm:px-4 py-2.5">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${CLASSE_STATUT_REVERSEMENT[r.statut]}`}
                        >
                          {LIBELLE_STATUT_REVERSEMENT[r.statut]}
                        </span>
                      </td>
                      <td data-label="Dates" className="px-3 sm:px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        <p>Créé le {date(r.createdAt)}</p>
                        {r.payeLe && <p className="text-green-700">Payé le {date(r.payeLe)}</p>}
                        {(r.periodeDebut || r.periodeFin) && (
                          <p className="text-gray-400">
                            Période {date(r.periodeDebut)} → {date(r.periodeFin)}
                          </p>
                        )}
                        {r.note && <p className="text-gray-400 italic max-w-[200px] truncate">{r.note}</p>}
                      </td>
                      <td data-label="Actions" className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          {r.statut !== 'paye' && (
                            <button
                              type="button"
                              onClick={() => basculer(r, 'paye')}
                              disabled={changer.isPending}
                              title="Marquer comme payé"
                              aria-label={`Marquer ${r.reference} comme payé`}
                              className="p-1.5 rounded-lg border border-gray-200 text-green-600 hover:bg-green-50 disabled:opacity-40"
                            >
                              <Icon name="check" size={14} />
                            </button>
                          )}
                          {r.statut === 'paye' && (
                            <button
                              type="button"
                              onClick={() => basculer(r, 'en_attente')}
                              disabled={changer.isPending}
                              title="Remettre en attente"
                              aria-label={`Remettre ${r.reference} en attente`}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                            >
                              <Icon name="refresh-cw" size={14} />
                            </button>
                          )}
                          {r.statut !== 'annule' && (
                            <button
                              type="button"
                              onClick={() => basculer(r, 'annule')}
                              disabled={changer.isPending}
                              title="Annuler"
                              aria-label={`Annuler ${r.reference}`}
                              className="p-1.5 rounded-lg border border-gray-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                            >
                              <Icon name="x" size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagination?.page ?? page}
              totalPages={pagination?.totalPages ?? 1}
              onChange={setPage}
            />
          </>
        )}
      </Bloc>

      <p className="text-xs text-gray-500">
        Un reversement annulé n'est plus déduit du solde du vendeur : sa dette réapparaît. Les
        montants « en attente » sont déjà retirés du reste dû, pour éviter de payer deux fois.
      </p>
    </div>
  );
}
