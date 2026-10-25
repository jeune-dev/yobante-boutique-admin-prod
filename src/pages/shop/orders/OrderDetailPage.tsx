import {
  libelleStatut,
  STATUTS_INTERNES,
  statutsPossibles,
  changementInterne,
} from '@/domains/shop/statutsCommande';
import { changerStatutCommande } from '@/domains/shop/changerStatutCommande';
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
  // Produits en rupture de stock : le client est prévenu avec le motif.
  rupture: (id: string, produitIds: string[], motif: string) =>
    shopClient.patch(`/admin/commandes/${id}/rupture`, { produitIds, motif }),
};

/** Fenêtre « rupture de stock » : produits cochés et motif transmis au client. */
type ModaleRupture = { produitIds: string[]; motif: string };

const STATUT_COLORS: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  en_modification: 'bg-orange-100 text-orange-700',
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

  // ── Changement de statut ─────────────────────────────────────────────────
  const [nouveauStatut, setNouveauStatut] = useState('');
  const [noteStatut, setNoteStatut] = useState('');

  // ── Rupture de stock ─────────────────────────────────────────────────────
  const [rupture, setRupture] = useState<ModaleRupture | null>(null);

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

  const statutMutation = useMutation({
    mutationFn: () => changerStatutCommande(id!, nouveauStatut, noteStatut.trim() || undefined),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['commande', id] });
      qc.invalidateQueries({ queryKey: ['commandes'] });
      showSuccess(data);
      setNouveauStatut('');
      setNoteStatut('');
    },
    onError: (e: any) => showError(e),
  });

  const ruptureMutation = useMutation({
    mutationFn: ({ produitIds, motif }: ModaleRupture) => api.rupture(id!, produitIds, motif),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['commande', id] });
      qc.invalidateQueries({ queryKey: ['commandes'] });
      showSuccess(data);
      setRupture(null);
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
  // Réponse du vendeur pour chaque produit de la commande (V / X / en attente).
  const reponseParProduit = new Map<string, any>();
  for (const v of commande.disponibilitesVendeurs ?? []) {
    for (const pid of v.produitIds ?? []) reponseParProduit.set(pid, v);
  }
  const peutAgir = !STATUTS_CLOS.includes(commande.statut);
  // Étapes possibles : calculées ici, sans dépendre d'un serveur à jour.
  const etapes: string[] = statutsPossibles(commande.statut);

  /** Ouvre la fenêtre de rupture, produits présélectionnés, motif pré-rempli. */
  const ouvrirRupture = (produitIds: string[], motif = '') =>
    setRupture({
      produitIds: produitIds.filter((pid) =>
        items.some((i: any) => i.produitId === pid && !i.enRupture)
      ),
      motif,
    });

  return (
    <div className="max-w-6xl mx-auto">
      <AdminBackButton parent="/boutique/commandes" className="mb-3" />
      {/* Entête : référence, statut et actions principales, visibles sans
          défiler jusqu'en bas de la page. */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">
              Commande {commande.reference}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                STATUT_COLORS[commande.statut] || 'bg-gray-100'
              }`}
            >
              {libelleStatut(commande.statut)}
            </span>
            {STATUTS_INTERNES.includes(commande.statut) && (
              <span className="text-xs text-gray-500">
                Statut interne : le client et le vendeur voient « En attente ».
              </span>
            )}
          </div>
          {commande.createdAt && (
            <p className="text-sm text-gray-500 mt-1">
              Passée le {new Date(commande.createdAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(commande.statut === 'en_attente' || commande.statut === 'en_modification') && (
            <>
              <button
                onClick={() => validerMutation.mutate()}
                disabled={validerMutation.isPending}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-60"
              >
                Valider la commande
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={rejeterMutation.isPending}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-60"
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
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-60"
                  >
                    Enregistrer les quantités
                  </button>
                  <button
                    onClick={() => {
                      setModeEdition(false);
                      setQuantites({});
                    }}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Abandonner la modification
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setModeEdition(true)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Modifier les quantités
                </button>
              )}
              <button
                onClick={() => setModaleAnnulation(true)}
                disabled={annuler.isPending}
                className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-60"
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Colonne principale : ce qui a été commandé et ce qui s'est passé. */}
        <div className="lg:col-span-2 space-y-5 min-w-0">
          <DisponibilitesVendeurs
            liste={commande.disponibilitesVendeurs ?? []}
            onRupture={
              peutAgir
                ? (v: any) => ouvrirRupture(v.produitIds ?? [], v.motifRefus ?? '')
                : undefined
            }
          />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
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
                    {peutAgir && !modeEdition && <th className="p-4" />}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-50 ${item.enRupture ? 'bg-red-50/40' : ''}`}
                    >
                      <td className="p-4 tbl-primary">
                        <span className={item.enRupture ? 'line-through text-gray-400' : ''}>
                          {item.produit?.nom || item.Produit?.nom || `Produit #${item.produitId}`}
                        </span>
                        {!item.enRupture && reponseParProduit.has(item.produitId) && (
                          <BadgeVendeur reponse={reponseParProduit.get(item.produitId)} />
                        )}
                        {item.enRupture && (
                          <div className="mt-1">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">
                              Rupture de stock
                            </span>
                            {item.motifRupture && (
                              <p className="text-xs text-red-700 mt-1">Motif : {item.motifRupture}</p>
                            )}
                          </div>
                        )}
                      </td>
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
                      <td className="p-4 font-medium whitespace-nowrap" data-label="Sous-total">
                        {item.enRupture ? (
                          <span className="text-gray-400 line-through">
                            {item.sousTotal?.toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : (
                          <>{item.sousTotal?.toLocaleString('fr-FR')} FCFA</>
                        )}
                      </td>
                      {peutAgir && !modeEdition && (
                        <td className="p-4 text-right">
                          {!item.enRupture && (
                            // Action, pas un état : la quantité de cette ligne a été
                            // réservée au moment de la commande, le produit est donc
                            // dû au client même si le stock est à zéro aujourd'hui.
                            // « Rupture de stock » ne s'affiche que si l'admin la déclare.
                            <button
                              onClick={() => ouvrirRupture([item.produitId])}
                              title="Déclarer ce produit indisponible pour cette commande : le client est prévenu"
                              className="text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:text-red-600 hover:border-red-200 hover:bg-red-50 whitespace-nowrap transition-colors"
                            >
                              Signaler une rupture
                            </button>
                          )}
                        </td>
                      )}
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
          {rupture && (
            <ModaleRuptureStock
              items={items}
              valeur={rupture}
              onChange={setRupture}
              onAnnuler={() => setRupture(null)}
              onConfirmer={() => ruptureMutation.mutate(rupture)}
              enCours={ruptureMutation.isPending}
            />
          )}

          {commande.motifRejet && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm font-medium text-red-900 mb-2">Motif du rejet :</p>
              <p className="text-sm text-red-700 whitespace-pre-wrap">{commande.motifRejet}</p>
            </div>
          )}

          {commande.motifAnnulation && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
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
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
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
        </div>

        {/* Colonne latérale : qui, où, et le changement de statut. */}
        <aside className="space-y-5 min-w-0 lg:sticky lg:top-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Client</p>
              <p className="font-semibold text-gray-900">
                {commande.user?.prenom} {commande.user?.nom}
              </p>
              <p className="text-sm text-gray-500">{commande.user?.email}</p>
              <p className="text-sm text-gray-500">{commande.user?.telephone}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Livraison</p>
              <p className="font-semibold text-gray-900">{commande.adresse?.ville || '—'}</p>
              <p className="text-sm text-gray-500">{commande.adresse?.rue || ''}</p>
              <p className="text-sm text-gray-500 mt-1">
                {/* Le backend renvoie le paiement comme association (`paiement.methode`). */}
                Paiement : {commande.paiement?.methode ?? commande.methodePaiement ?? '—'}
                {commande.paiement?.statut ? ` (${commande.paiement.statut})` : ''}
              </p>
            </div>
          </div>
          {/* Changement de statut : seules les étapes possibles sont proposées. */}
          {etapes.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="font-semibold text-gray-900 mb-3">Statut de la commande</h2>
              <div className="flex flex-col gap-3">
                <select
                  value={nouveauStatut}
                  onChange={(e) => setNouveauStatut(e.target.value)}
                  aria-label="Nouveau statut"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300 w-full"
                >
                  <option value="">Choisir un statut…</option>
                  {etapes.map((s) => (
                    <option key={s} value={s}>
                      {libelleStatut(s)}
                    </option>
                  ))}
                </select>
                <input
                  value={noteStatut}
                  onChange={(e) => setNoteStatut(e.target.value)}
                  placeholder="Note interne (facultatif)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
                <button
                  onClick={() => statutMutation.mutate()}
                  disabled={!nouveauStatut || statutMutation.isPending}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {statutMutation.isPending ? 'Mise à jour…' : 'Mettre à jour'}
                </button>
              </div>
              {nouveauStatut && (
                <p className="text-xs text-gray-500 mt-2">
                  {changementInterne(commande.statut, nouveauStatut)
                    ? "Statut interne : le client n'est pas prévenu, il voit toujours « En attente »."
                    : 'Le client sera prévenu par e-mail, notification push et dans son application.'}
                </p>
              )}
            </div>
          )}
        </aside>
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

// ── Réponse des vendeurs ─────────────────────────────────────────────────
// Chaque vendeur concerné confirme depuis l'application mobile que ses
// produits sont disponibles, ou les déclare indisponibles avec un motif.

const DISPO: Record<string, { libelle: string; classes: string }> = {
  acceptee: { libelle: 'Disponible', classes: 'bg-green-50 text-green-700' },
  refusee: { libelle: 'Indisponible', classes: 'bg-red-50 text-red-700' },
  en_attente: { libelle: 'En attente de réponse', classes: 'bg-amber-50 text-amber-700' },
};

/**
 * Réponse du vendeur sur un produit de la commande : V (disponible),
 * X (indisponible, avec le motif) ou « … » (pas encore répondu).
 */
function BadgeVendeur({ reponse }: { reponse: any }) {
  const nom = reponse.boutique || reponse.vendeur || 'Vendeur';
  const badge =
    reponse.statut === 'acceptee'
      ? { lettre: 'V', texte: 'Disponible', classes: 'bg-green-50 text-green-700 border-green-200' }
      : reponse.statut === 'refusee'
        ? { lettre: 'X', texte: 'Indisponible', classes: 'bg-red-50 text-red-700 border-red-200' }
        : { lettre: '…', texte: 'En attente du vendeur', classes: 'bg-amber-50 text-amber-700 border-amber-200' };
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded border ${badge.classes}`}
        title={reponse.motifRefus ? `Motif : ${reponse.motifRefus}` : badge.texte}
      >
        <span className="font-bold">{badge.lettre}</span> {badge.texte}
      </span>
      <span className="text-xs text-gray-400 truncate">{nom}</span>
      {reponse.statut === 'refusee' && reponse.motifRefus && (
        <span className="basis-full text-xs text-red-700">Motif : {reponse.motifRefus}</span>
      )}
    </div>
  );
}

function DisponibilitesVendeurs({
  liste,
  onRupture,
}: {
  liste: any[];
  /** Absent : commande close, plus d'action possible. */
  onRupture?: (vendeur: any) => void;
}) {
  if (!liste.length) return null;
  const refus = liste.filter((v) => v.statut === 'refusee').length;
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm ${
        refus ? 'border-red-200' : 'border-gray-100'
      }`}
    >
      <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-gray-900">Disponibilité chez les vendeurs</h2>
        {refus > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-700">
            {refus} vendeur{refus > 1 ? 's' : ''} sans stock
          </span>
        )}
      </div>
      <ul className="divide-y divide-gray-50">
        {liste.map((v) => {
          const etat = DISPO[v.statut] ?? DISPO.en_attente;
          return (
            <li key={v.vendeurId} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {v.boutique || v.vendeur || 'Vendeur'}
                    {v.boutique && v.vendeur && (
                      <span className="font-normal text-gray-500"> · {v.vendeur}</span>
                    )}
                  </p>
                  {v.telephone && <p className="text-xs text-gray-500">{v.telephone}</p>}
                  <p className="text-xs text-gray-500 mt-1">{(v.produits ?? []).join(' · ')}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${etat.classes}`}>
                  {etat.libelle}
                </span>
              </div>
              {v.statut === 'refusee' && v.motifRefus && (
                <p className="mt-2 text-sm bg-red-50 text-red-800 rounded-lg px-3 py-2">
                  <span className="font-semibold">Motif : </span>
                  {v.motifRefus}
                </p>
              )}
              {v.decideLe && (
                <p className="mt-1 text-xs text-gray-400">
                  Répondu le {new Date(v.decideLe).toLocaleString('fr-FR')}
                </p>
              )}
              {/* Le client n'est pas encore prévenu du refus : c'est cette
                  action qui le notifie, avec le motif. */}
              {v.statut === 'refusee' && onRupture && (
                <button
                  onClick={() => onRupture(v)}
                  className="mt-3 text-sm font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
                >
                  Marquer en rupture de stock et prévenir le client
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Choix des produits en rupture et du motif. Le client est prévenu par
 * notification push, e-mail et sur sa page commande, avec ce motif.
 */
function ModaleRuptureStock({
  items,
  valeur,
  onChange,
  onAnnuler,
  onConfirmer,
  enCours,
}: {
  items: any[];
  valeur: ModaleRupture;
  onChange: (v: ModaleRupture) => void;
  onAnnuler: () => void;
  onConfirmer: () => void;
  enCours: boolean;
}) {
  const disponibles = items.filter((i) => !i.enRupture);
  const basculer = (pid: string) =>
    onChange({
      ...valeur,
      produitIds: valeur.produitIds.includes(pid)
        ? valeur.produitIds.filter((x) => x !== pid)
        : [...valeur.produitIds, pid],
    });
  const valide = valeur.produitIds.length > 0 && valeur.motif.trim().length >= 3;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="font-semibold text-lg text-gray-900 mb-1">Rupture de stock</h3>
        <p className="text-sm text-gray-500 mb-4">
          Le client sera prévenu par notification et par e-mail, avec ce motif. Les produits
          cochés ne lui seront plus facturés.
        </p>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Produits concernés</p>
        <ul className="space-y-2 mb-4 max-h-48 overflow-y-auto">
          {disponibles.map((i) => (
            <li key={i.produitId}>
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={valeur.produitIds.includes(i.produitId)}
                  onChange={() => basculer(i.produitId)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-300"
                />
                {i.quantite} × {i.produit?.nom ?? `Produit #${i.produitId}`}
              </label>
            </li>
          ))}
        </ul>
        <label className="text-xs font-semibold text-gray-500 uppercase">Motif (envoyé au client)</label>
        <textarea
          value={valeur.motif}
          onChange={(e) => onChange({ ...valeur, motif: e.target.value })}
          rows={3}
          placeholder="Ex : produit épuisé chez le vendeur"
          className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onAnnuler} className="px-4 py-2 text-sm rounded-lg border border-gray-200">
            Annuler
          </button>
          <button
            onClick={onConfirmer}
            disabled={!valide || enCours}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white disabled:opacity-50"
          >
            {enCours ? 'Envoi…' : 'Confirmer et prévenir le client'}
          </button>
        </div>
      </div>
    </div>
  );
}
