import { useState } from 'react';
import { useUsers, useToggleUserActive } from '@/domains/shop/hooks/useUsers';
import { ShopUser } from '@/domains/shop/api/users.api';
import { showSuccess } from '@/shared/utils/alert';
import Pagination from '@/shared/components/tables/Pagination';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function initiales(u: ShopUser) {
  return `${u.nom?.[0] ?? ''}${u.prenom?.[0] ?? ''}`.toUpperCase();
}

export default function UsersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>();

  const { data, isLoading, isError } = useUsers({ page, limit: 15, search, isActive: activeFilter });
  const toggleMut = useToggleUserActive();

  // Le backend renvoie { users, pagination: { total, totalPages, page, limit } }.
  const users = (data as any)?.users ?? [];
  const totalPages = (data as any)?.pagination?.totalPages ?? 1;
  const count = (data as any)?.pagination?.total ?? users.length;

  const handleToggle = (u: ShopUser) => {
    toggleMut.mutate({ id: u.id, isActive: u.isActive }, {
      onSuccess: (data) => showSuccess(data),
    });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div>
          <div style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--black)' }}>Clients</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginTop: 2 }}>
            {count} client{count > 1 ? 's' : ''} au total
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }} className="flex gap-1.5 w-full sm:w-auto">
          <div className="db-search-wrap flex-1 sm:flex-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input className="db-search-input w-full" placeholder="Nom, email…" aria-label="Rechercher un client" value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          </div>
          <button type="submit" className="db-btn primary" style={{ padding: '0.42rem 0.9rem', fontSize: '0.85rem' }}>OK</button>
        </form>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[{ label: 'Tous', val: undefined }, { label: 'Actifs', val: true }, { label: 'Bloqués', val: false }].map(f => (
            <button key={String(f.val)} className={`db-chip${activeFilter === f.val ? ' active' : ''}`}
              onClick={() => { setActiveFilter(f.val as any); setPage(1); }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="db-card">
        {isLoading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text3)' }}>Chargement…</div>
        ) : isError ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--red)' }}>Erreur lors du chargement.</div>
        ) : users.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text3)' }}>Aucun client trouvé.</div>
        ) : (
          <div className="db-table-wrap tbl-wrap">
            <table className="tbl-cards">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Inscrit le</th>
                  <th>Vérifié</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: ShopUser) => (
                  <tr key={u.id}>
                    <td className="tbl-primary">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%', background: '#1341a3',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {initiales(u)}
                        </div>
                        <div className="db-td-bold" style={{ fontSize: '0.87rem' }}>
                          {u.nom} {u.prenom}
                        </div>
                      </div>
                    </td>
                    <td className="wrap-anywhere" style={{ fontSize: '0.84rem', color: 'var(--text2)' }} data-label="Email">{u.email}</td>
                    <td style={{ fontSize: '0.84rem', color: 'var(--text3)' }} data-label="Téléphone">{u.telephone ?? '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text3)', whiteSpace: 'nowrap' }} data-label="Inscrit le">
                      {fmtDate(u.createdAt)}
                    </td>
                    <td data-label="Vérifié">
                      <span className={`badge ${u.isVerified ? 'bg' : 'bx'}`}>
                        {u.isVerified ? 'Vérifié' : 'Non vérifié'}
                      </span>
                    </td>
                    <td data-label="Statut">
                      <button
                        onClick={() => handleToggle(u)}
                        disabled={toggleMut.isPending}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title={u.isActive ? 'Bloquer ce compte' : 'Activer ce compte'}
                        aria-label={u.isActive ? 'Bloquer ce compte' : 'Activer ce compte'}
                      >
                        <span className={`badge ${u.isActive ? 'bg' : 'br'}`}>
                          {u.isActive ? 'Actif' : 'Bloqué'}
                        </span>
                      </button>
                    </td>
                    <td className="tbl-actions" data-label="Actions">
                      <div className="db-actions">
                        <button
                          className={u.isActive ? 'db-btn-danger' : 'db-btn-ghost'}
                          onClick={() => handleToggle(u)}
                          disabled={toggleMut.isPending}
                        >
                          {u.isActive ? 'Bloquer' : 'Activer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
