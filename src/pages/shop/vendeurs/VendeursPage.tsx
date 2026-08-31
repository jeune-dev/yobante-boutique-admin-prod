import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';

const api = {
  getVendeurs: (p: any) => shopClient.get('/admin/vendeurs', { params: p }),
  creerVendeur: (data: any) => shopClient.post('/admin/vendeurs', data),
  bloquer: (id: string) => shopClient.patch(`/admin/vendeurs/${id}/bloquer`),
  debloquer: (id: string) => shopClient.patch(`/admin/vendeurs/${id}/debloquer`),
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

const CHAMPS_VIDES = { nom: '', prenom: '', email: '', telephone: '', nomBoutique: '', adresseBoutique: '' };

export default function VendeursPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(CHAMPS_VIDES);

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
    const payload: Record<string, string> = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      nomBoutique: form.nomBoutique.trim(),
    };
    if (form.telephone.trim()) payload.telephone = form.telephone.trim();
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendeurs</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
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
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500 text-sm">
            {(error as any)?.message || 'Impossible de charger les vendeurs.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                      <td className="p-4 font-medium">
                        <span className="inline-flex items-center gap-2">
                          {v.prenom} {v.nom}
                          {bloque && <IconeBlocage />}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600">
                        <div>{nomBoutique(v)}</div>
                        {adresseBoutique(v) && (
                          <div className="text-xs text-gray-400">{adresseBoutique(v)}</div>
                        )}
                      </td>
                      <td className="p-4 text-gray-500 text-xs">
                        <div>{v.email || '—'}</div>
                        <div>{v.telephone || v.telephoneBoutique || '—'}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            bloque ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {bloque ? 'Bloqué' : 'Actif'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleStatut(v)}
                            disabled={statutMutation.isPending}
                            className={`px-3 py-1 rounded text-xs font-medium disabled:opacity-50 ${
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
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      Aucun vendeur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination?.totalPages > 1 && (
          <div className="flex justify-center p-4 gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded text-sm ${
                  page === p ? 'bg-yellow-500 text-white' : 'hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal Créer vendeur — aucun champ mot de passe : il est généré par le
          backend et transmis au vendeur par email. */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-1">Nouveau vendeur</h2>
            <p className="text-xs text-gray-500 mb-4">
              Le compte sera <strong>actif immédiatement</strong>. Un mot de passe temporaire est
              envoyé par email ; le vendeur devra le changer à sa première connexion.
            </p>
            <form onSubmit={handleCreer} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                <input
                  value={form.telephone}
                  onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
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
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creerMutation.isPending}
                  className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60"
                >
                  {creerMutation.isPending ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
