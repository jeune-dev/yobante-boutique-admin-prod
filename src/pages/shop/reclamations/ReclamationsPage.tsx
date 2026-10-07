import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Icon from '@/shared/components/dashboard/Icon';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import Pagination from '@/shared/components/tables/Pagination';
import { Bloc, BoutonActualiser, EntetePage, Squelette } from '@/shared/components/dashboard/Blocs';
import { showError, showSuccess } from '@/shared/utils/alert';
import { CLE_ANALYTIQUE } from '@/domains/shop/hooks/useAnalytique';
import { date, nombre } from '@/shared/utils/format';
import {
  CLASSE_STATUT_SIGNALEMENT,
  LIBELLE_STATUT_SIGNALEMENT,
  LIBELLE_TYPE_SIGNALEMENT,
  signalementsApi,
  type Signalement,
  type StatutSignalement,
  type TypeSignalement,
} from '@/domains/shop/api/signalements.api';

const CLE = 'shop-signalements';

const FILTRES_STATUT: Array<{ libelle: string; valeur?: StatutSignalement }> = [
  { libelle: 'À traiter', valeur: 'en_attente' },
  { libelle: 'Traités', valeur: 'traite' },
  { libelle: 'Rejetés', valeur: 'rejete' },
  { libelle: 'Tous' },
];

const FILTRES_TYPE: Array<{ libelle: string; valeur?: TypeSignalement }> = [
  { libelle: 'Tout' },
  { libelle: 'Produits', valeur: 'produit' },
  { libelle: 'Boutiques', valeur: 'boutique' },
];

/**
 * Réclamations clients remontées depuis l'application mobile.
 *
 * L'écran ouvre par défaut sur « À traiter » : une liste qui commence par les
 * réclamations déjà closes oblige à filtrer avant de pouvoir travailler.
 */
