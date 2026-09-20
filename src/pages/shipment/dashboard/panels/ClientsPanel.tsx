import { useState } from 'react';
import Icon from '@/shared/components/dashboard/Icon';

interface Client {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  statut: 'actif' | 'inactif';
  nbColis: number;
}

const FAKE_CLIENTS: Client[] = [
  { id: 1, nom: 'Diallo', prenom: 'Amadou', email: 'amadou@gmail.com', telephone: '+33 6 12 34 56 78', adresse: 'Paris, 75001', statut: 'actif', nbColis: 3 },
  { id: 2, nom: 'Sow', prenom: 'Fatou', email: 'fatou@gmail.com', telephone: '+221 78 234 56 78', adresse: 'Dakar, Plateau', statut: 'actif', nbColis: 1 },
  { id: 3, nom: 'Ndiaye', prenom: 'Moussa', email: 'moussa@gmail.com', telephone: '+33 7 34 56 78 90', adresse: 'Lyon, 69001', statut: 'inactif', nbColis: 0 },
  { id: 4, nom: 'Ba', prenom: 'Aissatou', email: 'aissatou@gmail.com', telephone: '+221 70 456 78 90', adresse: 'Saint-Louis', statut: 'actif', nbColis: 5 },
];

const STATUT_COLORS: Record<string, { background: string; color: string }> = {
  actif: { background: '#d1fae5', color: '#065f46' },
  inactif: { background: '#fee2e2', color: '#991b1b' },
};

export default function ClientsPanel() {
  const [clients, setClients] = useState<Client[]>(FAKE_CLIENTS);
  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'actif' | 'inactif'>('tous');
  const [selected, setSelected] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.nom.toLowerCase().includes(q) ||
      c.prenom.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.telephone.includes(search);
    const matchStatut = filtreStatut === 'tous' || c.statut === filtreStatut;
    return matchSearch && matchStatut;
  });

  const toggleStatut = (id: number) => {
    setClients((prev) => prev.map((c) => (c.id === id ? { ...c, statut: c.statut === 'actif' ? 'inactif' : 'actif' } : c)));
    setSelected((s) => (s && s.id === id ? { ...s, statut: s.statut === 'actif' ? 'inactif' : 'actif' } : s));
  };

  const handleSupprimer = (id: number) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setConfirmDelete(null);
    setSelected(null);
  };

  const initiales = (c: Client) => `${c.prenom[0]}${c.nom[0]}`.toUpperCase();

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.7rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="db-form-input" placeholder="Rechercher nom, email, téléphone..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 280, padding: '0.5rem 0.9rem' }} />
        {(['tous', 'actif', 'inactif'] as const).map((s) => (
          <button key={s} className={`db-chip${filtreStatut === s ? ' active' : ''}`} onClick={() => setFiltreStatut(s)}>
            {s === 'tous' ? 'Tous' : s === 'actif' ? 'Actifs' : 'Inactifs'}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#888' }}>{filtered.length} client{filtered.length > 1 ? 's' : ''}</div>
      </div>

      <div className="db-card">
        <div className="db-table-wrap tbl-wrap">
          <table className="tbl-cards">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Adresse</th>
                <th>Colis</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className="tbl-empty" colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Aucun client trouvé</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="tbl-primary">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1a56db, #3b7df5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>{initiales(c)}</div>
                        <span className="db-td-bold">{c.prenom} {c.nom}</span>
                      </div>
                    </td>
                    <td data-label="Email">{c.email}</td>
                    <td data-label="Téléphone">{c.telephone}</td>
                    <td data-label="Adresse">{c.adresse}</td>
                    <td data-label="Colis"><span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{c.nbColis} colis</span></td>
                    <td data-label="Statut"><span style={{ ...STATUT_COLORS[c.statut], padding: '3px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{c.statut}</span></td>
                    <td data-label="Actions" className="tbl-actions">
                      <div className="db-actions">
                        <button className="db-btn-ghost" onClick={() => setSelected(c)}>Voir</button>
                        <button className="db-btn-ghost" style={{ color: c.statut === 'actif' ? '#991b1b' : '#065f46', borderColor: c.statut === 'actif' ? '#991b1b' : '#065f46' }} onClick={() => toggleStatut(c.id)}>
                          {c.statut === 'actif' ? 'Désactiver' : 'Activer'}
                        </button>
                        <button className="db-btn-danger" onClick={() => setConfirmDelete(c)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ background: 'linear-gradient(135deg, #1a56db, #3b7df5)', borderRadius: '18px 18px 0 0', padding: '2rem 1.65rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.4rem' }}>{initiales(selected)}</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>{selected.prenom} {selected.nom}</div>
              <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '3px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{selected.statut}</span>
            </div>
            <div style={{ padding: '1.4rem 1.65rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <InfoRow icon="mail" label="Email" value={selected.email} />
              <InfoRow icon="phone" label="Téléphone" value={selected.telephone} />
              <InfoRow icon="map-pin" label="Adresse" value={selected.adresse} />
              <InfoRow icon="package" label="Nombre de colis" value={`${selected.nbColis} colis envoyés`} />
            </div>
            <div className="db-modal-footer">
              <button className="db-btn-danger" onClick={() => setConfirmDelete(selected)}>Supprimer</button>
              <button className="db-btn secondary" onClick={() => setSelected(null)}>Fermer</button>
              <button className="db-btn primary" style={{ background: selected.statut === 'actif' ? '#c94030' : '#1a56db' }} onClick={() => toggleStatut(selected.id)}>
                {selected.statut === 'actif' ? 'Désactiver' : 'Activer'}
              </button>
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
              Voulez-vous vraiment supprimer <strong>{confirmDelete.prenom} {confirmDelete.nom}</strong> ? Cette action est irréversible.
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

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f7f9fc', border: '1px solid #eaecf0', borderRadius: 10, padding: '0.75rem 1rem' }}>
      <span style={{ display: 'inline-flex', color: '#1a56db' }}><Icon name={icon} size={18} /></span>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 2 }}>{label}</div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111' }}>{value}</div>
      </div>
    </div>
  );
}
