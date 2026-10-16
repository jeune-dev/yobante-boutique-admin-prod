import { useState } from 'react';
import Icon from '@/shared/components/dashboard/Icon';
import Pagination from '@/shared/components/tables/Pagination';
import SelecteurPeriode from '@/shared/components/dashboard/SelecteurPeriode';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';
import { useKpiRetours, useRetours, useTraiterRetour } from '@/domains/shop/hooks/useIndicateurs';
import {
  CLASSE_STATUT_RETOUR,
  LIBELLE_MOTIF_RETOUR,
  LIBELLE_RESPONSABILITE,
  LIBELLE_STATUT_RETOUR,
  type FiltrePeriode,
  type MotifRetour,
  type Retour,
  type StatutRetour,
} from '@/domains/shop/types/indicateurs';
import { useOuvrirLigne } from '@/shared/hooks/useOuvrirLigne';

const fcfa = (v: unknown) => `${Number(v ?? 0).toLocaleString('fr-FR')} FCFA`;
const nombre = (v: unknown) => Number(v ?? 0).toLocaleString('fr-FR');
const date = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUTS: Array<{ libelle: string; valeur?: StatutRetour }> = [
  { libelle: 'Tous' },
  { libelle: 'Demandés', valeur: 'demande' },
  { libelle: 'Acceptés', valeur: 'accepte' },
  { libelle: 'Remboursés', valeur: 'rembourse' },
  { libelle: 'Refusés', valeur: 'refuse' },
];

