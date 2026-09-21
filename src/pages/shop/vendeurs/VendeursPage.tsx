import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';
import Pagination from '@/shared/components/tables/Pagination';
import { PhoneInput } from '@/shared/components/PhoneInput';

const api = {
  getVendeurs: (p: any) => shopClient.get('/admin/vendeurs', { params: p }),
  creerVendeur: (data: any) => shopClient.post('/admin/vendeurs', data),
  updateVendeur: (id: string, data: any) => shopClient.put(`/admin/vendeurs/${id}`, data),
  bloquer: (id: string) => shopClient.patch(`/admin/vendeurs/${id}/bloquer`),
  debloquer: (id: string) => shopClient.patch(`/admin/vendeurs/${id}/debloquer`),
  renvoyerIdentifiants: (id: string) => shopClient.post(`/admin/vendeurs/${id}/renvoyer-identifiants`),
};

interface Vendeur {
  id: string;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string | null;
  statut?: 'actif' | 'bloque';
  isBlocked?: boolean;
  isActive?: boolean;
  nomBoutique?: string | null;
  adresseBoutique?: string | null;
  telephoneBoutique?: string | null;
  boutique?: { nom?: string | null; adresse?: string | null } | null;
}

/** Le backend renvoie `statut`; `isActive` sert de repli défensif. */
const estBloque = (v: Vendeur) =>
  v.statut ? v.statut === 'bloque' : v.isBlocked ?? v.isActive === false;

const nomBoutique = (v: Vendeur) => v.nomBoutique || v.boutique?.nom || '—';
const adresseBoutique = (v: Vendeur) => v.adresseBoutique || v.boutique?.adresse || '';

/** Cadenas affiché à côté du nom d'un vendeur bloqué. */
function IconeBlocage() {
  return (
    <span
      title="Vendeur bloqué"
      aria-label="Vendeur bloqué"
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    </span>
  );
}

const CHAMPS_VIDES = { nom: '', prenom: '', email: '', telephone: '', phoneCountryCode: '', phoneNationalNumber: '', nomBoutique: '', adresseBoutique: '' };

