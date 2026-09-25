import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { useAuthStore } from '@/auth/store/auth.store';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';
import Pagination from '@/shared/components/tables/Pagination';
import { PhoneInput } from '@/shared/components/PhoneInput';

const api = {
  lister: (p: Record<string, unknown>) => shopClient.get('/admin/users/admins', { params: p }),
  creer: (data: Record<string, unknown>) => shopClient.post('/admin/users/admins', data),
  modifier: (id: string, data: Record<string, unknown>) =>
    shopClient.put(`/admin/users/admins/${id}`, data),
  bloquer: (id: string) => shopClient.patch(`/admin/users/admins/${id}/bloquer`),
  debloquer: (id: string) => shopClient.patch(`/admin/users/admins/${id}/debloquer`),
  renvoyerIdentifiants: (id: string) =>
    shopClient.post(`/admin/users/admins/${id}/renvoyer-identifiants`),
};

interface Administrateur {
  id: string;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string | null;
  statut?: 'actif' | 'bloque';
  isActive?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
}

/** Le backend renvoie `statut` ; `isActive` sert de repli défensif. */
const estBloque = (a: Administrateur) =>
  a.statut ? a.statut === 'bloque' : a.isActive === false;

const nomComplet = (a: { prenom?: string; nom?: string }) =>
  `${a.prenom ?? ''} ${a.nom ?? ''}`.trim();

interface Formulaire {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  /** Indicatif du pays choisi : un champ qui ne contient que lui est vide. */
  indicatif: string;
}

const VIDE: Formulaire = { nom: '', prenom: '', email: '', telephone: '', indicatif: '' };

/** Téléphone à envoyer : null si seul l'indicatif a été saisi. */
const telephoneSaisi = (f: Formulaire) => {
  const chiffres = f.telephone.replace(/\D/g, '');
  const indicatif = f.indicatif.replace(/\D/g, '');
  return chiffres.length > indicatif.length ? f.telephone.trim() : null;
};

const CHAMP =
  'mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300';