export default function RetoursPage() {
  const ouvrir = useOuvrirLigne();
  const [page, setPage] = useState(1);
  const [statut, setStatut] = useState<StatutRetour | undefined>();
  const [motif, setMotif] = useState<MotifRetour | undefined>();
  const [periode, setPeriode] = useState<FiltrePeriode>({ periode: 'mois' });

  const { data: statsData, isLoading: chargeStats } = useKpiRetours(periode);
  const { data, isLoading, isError, error } = useRetours({
    page,
    limit: 15,
    statut,
    motif,
    ...periode,
  });
  const traiter = useTraiterRetour();

  const retours: Retour[] = (data as any)?.retours ?? [];
  const totalPages = (data as any)?.pagination?.totalPages ?? 1;
  const total = (data as any)?.pagination?.total ?? retours.length;
  const kpi = (statsData as any)?.kpi;
  const parMotif = (statsData as any)?.parMotif ?? [];
  const maxMotif = Math.max(...parMotif.map((m: any) => Number(m.quantite) || 0), 1);

  const changerStatut = (retour: Retour, nouveau: StatutRetour) => {
    const remettre =
      nouveau === 'accepte' || nouveau === 'rembourse' ? !retour.remisEnStock : undefined;

    showConfirm({
      titre: `Passer le retour en « ${LIBELLE_STATUT_RETOUR[nouveau]} » ?`,
      message:
        remettre === true
          ? `Les ${retour.quantite} unité(s) de ${retour.produit?.nom ?? 'ce produit'} seront remises en stock.`
          : `Le retour de ${retour.produit?.nom ?? 'ce produit'} passera en « ${LIBELLE_STATUT_RETOUR[nouveau]} ».`,
      confirmText: 'Confirmer',
      danger: nouveau === 'refuse',
    }).then((confirme) => {
      if (!confirme) return;
      traiter.mutate(
        { id: retour.id, corps: { statut: nouveau, ...(remettre ? { remisEnStock: true } : {}) } },
        { onSuccess: (r) => showSuccess(r), onError: (e) => showError(e) }
      );
    });
  };

  const basculerStock = (retour: Retour) =>
    traiter.mutate(
      { id: retour.id, corps: { remisEnStock: !retour.remisEnStock } },
      { onSuccess: (r) => showSuccess(r), onError: (e) => showError(e) }
    );

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-gray-900">Retours produits</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {nombre(total)} retour(s) · taux et motifs sur la période choisie.
          </p>
        </div>
        <SelecteurPeriode valeur={periode} onChange={setPeriode} />
      </div>

      {/* ── Indicateurs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <Tuile
          icone="refresh-cw"
          libelle="Retours"
          valeur={chargeStats ? '…' : nombre(kpi?.nombreRetours)}
          sous={`${nombre(kpi?.quantiteRetournee)} article(s)`}
          teinte="bg-orange-50 text-orange-600"
        />
        <Tuile
          icone="alert-triangle"
          libelle="Taux de retour"
          valeur={chargeStats ? '…' : `${Number(kpi?.tauxRetour ?? 0).toLocaleString('fr-FR')} %`}
          sous={kpi?.formuleTauxRetour}
          teinte="bg-red-50 text-red-600"
        />
        <Tuile
          icone="package"
          libelle="Articles livrés"
          valeur={chargeStats ? '…' : nombre(kpi?.quantiteLivree)}
          sous="Base du taux de retour"
          teinte="bg-blue-50 text-blue-600"
        />
        <Tuile
          icone="coins"
          libelle="Remboursé"
          valeur={chargeStats ? '…' : fcfa(kpi?.montantRembourse)}
          teinte="bg-green-50 text-green-600"
        />
      </div>

      {/* ── Motifs de retour ─────────────────────────────────────────────── */}
      <Bloc className="p-4">
        <h2 className="font-semibold text-gray-900">Motifs des retours</h2>
        {parMotif.every((m: any) => !Number(m.quantite)) ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            Aucun retour enregistré sur la période.
          </p>
        ) : (
          <div className="space-y-2.5 mt-4">
            {parMotif
              .slice()
              .sort((a: any, b: any) => Number(b.quantite) - Number(a.quantite))
              .map((m: any) => {
                const actif = motif === m.motif;
                return (
                  <button
                    key={m.motif}
                    type="button"
                    // Les motifs servent aussi de filtre : on clique sur la
                    // barre pour voir les retours correspondants.
                    onClick={() => {
                      setMotif(actif ? undefined : (m.motif as MotifRetour));
                      setPage(1);
                    }}
                    aria-pressed={actif}
                    className={`w-full text-left rounded-lg px-2 py-1.5 transition-colors ${
                      actif ? 'bg-gray-50 ring-1 ring-gray-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{LIBELLE_MOTIF_RETOUR[m.motif as MotifRetour]}</span>
                      <span className="font-semibold text-gray-900 shrink-0 ml-2">
                        {m.quantite} <span className="font-normal text-gray-400">({m.nombre})</span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full"
                        style={{ width: `${Math.round((Number(m.quantite) / maxMotif) * 100)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            {motif && (
              <p className="text-xs text-gray-400 pt-1">
                Filtré sur « {LIBELLE_MOTIF_RETOUR[motif]} » —{' '}
                <button
                  type="button"
                  onClick={() => setMotif(undefined)}
                  className="underline hover:text-gray-600"
                >
                  tout afficher
                </button>
              </p>
            )}
          </div>
        )}
      </Bloc>

      {/* ── Liste ────────────────────────────────────────────────────────── */}
      <Bloc className="p-4">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {STATUTS.map((s) => (
            <button
              key={s.libelle}
              type="button"
              onClick={() => {
                setStatut(s.valeur);
                setPage(1);
              }}
              aria-pressed={statut === s.valeur}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                statut === s.valeur
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s.libelle}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-8 text-center">
            <Icon name="alert-triangle" size={24} className="mx-auto text-red-400" />
            <p className="mt-2 text-sm text-gray-600">
              {(error as any)?.message ?? 'Impossible de charger les retours'}
            </p>
          </div>
        ) : retours.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">
            Aucun retour pour ces critères.
          </p>
        ) : (
          <>
            <div className="tbl-wrap">
              <table className="w-full text-sm tbl-cards">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase">
                    <th className="pb-2 font-medium">Produit</th>
                    <th className="pb-2 font-medium">Commande</th>
                    <th className="pb-2 font-medium">Qté</th>
                    <th className="pb-2 font-medium">Motif</th>
                    <th className="pb-2 font-medium">Imputé à</th>
                    <th className="pb-2 font-medium">Stock</th>
                    <th className="pb-2 font-medium">Statut</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {retours.map((r) => (
                    <tr key={r.id} {...ouvrir(r.commande?.id ? `/boutique/commandes/${r.commande.id}` : undefined)} className="border-t border-gray-50">
                      <td className="py-2.5 text-gray-900 tbl-primary">
                        {r.produit?.nom ?? '— produit supprimé'}
                      </td>
                      <td className="py-2.5 font-mono text-xs text-gray-500" data-label="Commande">
                        {r.commande?.reference ?? '—'}
                      </td>
                      <td className="py-2.5 text-gray-700" data-label="Qté">
                        {r.quantite}
                      </td>
                      <td className="py-2.5 text-gray-700" data-label="Motif">
                        {LIBELLE_MOTIF_RETOUR[r.motif]}
                        {r.motifDetail && (
                          <span className="block text-xs text-gray-400 truncate max-w-[16rem]">
                            {r.motifDetail}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-gray-600" data-label="Imputé à">
                        {r.responsabilite ? LIBELLE_RESPONSABILITE[r.responsabilite] : '—'}
                        {r.vendeurResponsable && (
                          <span className="block text-xs text-gray-400">
                            {r.vendeurResponsable.prenom} {r.vendeurResponsable.nom}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5" data-label="Stock">
                        <button
                          type="button"
                          onClick={() => basculerStock(r)}
                          disabled={traiter.isPending}
                          title={
                            r.remisEnStock
                              ? 'Retirer du stock (le produit est en réalité inutilisable)'
                              : 'Remettre les unités en stock'
                          }
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold disabled:opacity-50 ${
                            r.remisEnStock
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {r.remisEnStock ? 'Remis' : 'Non remis'}
                        </button>
                      </td>
                      <td className="py-2.5" data-label="Statut">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CLASSE_STATUT_RETOUR[r.statut]}`}
                        >
                          {LIBELLE_STATUT_RETOUR[r.statut]}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-400 whitespace-nowrap" data-label="Date">
                        {date(r.createdAt)}
                      </td>
                      <td className="py-2.5 text-right" data-label="Actions">
                        <div className="inline-flex gap-1">
                          {r.statut === 'demande' && (
                            <>
                              <BoutonAction
                                onClick={() => changerStatut(r, 'accepte')}
                                disabled={traiter.isPending}
                              >
                                Accepter
                              </BoutonAction>
                              <BoutonAction
                                onClick={() => changerStatut(r, 'refuse')}
                                disabled={traiter.isPending}
                                danger
                              >
                                Refuser
                              </BoutonAction>
                            </>
                          )}
                          {r.statut === 'accepte' && (
                            <BoutonAction
                              onClick={() => changerStatut(r, 'rembourse')}
                              disabled={traiter.isPending}
                            >
                              Rembourser
                            </BoutonAction>
                          )}
                          {(r.statut === 'rembourse' || r.statut === 'refuse') && (
                            <span className="text-xs text-gray-400">
                              {r.montantRembourse ? fcfa(r.montantRembourse) : 'Clos'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4">
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </Bloc>
    </div>
  );
}

// ── Composants de présentation ────────────────────────────────────────────

function Bloc({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
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
    <Bloc className="p-3.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${teinte}`}>
        <Icon name={icone} size={16} />
      </div>
      <p className="text-lg sm:text-xl font-bold text-gray-900 mt-2 break-words tabular-nums">{valeur}</p>
      <p className="text-[13px] text-gray-500 leading-tight">{libelle}</p>
      {sous && <p className="text-xs text-gray-400 leading-tight">{sous}</p>}
    </Bloc>
  );
}

function BoutonAction({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
        danger
          ? 'border-red-200 text-red-600 hover:bg-red-50'
          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}
