import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUsers, useToggleUserActive, useSupprimerClient } from '@/domains/shop/hooks/useUsers';
import { ShopUser } from '@/domains/shop/api/users.api';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';
import Pagination from '@/shared/components/tables/Pagination';
import { etatRetour } from '@/shared/hooks/useRetour';
import { lirePage, useParametresUrl } from '@/shared/hooks/useParametresUrl';
import { useOuvrirLigne } from '@/shared/hooks/useOuvrirLigne';

/** Filtre de statut ↔ valeur conservée dans l'URL. */
const FILTRES_STATUT = [
  { label: 'Tous', val: undefined, url: '' },
  { label: 'Actifs', val: true, url: 'actifs' },
  { label: 'Bloqués', val: false, url: 'bloques' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initiales(u: ShopUser) {
  return `${u.prenom?.[0] ?? ''}${u.nom?.[0] ?? ''}`.toUpperCase();
}

/** Segments d'activité (même définition que la page Analytics › Clients). */
const SEGMENTS: Record<string, string> = {
  acheteurs: 'Acheteurs (au moins une commande)',
  reachat: 'Clients ayant commandé plusieurs fois',
  fideles: 'Clients fidèles (commande dans les 90 derniers jours)',
  inactifs: 'Clients inactifs (aucune commande depuis 90 jours)',
  sans_achat: 'Inscrits sans achat',
};

const nomComplet = (u: ShopUser) => `${u.prenom ?? ''} ${u.nom ?? ''}`.trim();

/**
 * Clients de la boutique : recherche, filtre actif / bloqué, activité
 * commerciale, blocage et suppression du compte.
 * Même présentation que l'écran Vendeurs.
 */
export default function UsersPage() {
  const location = useLocation();
  // Recherche validée, statut et page vivent dans l'URL : le retour depuis la
  // fiche d'un client restitue la liste telle qu'on l'avait laissée.
  const [filtres, setFiltres] = useParametresUrl({ q: '', statut: '', page: '1', segment: '', du: '', au: '' });
  const segment = SEGMENTS[filtres.segment] ? filtres.segment : '';
  const ouvrir = useOuvrirLigne();
  const search = filtres.q;
  const page = lirePage(filtres.page);
  const activeFilter = FILTRES_STATUT.find((f) => f.url === filtres.statut)?.val;
  const [searchInput, setSearchInput] = useState(search);

  const { data, isLoading, isError } = useUsers({
    page,
    limit: 15,
    search,
    isActive: activeFilter,
    segment: segment || undefined,
    commandeDebut: filtres.du || undefined,
    commandeFin: filtres.au || undefined,
  });
  const toggleMut = useToggleUserActive();
  const supprimerMut = useSupprimerClient();

  // Le backend renvoie { users, pagination: { total, totalPages, page, limit } }.
  const users: ShopUser[] = (data as any)?.users ?? [];
  const totalPages = (data as any)?.pagination?.totalPages ?? 1;
  const count = (data as any)?.pagination?.total ?? users.length;

  const handleToggle = async (u: ShopUser) => {
    const bloquer = u.isActive;
    const confirme = await showConfirm({
      titre: bloquer ? 'Bloquer le client' : 'Débloquer le client',
      message: bloquer
        ? `Bloquer ${nomComplet(u)} ? Il ne pourra plus se connecter à l'application.`
        : `Débloquer ${nomComplet(u)} ? Il retrouvera l'accès à l'application.`,
      confirmText: bloquer ? 'Bloquer' : 'Débloquer',
      danger: bloquer,
    });
    if (!confirme) return;
    toggleMut.mutate(
      { id: u.id, isActive: u.isActive },
      { onSuccess: (r) => showSuccess(r), onError: (e: any) => showError(e) }
    );
  };

  const handleSupprimer = async (u: ShopUser) => {
    const confirme = await showConfirm({
      titre: 'Supprimer le compte client',
      message: `Supprimer définitivement le compte de ${nomComplet(u)} (${u.email}) ?\nSes informations personnelles sont effacées et il ne pourra plus se connecter. L'historique de ses commandes est conservé.\nCette action est irréversible.`,
      confirmText: 'Supprimer',
      danger: true,
    });
    if (!confirme) return;
    supprimerMut.mutate(u.id, {
      onSuccess: (r) => showSuccess(r),
      onError: (e: any) => showError(e),
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clients</h1>
        <p className="text-sm text-gray-500">
          {count} client{count > 1 ? 's' : ''}
          {activeFilter === true ? ' actifs' : activeFilter === false ? ' bloqués' : ' au total'}
        </p>
      </div>

      {(filtres.du || filtres.au) && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span>
            Clients ayant commandé
            {filtres.du && <> du <strong>{fmtDate(filtres.du)}</strong></>}
            {filtres.au && <> au <strong>{fmtDate(filtres.au)}</strong></>}
          </span>
          <button
            onClick={() => setFiltres({ du: '', au: '', page: '1' })}
            className="ml-auto rounded-full border border-blue-300 bg-white px-3 py-1 text-xs font-medium hover:bg-blue-100"
          >
            Retirer ce filtre ✕
          </button>
        </div>
      )}

      {segment && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
          <span>
            Segment : <strong>{SEGMENTS[segment]}</strong>
          </span>
          <button
            onClick={() => setFiltres({ segment: '', page: '1' })}
            className="ml-auto rounded-full border border-yellow-300 bg-white px-3 py-1 text-xs font-medium hover:bg-yellow-100"
          >
            Voir tous les clients ✕
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFiltres({ q: searchInput.trim(), page: '1' });
            }}
            className="flex gap-2 w-full sm:w-auto"
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher un client (nom, email)…"
              aria-label="Rechercher un client"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
            <button
              type="submit"
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-600"
            >
              Rechercher
            </button>
          </form>
          <div className="flex flex-wrap gap-1.5 sm:ml-auto">
            {FILTRES_STATUT.map((f) => (
              <button
                key={f.url || 'tous'}
                onClick={() => setFiltres({ statut: f.url, page: '1' })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeFilter === f.val
                    ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500 text-sm">Impossible de charger les clients.</div>
        ) : (
          <div className="tbl-wrap">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="p-4 font-medium text-gray-500">Client</th>
                  <th className="p-4 font-medium text-gray-500">Contact</th>
                  <th className="p-4 font-medium text-gray-500">Commandes</th>
                  <th className="p-4 font-medium text-gray-500 hidden lg:table-cell">Inscrit le</th>
                  <th className="p-4 font-medium text-gray-500">Statut</th>
                  <th className="p-4 font-medium text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} {...ouvrir(`/boutique/clients/${u.id}`)} className="border-b border-gray-50">
                    <td className="p-4 tbl-primary">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {initiales(u)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{nomComplet(u)}</p>
                          <span
                            className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              u.isVerified ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {u.isVerified ? 'Email vérifié' : 'Email non vérifié'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4" data-label="Contact">
                      <p className="text-gray-700 wrap-anywhere">{u.email}</p>
                      <p className="text-xs text-gray-400">{u.telephone || '—'}</p>
                    </td>
                    {/* Volume d'activité : toutes les commandes passées, avec
                        en second les seules livrées (donc encaissées). */}
                    <td className="p-4 whitespace-nowrap" data-label="Commandes">
                      <p className="font-semibold text-gray-900">
                        {u.activite?.nbCommandes ?? 0}
                        {!!u.activite?.nbCommandes && (
                          <span className="font-normal text-xs text-gray-400">
                            {' '}
                            · {u.activite.nbCommandesLivrees} livrée
                            {u.activite.nbCommandesLivrees > 1 ? 's' : ''}
                          </span>
                        )}
                      </p>
                      {!!u.activite?.montantDepense && (
                        <p className="text-xs text-gray-400">
                          {Number(u.activite.montantDepense).toLocaleString('fr-FR')} FCFA
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-gray-500 whitespace-nowrap hidden lg:table-cell" data-label="Inscrit le">
                      {fmtDate(u.createdAt)}
                    </td>
                    <td className="p-4" data-label="Statut">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {u.isActive ? 'Actif' : 'Bloqué'}
                      </span>
                    </td>
                    <td className="p-4 tbl-actions" data-label="Actions">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        <Link
                          to={`/boutique/clients/${u.id}`}
                          state={etatRetour(location)}
                          aria-label={`Voir la fiche de ${nomComplet(u)}`}
                          className="px-2.5 py-1.5 sm:py-1 rounded text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          Voir
                        </Link>
                        <button
                          onClick={() => handleToggle(u)}
                          disabled={toggleMut.isPending}
                          className={`px-2.5 py-1.5 sm:py-1 rounded text-[11px] font-medium disabled:opacity-50 transition-colors ${
                            u.isActive
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {u.isActive ? 'Bloquer' : 'Débloquer'}
                        </button>
                        <button
                          onClick={() => handleSupprimer(u)}
                          disabled={supprimerMut.isPending}
                          title="Supprimer ce compte client"
                          className="px-2.5 py-1.5 sm:py-1 rounded text-[11px] font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 tbl-empty">
                      Aucun client trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={(p) => setFiltres({ page: String(p) })} />
      </div>
    </div>
  );
}