export default function AdministrateursPage() {
  const qc = useQueryClient();
  const moi = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [page, setPage] = useState(1);
  // null : fermé ; 'nouveau' : création ; sinon l'administrateur modifié.
  const [modal, setModal] = useState<'nouveau' | Administrateur | null>(null);
  const [form, setForm] = useState<Formulaire>(VIDE);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['administrateurs', search, statut, page],
    queryFn: () =>
      api.lister({ search: search.trim() || undefined, statut: statut || undefined, page, limit: 20 }),
  });

  const rafraichir = () => qc.invalidateQueries({ queryKey: ['administrateurs'] });

  const fermer = () => {
    setModal(null);
    setForm(VIDE);
  };

  const enregistrer = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: Record<string, unknown> }) =>
      id ? api.modifier(id, payload) : api.creer(payload),
    onSuccess: (reponse) => {
      // Liste rechargée avant l'alerte : l'écran reflète déjà le nouvel état.
      rafraichir();
      fermer();
      showSuccess(reponse);
    },
    onError: (e) => showError(e),
  });

  const statutMutation = useMutation({
    mutationFn: ({ id, bloquer }: { id: string; bloquer: boolean }) =>
      bloquer ? api.bloquer(id) : api.debloquer(id),
    onSuccess: (reponse) => {
      rafraichir();
      showSuccess(reponse);
    },
    onError: (e) => showError(e),
  });

  const renvoyerMutation = useMutation({
    mutationFn: (id: string) => api.renvoyerIdentifiants(id),
    onSuccess: (reponse) => {
      rafraichir();
      showSuccess(reponse);
    },
    onError: (e) => showError(e),
  });

  const admins: Administrateur[] = data?.admins || [];
  const pagination = data?.pagination;
  const enEdition = modal && modal !== 'nouveau' ? modal : null;

  const ouvrirCreation = () => {
    setForm(VIDE);
    setModal('nouveau');
  };

  const ouvrirModification = (a: Administrateur) => {
    setForm({
      nom: a.nom || '',
      prenom: a.prenom || '',
      email: a.email || '',
      telephone: a.telephone || '',
      indicatif: '',
    });
    setModal(a);
  };

  const handleEnregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    const nom = form.nom.trim();
    const prenom = form.prenom.trim();
    const email = form.email.trim();

    const confirme = await showConfirm(
      enEdition
        ? {
            titre: "Modifier l'administrateur",
            message: `Enregistrer les modifications pour ${prenom} ${nom} ?`,
            confirmText: 'Enregistrer',
          }
        : {
            titre: 'Créer un administrateur',
            message: `Créer le compte administrateur de ${prenom} ${nom} ?\nUn mot de passe temporaire sera envoyé à : ${email}`,
            confirmText: 'Créer',
          },
    );
    if (!confirme) return;

    const payload: Record<string, unknown> = { nom, prenom, email };
    const telephone = telephoneSaisi(form);
    // En création, un champ vide n'est pas envoyé ; en modification, il efface
    // le numéro enregistré.
    if (telephone) payload.telephone = telephone;
    else if (enEdition && enEdition.telephone) payload.telephone = null;

    enregistrer.mutate({ id: enEdition?.id, payload });
  };

  const handleStatut = async (a: Administrateur) => {
    const bloquer = !estBloque(a);
    const confirme = await showConfirm({
      titre: bloquer ? "Bloquer l'administrateur" : "Débloquer l'administrateur",
      message: bloquer
        ? `Bloquer ${nomComplet(a)} ? Ses sessions seront fermées et l'accès au dashboard lui sera retiré.`
        : `Débloquer ${nomComplet(a)} ? L'accès au dashboard lui sera rendu.`,
      confirmText: bloquer ? 'Bloquer' : 'Débloquer',
      danger: bloquer,
    });
    if (!confirme) return;
    statutMutation.mutate({ id: a.id, bloquer });
  };

  const handleRenvoyer = async (a: Administrateur) => {
    const confirme = await showConfirm({
      titre: 'Renvoyer les identifiants',
      message: `Générer un nouveau mot de passe temporaire pour ${nomComplet(a)} ?\nL'ancien ne fonctionnera plus. Les identifiants seront envoyés à : ${a.email ?? 'aucun email'}`,
      confirmText: 'Renvoyer',
    });
    if (!confirme) return;
    renvoyerMutation.mutate(a.id);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Administrateurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Comptes ayant accès à ce dashboard.
          </p>
        </div>
        <button
          onClick={ouvrirCreation}
          className="w-full sm:w-auto bg-yellow-500 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
        >
          + Nouvel administrateur
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher (nom, prénom, email)…"
            aria-label="Rechercher un administrateur"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
          <select
            value={statut}
            onChange={(e) => {
              setStatut(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrer par statut"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-44 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            <option value="">Tous les statuts</option>
            <option value="actif">Actifs</option>
            <option value="bloque">Bloqués</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : isError ? (
          <div className="p-8 text-center text-sm">
            <p className="text-red-500">
              {(error as { message?: string })?.message ||
                'Impossible de charger les administrateurs.'}
            </p>
            <button
              onClick={() => void refetch()}
              className="mt-3 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-4 font-medium text-gray-500">Administrateur</th>
                  <th className="p-4 font-medium text-gray-500">Contact</th>
                  <th className="p-4 font-medium text-gray-500">Statut</th>
                  <th className="p-4 font-medium text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => {
                  const bloque = estBloque(a);
                  const estMoi = a.id === moi?.id;
                  return (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4 font-medium tbl-primary">
                        <span className="inline-flex flex-wrap items-center gap-2">
                          {nomComplet(a) || '—'}
                          {estMoi && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600">
                              Vous
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 text-xs" data-label="Contact">
                        <div>{a.email || '—'}</div>
                        <div>{a.telephone || '—'}</div>
                      </td>
                      <td className="p-4" data-label="Statut">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              bloque ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {bloque ? 'Bloqué' : 'Actif'}
                          </span>
                          {a.mustChangePassword && (
                            <span
                              title="Le mot de passe temporaire n'a pas encore été remplacé"
                              className="px-2 py-1 rounded-full text-xs bg-amber-50 text-amber-700"
                            >
                              1re connexion en attente
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 tbl-actions" data-label="Actions">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <button
                            onClick={() => ouvrirModification(a)}
                            className="px-2.5 py-1.5 sm:py-1 rounded text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            Modifier
                          </button>
                          {/* Sur son propre compte : le mot de passe se change
                              depuis le profil, et on ne peut pas se bloquer. */}
                          {!estMoi && (
                            <>
                              <button
                                onClick={() => handleRenvoyer(a)}
                                disabled={renvoyerMutation.isPending}
                                title="Renvoyer les identifiants par email"
                                className="px-2.5 py-1.5 sm:py-1 rounded text-[11px] font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors disabled:opacity-50"
                              >
                                Renvoyer ID
                              </button>
                              <button
                                onClick={() => handleStatut(a)}
                                disabled={statutMutation.isPending}
                                className={`px-2.5 py-1.5 sm:py-1 rounded text-[11px] font-medium disabled:opacity-50 transition-colors ${
                                  bloque
                                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                }`}
                              >
                                {bloque ? 'Débloquer' : 'Bloquer'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 tbl-empty">
                      Aucun administrateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={pagination?.totalPages ?? 1} onChange={setPage} />
      </div>

      {modal && (
        <div
          className="modal-overlay"
          onClick={fermer}
          role="dialog"
          aria-modal="true"
          aria-label={enEdition ? "Modifier l'administrateur" : 'Nouvel administrateur'}
        >
          <div className="modal-box max-w-md p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">
              {enEdition ? "Modifier l'administrateur" : 'Nouvel administrateur'}
            </h2>
            {!enEdition && (
              <p className="text-xs text-gray-500 mb-4">
                Le compte est <strong>actif immédiatement</strong>. Un mot de passe temporaire est
                envoyé par email ; il devra être changé à la première connexion.
              </p>
            )}
            <form onSubmit={handleEnregistrer} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Prénom *</label>
                  <input
                    required
                    maxLength={100}
                    value={form.prenom}
                    onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    className={CHAMP}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom *</label>
                  <input
                    required
                    maxLength={100}
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    className={CHAMP}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <input
                  required
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={CHAMP}
                />
                {enEdition && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    C'est l'identifiant de connexion de l'administrateur.
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Téléphone</label>
                <PhoneInput
                  value={form.telephone}
                  onChange={(phone, meta) =>
                    setForm((f) => ({
                      ...f,
                      telephone: phone,
                      indicatif: String(meta?.country?.dialCode ?? ''),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={fermer}
                  className="px-4 py-2.5 sm:py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={enregistrer.isPending}
                  className="px-4 py-2.5 sm:py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60"
                >
                  {enregistrer.isPending
                    ? 'Enregistrement…'
                    : enEdition
                      ? 'Enregistrer'
                      : 'Créer et envoyer les accès'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
