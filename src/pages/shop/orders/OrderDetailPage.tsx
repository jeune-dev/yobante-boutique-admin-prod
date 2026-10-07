import { useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminBackButton from '@/shared/components/AdminBackButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError } from '@/shared/utils/alert';
import { useAnnulerCommande, useModifierCommande } from '@/domains/shop/hooks/useIndicateurs';
import {
  LIBELLE_RESPONSABILITE,
  type EntreeHistorique,
  type Responsabilite,
} from '@/domains/shop/types/indicateurs';

/** Statuts clos : ni modifiables, ni annulables. */
const STATUTS_CLOS = ['livree', 'annulee', 'rejetee'];

const RESPONSABILITES: Responsabilite[] = ['vendeur', 'client', 'transport', 'autre'];

const api = {
  getCommande: (id: string) =>
    shopClient.get(`/admin/commandes/${id}`).then((r: any) => r.commande ?? r),
  valider: (id: string) => shopClient.patch(`/admin/commandes/${id}/valider`),
  rejeter: (id: string, motif?: string) =>
    shopClient.patch(`/admin/commandes/${id}/rejeter`, { motif }),
};

const STATUT_COLORS: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  validee: 'bg-blue-100 text-blue-700',
  en_preparation: 'bg-purple-100 text-purple-700',
  expediee: 'bg-indigo-100 text-indigo-700',
  livree: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
  rejetee: 'bg-red-100 text-red-700',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectMotif, setRejectMotif] = useState('');

  // ── Annulation ───────────────────────────────────────────────────────────
  const [modaleAnnulation, setModaleAnnulation] = useState(false);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [responsabiliteAnnulation, setResponsabiliteAnnulation] = useState<Responsabilite | ''>('');

  // ── Modification des quantités ───────────────────────────────────────────
  // `quantites` n'est renseigné qu'en mode édition ; hors édition, les
  // quantités affichées restent celles de la commande.
  const [modeEdition, setModeEdition] = useState(false);
  const [quantites, setQuantites] = useState<Record<string, number>>({});
  const [modaleModification, setModaleModification] = useState(false);
  const [motifModification, setMotifModification] = useState('');
  const [responsabiliteModification, setResponsabiliteModification] = useState<Responsabilite | ''>('');

  const annuler = useAnnulerCommande();
  const modifier = useModifierCommande();

  const { data: commande, isLoading } = useQuery({
    queryKey: ['commande', id],
    queryFn: () => api.getCommande(id!),
    enabled: !!id,
  });

  const validerMutation = useMutation({
    mutationFn: () => api.valider(id!),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['commande', id] });
      qc.invalidateQueries({ queryKey: ['commandes'] });
      showSuccess(data);
    },
  });

  const rejeterMutation = useMutation({
    mutationFn: ({ motif }: { motif: string }) => api.rejeter(id!, motif),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['commande', id] });
      qc.invalidateQueries({ queryKey: ['commandes'] });
      showSuccess(data);
      setShowRejectModal(false);
      setRejectMotif('');
    },
    onError: (e: any) => showError(e),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <AdminBackButton parent="/boutique/commandes" className="mb-3" />
        <div className="p-8 text-center text-gray-400">Chargement…</div>
      </div>
    );
  }

  if (!commande) {
    return (
      <div className="max-w-3xl mx-auto">
        <AdminBackButton parent="/boutique/commandes" className="mb-3" />
        <div className="p-8 text-center text-red-400">Commande introuvable</div>
      </div>
    );
  }

  const items = commande.items || commande.CommandeItems || [];

  return (
    <div className="max-w-3xl mx-auto">
      <AdminBackButton parent="/boutique/commandes" className="mb-3" />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">
          Commande {commande.reference}
        </h1>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            STATUT_COLORS[commande.statut] || 'bg-gray-100'
          }`}
        >
          {commande.statut}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Client</p>
          <p className="font-semibold">
            {commande.user?.prenom} {commande.user?.nom}
          </p>
          <p className="text-sm text-gray-500">{commande.user?.email}</p>
          <p className="text-sm text-gray-500">{commande.user?.telephone}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Livraison</p>
          <p className="font-semibold">{commande.adresse?.ville || '—'}</p>
          <p className="text-sm text-gray-500">{commande.adresse?.rue || ''}</p>
          <p className="text-sm text-gray-500 mt-1">
            {/* Le backend renvoie le paiement comme association (`paiement.methode`). */}
            Paiement : {commande.paiement?.methode ?? commande.methodePaiement ?? '—'}
            {commande.paiement?.statut ? ` (${commande.paiement.statut})` : ''}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Articles</h2>
        </div>
        <div className="tbl-wrap">
          <table className="w-full text-sm tbl-cards">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-medium text-gray-500">Produit</th>
                <th className="p-4 font-medium text-gray-500">Qté</th>
                <th className="p-4 font-medium text-gray-500">Prix unit.</th>
                <th className="p-4 font-medium text-gray-500">Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="p-4 tbl-primary">{item.produit?.nom || item.Produit?.nom || `Produit #${item.produitId}`}</td>
                  <td className="p-4" data-label="Qté">
                    {modeEdition ? (
                      <input
                        type="number"
                        min={0}
                        value={quantites[item.produitId] ?? item.quantite}
                        onChange={(e) =>
                          setQuantites((q) => ({
                            ...q,
                            [item.produitId]: Math.max(0, Number(e.target.value)),
                          }))
                        }
                        aria-label={`Quantité pour ${item.produit?.nom ?? 'cet article'}`}
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      />
                    ) : (
                      item.quantite
                    )}
                  </td>
                  <td className="p-4 whitespace-nowrap" data-label="Prix unit.">{item.prixUnitaire?.toLocaleString('fr-FR')} FCFA</td>
                  <td className="p-4 font-medium whitespace-nowrap" data-label="Sous-total">{item.sousTotal?.toLocaleString('fr-FR')} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end p-4 border-t border-gray-100">
          <span className="font-bold text-lg">
            Total : {commande.montantTotal?.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      </div>

      {commande.motifRejet && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-red-900 mb-2">Motif du rejet :</p>
          <p className="text-sm text-red-700 whitespace-pre-wrap">{commande.motifRejet}</p>
        </div>
      )}

      {commande.motifAnnulation && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-medium text-red-900 mb-2">
            Commande annulée
            {commande.annulePar ? ` par l'${commande.annulePar}` : ''}
            {commande.annuleeAt
              ? ` le ${new Date(commande.annuleeAt).toLocaleDateString('fr-FR')}`
              : ''}
          </p>
          <p className="text-sm text-red-700 whitespace-pre-wrap">{commande.motifAnnulation}</p>
          {commande.responsabiliteAnnulation && (
            <p className="text-xs text-red-600 mt-2">
              Imputée à :{' '}
              <strong>
                {LIBELLE_RESPONSABILITE[commande.responsabiliteAnnulation as Responsabilite]}
              </strong>
              {commande.vendeurResponsable
                ? ` — ${commande.vendeurResponsable.prenom} ${commande.vendeurResponsable.nom}`
                : ''}
            </p>
          )}
        </div>
      )}

      {/* Journal des retouches : c'est lui qui permet de justifier un écart de
          montant auprès du client et d'alimenter le suivi des vendeurs. */}
      {Array.isArray(commande.historiqueModifications) &&
        commande.historiqueModifications.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                Historique ({commande.historiqueModifications.length})
              </h2>
            </div>
            <ul className="divide-y divide-gray-50">
              {(commande.historiqueModifications as EntreeHistorique[])
                .slice()
                .reverse()
                .map((entree, i) => (
                  <li key={`${entree.date}-${i}`} className="p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">{entree.motif}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(entree.date).toLocaleString('fr-FR')}
                      </p>
                    </div>
                    {entree.responsabilite && (
                      <p className="text-xs text-gray-500 mt-1">
                        Imputé à {LIBELLE_RESPONSABILITE[entree.responsabilite]}
                      </p>
                    )}
                    {!!entree.changements?.length && (
                      <ul className="mt-2 space-y-0.5">
                        {entree.changements.map((c, j) => (
                          <li key={j} className="text-xs text-gray-600">
                            <span className="text-gray-400">{c.champ}</span>
                            {c.produit ? ` · ${c.produit}` : ''} : {String(c.avant ?? '—')} →{' '}
                            <strong>{String(c.apres ?? '—')}</strong>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        )}

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        {commande.statut === 'en_attente' && (
          <>
            <button
              onClick={() => validerMutation.mutate()}
              disabled={validerMutation.isPending}
              className="px-4 py-2.5 sm:py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-60"
            >
              Valider la commande
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={rejeterMutation.isPending}
              className="px-4 py-2.5 sm:py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-60"
            >
              Rejeter
            </button>
          </>
        )}

        {/* Modifier et annuler restent ouverts tant que la commande n'est pas
            clôturée : une commande déjà expédiée peut encore être interrompue.
            Une commande livrée relève du retour produit, pas de l'annulation. */}
        {!STATUTS_CLOS.includes(commande.statut) && (
          <>
            {modeEdition ? (
              <>
                <button
                  onClick={() => setModaleModification(true)}
                  disabled={modifier.isPending}
                  className="px-4 py-2.5 sm:py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-60"
                >
                  Enregistrer les quantités
                </button>
                <button
                  onClick={() => {
                    setModeEdition(false);
                    setQuantites({});
                  }}
                  className="px-4 py-2.5 sm:py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Abandonner la modification
                </button>
              </>
            ) : (
              <button
                onClick={() => setModeEdition(true)}
                className="px-4 py-2.5 sm:py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Modifier les quantités
              </button>
            )}
            <button
              onClick={() => setModaleAnnulation(true)}
              disabled={annuler.isPending}
              className="px-4 py-2.5 sm:py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              Annuler la commande
            </button>
          </>
        )}

        {commande.statut === 'livree' && (
          <p className="text-sm text-gray-500 self-center">
            Commande livrée : un problème se traite désormais par un retour produit.
          </p>
        )}
      </div>

      {/* Modal de rejet */}
      {showRejectModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Rejeter la commande">
          <div className="modal-box max-w-md">
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Rejeter la commande
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez indiquer le motif du rejet. Ce motif sera visible au client.
              </p>
              <textarea
                value={rejectMotif}
                onChange={(e) => setRejectMotif(e.target.value)}
                placeholder="Motif du rejet (ex: Stock insuffisant, Produit indisponible)…"
                aria-label="Motif du rejet"
                maxLength={500}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                rows={4}
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectMotif('');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (!rejectMotif.trim()) {
                      showError('Le motif du rejet est obligatoire');
                      return;
                    }
                    rejeterMutation.mutate({ motif: rejectMotif });
                  }}
                  disabled={rejeterMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-gray-400 rounded-lg"
                >
                  {rejeterMutation.isPending ? 'En cours…' : 'Rejeter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'annulation */}
      {modaleAnnulation && (
        <ModaleMotif
          titre="Annuler la commande"
          explication="Le client est averti automatiquement, par notification et par email. Le stock des articles est recrédité."
          motif={motifAnnulation}
          onMotifChange={setMotifAnnulation}
          responsabilite={responsabiliteAnnulation}
          onResponsabiliteChange={setResponsabiliteAnnulation}
          enCours={annuler.isPending}
          libelleAction="Confirmer l'annulation"
          danger
          onFermer={() => {
            setModaleAnnulation(false);
            setMotifAnnulation('');
            setResponsabiliteAnnulation('');
          }}
          onValider={() => {
            annuler.mutate(
              {
                id: id!,
                corps: {
                  motif: motifAnnulation,
                  ...(responsabiliteAnnulation
                    ? { responsabilite: responsabiliteAnnulation }
                    : {}),
                },
              },
              {
                onSuccess: (r) => {
                  qc.invalidateQueries({ queryKey: ['commande', id] });
                  showSuccess(r);
                  setModaleAnnulation(false);
                  setMotifAnnulation('');
                  setResponsabiliteAnnulation('');
                },
                onError: (e) => showError(e),
              }
            );
          }}
        />
      )}

      {/* Modale de modification */}
      {modaleModification && (
        <ModaleMotif
          titre="Modifier la commande"
          explication="Le client est averti du changement. Les écarts de quantité sont reportés sur le stock et le montant total est recalculé."
          motif={motifModification}
          onMotifChange={setMotifModification}
          responsabilite={responsabiliteModification}
          onResponsabiliteChange={setResponsabiliteModification}
          enCours={modifier.isPending}
          libelleAction="Enregistrer"
          onFermer={() => setModaleModification(false)}
          onValider={() => {
            // Une quantité à 0 retire la ligne : le backend rend le stock et
            // refuse une commande totalement vidée, qu'il faut annuler.
            const lignes = items
              .map((item: any) => ({
                produitId: item.produitId,
                quantite: quantites[item.produitId] ?? item.quantite,
              }))
              .filter((l: any) => l.quantite > 0);

            if (!lignes.length) {
              showError('Une commande ne peut pas être vidée : annulez-la plutôt.');
              return;
            }

            modifier.mutate(
              {
                id: id!,
                corps: {
                  motif: motifModification,
                  ...(responsabiliteModification
                    ? { responsabilite: responsabiliteModification }
                    : {}),
                  items: lignes,
                },
              },
              {
                onSuccess: (r) => {
                  qc.invalidateQueries({ queryKey: ['commande', id] });
                  showSuccess(r);
                  setModaleModification(false);
                  setModeEdition(false);
                  setQuantites({});
                  setMotifModification('');
                  setResponsabiliteModification('');
                },
                onError: (e) => showError(e),
              }
            );
          }}
        />
      )}
    </div>
  );
}

/**
 * Modale commune à l'annulation et à la modification : un motif obligatoire et
 * une responsabilité facultative.
 *
 * Le motif n'est pas du confort : c'est lui qui alimente le suivi de fiabilité
 * des vendeurs, et le backend refuse l'opération sans lui.
 */
function ModaleMotif({
  titre,
  explication,
  motif,
  onMotifChange,
  responsabilite,
  onResponsabiliteChange,
  enCours,
  libelleAction,
  danger = false,
  onFermer,
  onValider,
}: {
  titre: string;
  explication: string;
  motif: string;
  onMotifChange: (v: string) => void;
  responsabilite: Responsabilite | '';
  onResponsabiliteChange: (v: Responsabilite | '') => void;
  enCours: boolean;
  libelleAction: string;
  danger?: boolean;
  onFermer: () => void;
  onValider: () => void;
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={titre}>
      <div className="modal-box max-w-md">
        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">{titre}</h2>
          <p className="text-sm text-gray-600 mb-4">{explication}</p>

          <label className="text-sm font-medium text-gray-700" htmlFor="motif-commande">
            Motif *
          </label>
          <textarea
            id="motif-commande"
            value={motif}
            onChange={(e) => onMotifChange(e.target.value)}
            placeholder="Ex. : stock annoncé à tort par le vendeur, client injoignable…"
            maxLength={500}
            rows={3}
            className={`mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none ${
              danger ? 'focus:ring-red-300' : 'focus:ring-yellow-300'
            }`}
          />

          <label className="text-sm font-medium text-gray-700 mt-4 block" htmlFor="resp-commande">
            Imputable à
          </label>
          <select
            id="resp-commande"
            value={responsabilite}
            onChange={(e) => onResponsabiliteChange(e.target.value as Responsabilite | '')}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            <option value="">Personne en particulier</option>
            {RESPONSABILITES.map((r) => (
              <option key={r} value={r}>
                {LIBELLE_RESPONSABILITE[r]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400">
            « Vendeur » fait peser l'incident sur son score de fiabilité.
          </p>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onFermer}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              Retour
            </button>
            <button
              onClick={() => {
                // Doublon volontaire du contrôle backend : évite un aller-retour
                // réseau pour une erreur visible immédiatement.
                if (motif.trim().length < 3) {
                  showError('Le motif est obligatoire (3 caractères minimum).');
                  return;
                }
                onValider();
              }}
              disabled={enCours}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:bg-gray-400 ${
                danger ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-900 hover:bg-gray-800'
              }`}
            >
              {enCours ? 'En cours…' : libelleAction}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