export default function VendeursPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVendeur, setEditingVendeur] = useState<Vendeur | null>(null);
  const [form, setForm] = useState(CHAMPS_VIDES);
  const [editForm, setEditForm] = useState(CHAMPS_VIDES);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['vendeurs', search, page],
    queryFn: () => api.getVendeurs({ search, page, limit: 20 }),
  });

  const rafraichir = () => qc.invalidateQueries({ queryKey: ['vendeurs'] });

  const creerMutation = useMutation({
    mutationFn: (payload: any) => api.creerVendeur(payload),
    onSuccess: (reponse) => {
      // La liste est rechargée avant l'alerte : l'interface reflète le nouvel
      // état au moment même où l'administrateur lit le message de succès.
      rafraichir();
      setShowModal(false);
      setForm(CHAMPS_VIDES);
      showSuccess(reponse);
    },
    onError: (e: any) => showError(e),
  });

  const statutMutation = useMutation({
    mutationFn: ({ id, bloquer }: { id: string; bloquer: boolean }) =>
      bloquer ? api.bloquer(id) : api.debloquer(id),
    onSuccess: (reponse) => {
      rafraichir();
      showSuccess(reponse);
    },
    onError: (e: any) => showError(e),
  });

  const modifierMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.updateVendeur(id, payload),
    onSuccess: (reponse) => {
      rafraichir();
      setShowEditModal(false);
      setEditingVendeur(null);
      showSuccess(reponse);
    },
    onError: (e: any) => showError(e),
  });

  const renvoyerMutation = useMutation({
    mutationFn: (id: string) => api.renvoyerIdentifiants(id),
    onSuccess: (reponse) => {
      rafraichir();
      showSuccess(reponse);
    },
    onError: (e: any) => showError(e),
  });

  const vendeurs: Vendeur[] = data?.vendeurs || [];
  const pagination = data?.pagination;

  const handleCreer = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirme = await showConfirm({
      titre: 'Créer le vendeur',
      message: `Créer le compte vendeur de ${form.prenom} ${form.nom} ? Un mot de passe temporaire lui sera envoyé par email.`,
      confirmText: 'Créer',
    });
    if (!confirme) return;

    // Les champs facultatifs vides ne sont pas envoyés : le backend valide des
    // chaînes non vides quand la clé est présente.
    const payload: Record<string, any> = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      nomBoutique: form.nomBoutique.trim(),
    };
    if (form.phoneCountryCode && form.phoneNationalNumber) {
      payload.phoneCountryCode = form.phoneCountryCode;
      payload.phoneNationalNumber = form.phoneNationalNumber;
      payload.telephone = form.telephone;
    } else if (form.telephone.trim()) {
      payload.telephone = form.telephone.trim();
    }
    if (form.adresseBoutique.trim()) payload.adresseBoutique = form.adresseBoutique.trim();

    creerMutation.mutate(payload);
  };

  const handleStatut = async (v: Vendeur) => {
    const bloquer = !estBloque(v);
    const nomComplet = `${v.prenom ?? ''} ${v.nom ?? ''}`.trim();

    const confirme = await showConfirm({
      titre: bloquer ? 'Bloquer le vendeur' : 'Débloquer le vendeur',
      message: bloquer
        ? `Êtes-vous sûr de vouloir bloquer ${nomComplet} ? Il ne pourra plus accéder à son espace vendeur.`
        : `Êtes-vous sûr de vouloir débloquer ${nomComplet} ? Il retrouvera l'accès à son espace vendeur.`,
      confirmText: bloquer ? 'Bloquer' : 'Débloquer',
      danger: bloquer,
    });
    if (!confirme) return;

    statutMutation.mutate({ id: v.id, bloquer });
  };

  const ouvrirModification = (v: Vendeur) => {
    setEditingVendeur(v);
    setEditForm({
      nom: v.nom || '',
      prenom: v.prenom || '',
      email: v.email || '',
      telephone: v.telephone || v.telephoneBoutique || '',
      phoneCountryCode: '', // Need to infer from telephone if possible, or initialize empty
      phoneNationalNumber: '',
      nomBoutique: nomBoutique(v) === '—' ? '' : nomBoutique(v),
      adresseBoutique: adresseBoutique(v),
    });
    setShowEditModal(true);
  };

  const handleModifier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendeur) return;

    const confirme = await showConfirm({
      titre: 'Modifier le vendeur',
      message: `Enregistrer les modifications pour ${editForm.prenom} ${editForm.nom} ?`,
      confirmText: 'Enregistrer',
    });
    if (!confirme) return;

    const payload: Record<string, any> = {
      nom: editForm.nom.trim(),
      prenom: editForm.prenom.trim(),
      email: editForm.email.trim(),
      nomBoutique: editForm.nomBoutique.trim(),
    };
    if (editForm.telephone.trim()) {
      payload.telephone = editForm.telephone.trim();
      if (editForm.phoneCountryCode) payload.phoneCountryCode = editForm.phoneCountryCode;
      if (editForm.phoneNationalNumber) payload.phoneNationalNumber = editForm.phoneNationalNumber;
    }
    if (editForm.adresseBoutique.trim()) payload.adresseBoutique = editForm.adresseBoutique.trim();

    modifierMutation.mutate({ id: editingVendeur.id, payload });
  };

  const handleRenvoyerIdentifiants = async (v: Vendeur) => {
    const nomComplet = `${v.prenom ?? ''} ${v.nom ?? ''}`.trim();
    const destEmail = v.email ? v.email.trim() : 'aucun email';

    const confirme = await showConfirm({
      titre: 'Renvoyer les identifiants',
      message: `Générer un nouveau mot de passe temporaire pour ${nomComplet} ?\nLes identifiants seront envoyés par email à : ${destEmail}`,
      confirmText: 'Renvoyer',
    });
    if (!confirme) return;

    renvoyerMutation.mutate(v.id);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Vendeurs</h1>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-yellow-500 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
        >
          + Nouveau vendeur
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher un vendeur…"
            aria-label="Rechercher un vendeur"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500 text-sm">
            {(error as any)?.message || 'Impossible de charger les vendeurs.'}
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-4 font-medium text-gray-500">Vendeur</th>
                  <th className="p-4 font-medium text-gray-500">Boutique</th>
                  <th className="p-4 font-medium text-gray-500">Contact</th>
                  <th className="p-4 font-medium text-gray-500">Statut</th>
                  <th className="p-4 font-medium text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendeurs.map((v) => {
                  const bloque = estBloque(v);
                  return (
                    <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-4 font-medium tbl-primary">
                        <span className="inline-flex items-center gap-2">
                          {v.prenom} {v.nom}
                          {bloque && <IconeBlocage />}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600" data-label="Boutique">
                        <div>
                          <div>{nomBoutique(v)}</div>
                          {adresseBoutique(v) && (
                            <div className="text-xs text-gray-400">{adresseBoutique(v)}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 text-xs" data-label="Contact">
                        <div>
                          <div>{v.email || '—'}</div>
                          <div>{v.telephone || v.telephoneBoutique || '—'}</div>
                        </div>
                      </td>
                      <td className="p-4" data-label="Statut">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            bloque ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {bloque ? 'Bloqué' : 'Actif'}
                        </span>
                      </td>
                      <td className="p-4 tbl-actions" data-label="Actions">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          <button
                            onClick={() => ouvrirModification(v)}
                            className="px-2.5 py-1.5 sm:py-1 rounded text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleRenvoyerIdentifiants(v)}
                            disabled={renvoyerMutation.isPending}
                            title="Renvoyer les identifiants par email"
                            className="px-2.5 py-1.5 sm:py-1 rounded text-[11px] font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors disabled:opacity-50"
                          >
                            Renvoyer ID
                          </button>
                          <button
                            onClick={() => handleStatut(v)}
                            disabled={statutMutation.isPending}
                            className={`px-2.5 py-1.5 sm:py-1 rounded text-[11px] font-medium disabled:opacity-50 transition-colors ${
                              bloque
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            {bloque ? 'Débloquer' : 'Bloquer'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {vendeurs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 tbl-empty">
                      Aucun vendeur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={pagination?.totalPages ?? 1} onChange={setPage} />
      </div>

      {/* Modal Créer vendeur — aucun champ mot de passe : il est généré par le
          backend et transmis au vendeur par email. */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Nouveau vendeur"
        >
          <div
            className="modal-box max-w-md p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-1">Nouveau vendeur</h2>
            <p className="text-xs text-gray-500 mb-4">
              Le compte sera <strong>actif immédiatement</strong>. Un mot de passe temporaire est
              envoyé par email ; le vendeur devra le changer à sa première connexion.
            </p>
            <form onSubmit={handleCreer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Prénom *</label>
                  <input
                    required
                    value={form.prenom}
                    onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom *</label>
                  <input
                    required
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Téléphone</label>
                <PhoneInput
                  value={form.telephone}
                  onChange={(phone, meta) => {
                    setForm((f) => ({
                      ...f,
                      telephone: phone,
                      phoneCountryCode: meta.country.iso2.toUpperCase(),
                      phoneNationalNumber: meta.inputValue
                    }));
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nom de la boutique *</label>
                <input
                  required
                  value={form.nomBoutique}
                  onChange={(e) => setForm((f) => ({ ...f, nomBoutique: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Adresse de la boutique</label>
                <input
                  value={form.adresseBoutique}
                  onChange={(e) => setForm((f) => ({ ...f, adresseBoutique: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 sm:py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creerMutation.isPending}
                  className="px-4 py-2.5 sm:py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60"
                >
                  {creerMutation.isPending ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Modifier vendeur */}
      {showEditModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowEditModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Modifier le vendeur"
        >
          <div
            className="modal-box max-w-md p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Modifier le vendeur</h2>
            <form onSubmit={handleModifier} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Prénom *</label>
                  <input
                    required
                    value={editForm.prenom}
                    onChange={(e) => setEditForm((f) => ({ ...f, prenom: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nom *</label>
                  <input
                    required
                    value={editForm.nom}
                    onChange={(e) => setEditForm((f) => ({ ...f, nom: e.target.value }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <input
                  required
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Téléphone</label>
                <PhoneInput
                  value={editForm.telephone}
                  onChange={(phone, meta) => {
                    setEditForm((f) => ({
                      ...f,
                      telephone: phone,
                      phoneCountryCode: meta.country.iso2.toUpperCase(),
                      phoneNationalNumber: meta.inputValue
                    }));
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Nom de la boutique *</label>
                <input
                  required
                  value={editForm.nomBoutique}
                  onChange={(e) => setEditForm((f) => ({ ...f, nomBoutique: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Adresse de la boutique</label>
                <input
                  value={editForm.adresseBoutique}
                  onChange={(e) => setEditForm((f) => ({ ...f, adresseBoutique: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 sm:py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={modifierMutation.isPending}
                  className="px-4 py-2.5 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {modifierMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
