import { useState } from 'react';
import { useConfirmerPaiement, usePayments, useRembourser } from '@/domains/shop/hooks/usePayments';
import { Payment } from '@/domains/shop/api/payments.api';
import { showError, showSuccess, showConfirm } from '@/shared/utils/alert';
import { libelleStatut } from '@/domains/shop/statutsCommande';
import Pagination from '@/shared/components/tables/Pagination';
import { useOuvrirLigne } from '@/shared/hooks/useOuvrirLigne';
import Icon from '@/shared/components/dashboard/Icon';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import { Bloc, EntetePage } from '@/shared/components/dashboard/Blocs';
import { fcfa, nombre } from '@/shared/utils/format';

const fmtFcfa = fcfa;
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUTS: Record<string, { label: string; cls: string }> = {
  en_attente: { label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
  succes:     { label: 'Succès',     cls: 'bg-green-50 text-green-700' },
  // Code du serveur : `echoue` (`echec` est refusé avec une erreur 400).
  echoue:     { label: 'Échoué',     cls: 'bg-red-50 text-red-700' },
  rembourse:  { label: 'Remboursé',  cls: 'bg-gray-100 text-gray-700' },
};

const METHODES: Record<string, { label: string; cls: string }> = {
  wave:           { label: 'Wave',            cls: 'bg-sky-50 text-sky-700' },
  orange_money:   { label: 'Orange Money',    cls: 'bg-orange-50 text-orange-700' },
  carte:          { label: 'Carte',           cls: 'bg-indigo-50 text-indigo-700' },
  cash_livraison: { label: 'À la livraison',  cls: 'bg-gray-100 text-gray-700' },
};

export default function PaymentsPage() {
  const ouvrir = useOuvrirLigne();
  const [page, setPage] = useState(1);
  const [statutFilter, setStatutFilter] = useState('');

  const { data, isLoading, isError, error, refetch } = usePayments({ page, limit: 15, statut: statutFilter || undefined });
  const rembourserMut = useRembourser();
  const confirmerMut = useConfirmerPaiement();

  // Le backend renvoie { paiements, pagination: { total, totalPages, page, limit } }.
  const payments = (data as any)?.paiements ?? [];
  const totalPages = (data as any)?.pagination?.totalPages ?? 1;
  const count = (data as any)?.pagination?.total ?? payments.length;

  const totalSucces = payments
    .filter((p: Payment) => p.statut === 'succes')
    .reduce((a: number, p: Payment) => a + Number(p.montant), 0);

  const confirmerRemboursement = (p: Payment) => {
    showConfirm({
      titre: 'Confirmer le remboursement',
      message: `Rembourser ${fmtFcfa(Number(p.montant))} pour la commande #${p.commandeId?.slice(0, 8).toUpperCase() ?? ''} ?`,
      confirmText: 'Confirmer',
      danger: true,
    }).then((confirme) => {
      if (!confirme) return;
      rembourserMut.mutate(p.id, {
        onSuccess: (data) => showSuccess(data),
      });
    });
  };

  const confirmerPaiement = (p: Payment) => {
    showConfirm({
      titre: 'Confirmer le paiement',
      message: `Enregistrer ${fmtFcfa(Number(p.montant))} comme reçu pour la commande #${p.commandeId?.slice(0, 8).toUpperCase() ?? ''} ?`,
      confirmText: 'Confirmer la réception',
    }).then((confirme) => {
      if (!confirme) return;
      confirmerMut.mutate(p.id, {
        onSuccess: (data) => showSuccess(data),
        onError: (e) => showError(e),
      });
    });
  };

  const FILTRES = [
    { label: 'Tous', val: '' },
    { label: 'Succès', val: 'succes' },
    { label: 'En attente', val: 'en_attente' },
    { label: 'Échoués', val: 'echoue' },
    { label: 'Remboursés', val: 'rembourse' },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Paiements"
        soustitre={`${nombre(count)} paiement${count > 1 ? 's' : ''} au total`}
      >
        {totalSucces > 0 && (
          <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-2 text-right">
            <p className="text-xs font-medium text-green-700">Total encaissé (page)</p>
            <p className="text-lg font-bold text-green-800 tabular-nums">{fmtFcfa(totalSucces)}</p>
          </div>
        )}
      </EntetePage>

      <Bloc>
        <div className="p-3 sm:p-4 border-b border-gray-100">
          <div className="segments">
            {FILTRES.map((f) => (
              <button
                key={f.val}
                type="button"
                onClick={() => { setStatutFilter(f.val); setPage(1); }}
                aria-pressed={statutFilter === f.val}
                className={`segment ${statutFilter === f.val ? 'actif' : ''}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : isError ? (
          <ErreurChargement erreur={error} onReessayer={() => refetch()} defaut="Impossible de charger les paiements." />
        ) : payments.length === 0 ? (
          <div className="p-10 text-center">
            <Icon name="wallet" size={28} className="mx-auto text-gray-300" />
            <p className="mt-3 font-semibold text-gray-900">Aucun paiement</p>
            <p className="mt-1 text-sm text-gray-500">Rien ne correspond à ce filtre.</p>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="text-left">
                  <th className="px-4">Commande</th>
                  <th className="px-4">Client</th>
                  <th className="px-4">Méthode</th>
                  <th className="px-4">Montant</th>
                  <th className="px-4">Statut</th>
                  <th className="px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: Payment) => {
                  const s = STATUTS[p.statut];
                  const m = METHODES[p.methode];
                  const commande = (p as any).commande ?? (p as any).Commande;
                  // L'API renvoie le client au premier niveau du paiement (`user`).
                  const user = p.user ?? (p as any).User ?? commande?.user ?? commande?.User;
                  const statutCommande: string | undefined = commande?.statut;
                  // Le serveur ne fait pas suivre le paiement quand la commande
                  // avance : on montre l'écart pour qu'il ne passe pas inaperçu.
                  const aConfirmer = p.statut === 'en_attente' && statutCommande === 'livree';
                  const sansObjet =
                    p.statut === 'en_attente' && (statutCommande === 'annulee' || statutCommande === 'rejetee');
                  return (
                    <tr
                      key={p.id}
                      {...ouvrir(p.commandeId ? `/boutique/commandes/${p.commandeId}` : undefined)}
                      className="border-b border-gray-50 last:border-0"
                    >
                      {/* Référence et date ensemble, comme sur la liste des commandes. */}
                      <td className="px-4 tbl-primary">
                        <p className="font-mono text-[13px] font-semibold text-gray-900 whitespace-nowrap">
                          #{p.commandeId?.slice(0, 8).toUpperCase() ?? '—'}
                        </p>
                        <p className="text-[13px] text-gray-500 mt-0.5 whitespace-nowrap">
                          {p.payeAt ? fmtDate(p.payeAt) : p.createdAt ? fmtDate(p.createdAt) : '—'}
                        </p>
                      </td>
                      <td className="px-4" data-label="Client">
                        {user ? (
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 whitespace-nowrap">{user.prenom} {user.nom}</p>
                            {user.email && (
                              <p className="max-w-[240px] truncate text-[13px] text-gray-500" title={user.email}>
                                {user.email}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Client inconnu</span>
                        )}
                      </td>
                      <td className="px-4" data-label="Méthode">
                        {/* Le backend expose `methode`, pas `methodePaiement`. */}
                        <span className={`badge ${m?.cls ?? 'bg-gray-100 text-gray-700'}`}>
                          {m?.label ?? p.methode ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 whitespace-nowrap" data-label="Montant">
                        <p className="font-semibold text-gray-900 tabular-nums text-right md:text-left">
                          {fmtFcfa(Number(p.montant))}
                        </p>
                      </td>
                      <td className="px-4" data-label="Statut">
                        <div className="flex flex-col items-end gap-1 md:items-start">
                          <span className={`badge ${s?.cls ?? 'bg-gray-100 text-gray-700'}`}>
                            {s?.label ?? p.statut}
                          </span>
                          {statutCommande && (
                            <span
                              className={`text-xs ${aConfirmer ? 'font-medium text-orange-700' : 'text-gray-500'}`}
                            >
                              Commande {libelleStatut(statutCommande).toLowerCase()}
                              {aConfirmer && ' · à confirmer'}
                              {sansObjet && ' · paiement sans objet'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 tbl-actions" data-label="Actions">
                        <div className="flex items-center justify-end gap-1">
                          {p.statut === 'en_attente' && !sansObjet ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); confirmerPaiement(p); }}
                              disabled={confirmerMut.isPending}
                              title="Enregistrer ce paiement comme reçu"
                              className={`${aConfirmer ? 'btn-sombre' : 'btn-secondaire'} btn-sm`}
                            >
                              <Icon name="check" size={13} /> Confirmer
                            </button>
                          ) : p.statut === 'succes' ? (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); confirmerRemboursement(p); }}
                              disabled={rembourserMut.isPending}
                              className="btn-danger-doux btn-sm"
                            >
                              <Icon name="refresh-cw" size={13} /> Rembourser
                            </button>
                          ) : (
                            <Icon name="chevron-right" size={16} className="text-gray-300" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </Bloc>
    </div>
  );
}