export default function ReclamationsPage() {
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState<StatutSignalement | undefined>('en_attente');
  const [type, setType] = useState<TypeSignalement | undefined>();
  const [reponse, setReponse] = useState<Signalement | null>(null);

  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [CLE, { page, statut, type }],
    queryFn: () => signalementsApi.lister({ page, limit: 20, statut, type }),
    staleTime: 30_000,
  });

  // Le compte des réclamations ouvertes alimente aussi la page « À surveiller » :
  // traiter une réclamation ici doit y faire baisser l'alerte.
  const traiter = useMutation({
    mutationFn: ({ id, corps }: { id: string; corps: { statut: StatutSignalement; reponseAdmin?: string } }) =>
      signalementsApi.traiter(id, corps),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLE] });
      qc.invalidateQueries({ queryKey: [CLE_ANALYTIQUE, 'alertes'] });
    },
  });

  const signalements: Signalement[] = data?.signalements ?? [];
  const pagination = data?.pagination;

  const changer = (s: Signalement, nouveau: StatutSignalement) =>
    traiter.mutate(
      { id: s.id, corps: { statut: nouveau, ...(s.reponseAdmin ? { reponseAdmin: s.reponseAdmin } : {}) } },
      { onSuccess: (r) => showSuccess(r), onError: (e) => showError(e) }
    );

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Réclamations"
        soustitre={`${nombre(pagination?.total ?? signalements.length)} réclamation(s) · signalements envoyés depuis l'application.`}
      >
        <BoutonActualiser onClick={() => refetch()} enCours={isFetching} />
      </EntetePage>

      <Bloc className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap rounded-lg border border-gray-200 overflow-hidden">
            {FILTRES_STATUT.map((f) => (
              <button
                key={f.libelle}
                type="button"
                onClick={() => {
                  setStatut(f.valeur);
                  setPage(1);
                }}
                aria-pressed={statut === f.valeur}
                className={`px-2.5 py-1.5 text-xs font-medium border-r border-gray-200 last:border-r-0 transition-colors ${
                  statut === f.valeur
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.libelle}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            {FILTRES_TYPE.map((f) => (
              <button
                key={f.libelle}
                type="button"
                onClick={() => {
                  setType(f.valeur);
                  setPage(1);
                }}
                aria-pressed={type === f.valeur}
                className={`px-2.5 py-1.5 text-xs font-medium border-r border-gray-200 last:border-r-0 transition-colors ${
                  type === f.valeur ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.libelle}
              </button>
            ))}
          </div>
        </div>
      </Bloc>

      {isLoading ? (
        <Squelette tuiles={3} />
      ) : isError ? (
        <Bloc>
          <ErreurChargement
            erreur={error}
            onReessayer={refetch}
            defaut="Impossible de charger les réclamations."
          />
        </Bloc>
      ) : signalements.length === 0 ? (
        <Bloc className="p-8 text-center">
          <Icon name="check-circle" size={28} className="mx-auto text-green-500" />
          <p className="mt-3 font-semibold text-gray-900">
            {statut === 'en_attente' ? 'Aucune réclamation à traiter' : 'Aucune réclamation'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {statut === 'en_attente'
              ? 'Tout ce qui a été signalé a reçu une réponse.'
              : 'Rien ne correspond à ces filtres.'}
          </p>
        </Bloc>
      ) : (
        <>
          <div className="space-y-2.5 sm:space-y-3">
            {signalements.map((s) => (
              <Bloc key={s.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {LIBELLE_TYPE_SIGNALEMENT[s.type]}
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CLASSE_STATUT_SIGNALEMENT[s.statut]}`}
                      >
                        {LIBELLE_STATUT_SIGNALEMENT[s.statut]}
                      </span>
                      <span className="text-xs text-gray-400">{date(s.createdAt)}</span>
                    </div>

                    <p className="mt-2 font-semibold text-gray-900">{s.raison}</p>
                    {s.description && (
                      <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{s.description}</p>
                    )}

                    <p className="mt-2 text-xs text-gray-500">
                      {s.user ? (
                        <>
                          Signalé par {s.user.prenom} {s.user.nom} · {s.user.email}
                        </>
                      ) : (
                        'Auteur supprimé'
                      )}
                    </p>

                    {s.reponseAdmin && (
                      <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-2.5">
                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                          Réponse de l'équipe
                        </p>
                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">
                          {s.reponseAdmin}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setReponse(s)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      <Icon name="message-square" size={13} />
                      {s.reponseAdmin ? 'Modifier la réponse' : 'Répondre'}
                    </button>
                    {s.statut !== 'traite' && (
                      <button
                        type="button"
                        onClick={() => changer(s, 'traite')}
                        disabled={traiter.isPending}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        <Icon name="check" size={13} /> Traité
                      </button>
                    )}
                    {s.statut !== 'rejete' && (
                      <button
                        type="button"
                        onClick={() => changer(s, 'rejete')}
                        disabled={traiter.isPending}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Icon name="x" size={13} /> Rejeter
                      </button>
                    )}
                  </div>
                </div>
              </Bloc>
            ))}
          </div>

          <Bloc>
            <Pagination
              page={pagination?.page ?? page}
              totalPages={pagination?.totalPages ?? 1}
              onChange={setPage}
            />
          </Bloc>
        </>
      )}

      {reponse && (
        <ModaleReponse
          signalement={reponse}
          enCours={traiter.isPending}
          onFermer={() => setReponse(null)}
          onValider={(texte, statut) =>
            traiter.mutate(
              { id: reponse.id, corps: { statut, reponseAdmin: texte } },
              {
                onSuccess: (r) => {
                  showSuccess(r);
                  setReponse(null);
                },
                onError: (e) => showError(e),
              }
            )
          }
        />
      )}
    </div>
  );
}

function ModaleReponse({
  signalement,
  enCours,
  onFermer,
  onValider,
}: {
  signalement: Signalement;
  enCours: boolean;
  onFermer: () => void;
  onValider: (texte: string, statut: StatutSignalement) => void;
}) {
  const [texte, setTexte] = useState(signalement.reponseAdmin ?? '');
  const [statut, setStatut] = useState<StatutSignalement>(
    signalement.statut === 'en_attente' ? 'traite' : signalement.statut
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Répondre à la réclamation"
      onClick={onFermer}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Répondre à la réclamation</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <form
          className="p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!texte.trim()) return showError('La réponse ne peut pas être vide.');
            onValider(texte.trim(), statut);
          }}
        >
          <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
            <p className="text-sm font-medium text-gray-900">{signalement.raison}</p>
            {signalement.description && (
              <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">
                {signalement.description}
              </p>
            )}
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-700">Réponse</span>
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={5}
              autoFocus
              required
              placeholder="Ce qui a été vérifié et ce qui a été décidé."
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-700">Clôturer en</span>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as StatutSignalement)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
            >
              <option value="traite">Traité — la réclamation était fondée</option>
              <option value="rejete">Rejeté — aucune action nécessaire</option>
              <option value="en_attente">Laisser en attente</option>
            </select>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onFermer}
              className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={enCours}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {enCours ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
