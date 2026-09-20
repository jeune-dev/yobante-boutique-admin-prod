import { useState } from 'react';
import Icon from '@/shared/components/dashboard/Icon';

interface Admin {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  role: string;
  statut: 'actif' | 'inactif';
}

const FAKE_ADMINS: Admin[] = [
  { id: 1, nom: 'Fall', prenom: 'Mamadou', email: 'mamadou@yobante.com', telephone: '+221 77 111 22 33', role: 'Super Admin', statut: 'actif' },
  { id: 2, nom: 'Diop', prenom: 'Awa', email: 'awa@yobante.com', telephone: '+221 78 444 55 66', role: 'Gestionnaire', statut: 'actif' },
];

const EMPTY = { nom: '', prenom: '', email: '', telephone: '', role: 'Gestionnaire', statut: 'actif' as const };

export default function AdminsPanel() {
  const [admins, setAdmins] = useState<Admin[]>(FAKE_ADMINS);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Omit<Admin, 'id'>>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<Admin | null>(null);

  const handleAjouter = () => {
    if (!form.nom || !form.prenom || !form.email) return;
    setAdmins((prev) => [{ id: Date.now(), ...form }, ...prev]);
    setModal(false);
    setForm(EMPTY);
  };

  const toggleStatut = (id: number) =>
    setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, statut: a.statut === 'actif' ? 'inactif' : 'actif' } : a)));

  const handleSupprimer = (id: number) => {
    setAdmins((prev) => prev.filter((a) => a.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', color: '#555' }}>{admins.length} administrateur(s)</div>
        <button className="db-btn primary" style={{ marginLeft: 'auto' }} onClick={() => { setForm(EMPTY); setModal(true); }}>+ Ajouter un admin</button>
      </div>

      <div className="db-card">
        <div className="db-table-wrap tbl-wrap">
          <table className="tbl-cards">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr><td className="tbl-empty" colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Aucun administrateur</td></tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id}>
                    <td className="tbl-primary db-td-bold">{a.prenom} {a.nom}</td>
                    <td data-label="Email">{a.email}</td>
                    <td data-label="Téléphone">{a.telephone || '—'}</td>
                    <td data-label="Rôle">{a.role}</td>
                    <td data-label="Statut">
                      <span style={{ background: a.statut === 'actif' ? '#d1fae5' : '#fee2e2', color: a.statut === 'actif' ? '#065f46' : '#991b1b', padding: '3px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{a.statut}</span>
                    </td>
                    <td data-label="Actions" className="tbl-actions">
                      <div className="db-actions">
                        <button className="db-btn-ghost" onClick={() => toggleStatut(a.id)}>{a.statut === 'actif' ? 'Désactiver' : 'Activer'}</button>
                        <button className="db-btn-danger" onClick={() => setConfirmDelete(a)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <div className="db-modal-head">
              <div className="db-modal-title">Ajouter un administrateur</div>
              <button className="db-modal-close" onClick={() => setModal(false)}><Icon name="x" size={14} /></button>
            </div>
            <div style={{ padding: '0 1.65rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div className="db-form-group">
                  <label className="db-form-label">Prénom</label>
                  <input className="db-form-input" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
                </div>
                <div className="db-form-group">
                  <label className="db-form-label">Nom</label>
                  <input className="db-form-input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
                </div>
              </div>
              <div className="db-form-group">
                <label className="db-form-label">Email</label>
                <input className="db-form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="db-form-group">
                <label className="db-form-label">Téléphone</label>
                <input className="db-form-input" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
              <div className="db-form-group">
                <label className="db-form-label">Rôle</label>
                <select className="db-form-input db-form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Gestionnaire">Gestionnaire</option>
                </select>
              </div>
            </div>
            <div className="db-modal-footer">
              <button className="db-btn secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="db-btn primary" onClick={handleAjouter}>Créer</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <div className="db-modal-head">
              <div className="db-modal-title">Confirmer la suppression</div>
              <button className="db-modal-close" onClick={() => setConfirmDelete(null)}><Icon name="x" size={14} /></button>
            </div>
            <div style={{ padding: '0 1.65rem 1.65rem', color: '#444' }}>
              Supprimer <strong>{confirmDelete.prenom} {confirmDelete.nom}</strong> ?
            </div>
            <div className="db-modal-footer">
              <button className="db-btn secondary" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="db-btn confirm" onClick={() => handleSupprimer(confirmDelete.id)}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
