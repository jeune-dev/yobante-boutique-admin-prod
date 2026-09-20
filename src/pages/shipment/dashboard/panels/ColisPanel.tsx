import { useState } from 'react';
import Icon from '@/shared/components/dashboard/Icon';

interface Personne { nom: string; prenom: string; telephone: string; adresse?: string }
interface Colis {
  id: string;
  expediteur: Personne;
  destinataire: Personne;
  categorie: string;
  direction: string;
  mode_depot: string;
  statut: string;
  date: string;
}

const FAKE_COLIS: Colis[] = [
  { id: 'YB-MDFS10042026C14KX', expediteur: { nom: 'Diallo', prenom: 'Amadou', telephone: '+33 6 12 34 56 78' }, destinataire: { nom: 'Diallo', prenom: 'Fatou', telephone: '+221 77 123 45 67', adresse: 'Dakar, Plateau' }, categorie: '1', direction: 'france_senegal', mode_depot: 'depot', statut: 'en_attente', date: '2026-04-01' },
  { id: 'YB-SFFS11042026C24KY', expediteur: { nom: 'Sow', prenom: 'Ibrahima', telephone: '+33 7 23 45 67 89' }, destinataire: { nom: 'Sow', prenom: 'Mariama', telephone: '+221 78 234 56 78', adresse: 'Thiès, Centre' }, categorie: '2', direction: 'france_senegal', mode_depot: 'collecte', statut: 'valide', date: '2026-04-02' },
  { id: 'YB-NDSF12042026C34KZ', expediteur: { nom: 'Ndiaye', prenom: 'Moussa', telephone: '+221 76 345 67 89' }, destinataire: { nom: 'Ndiaye', prenom: 'Cheikh', telephone: '+33 6 34 56 78 90', adresse: 'Paris, 75001' }, categorie: '3', direction: 'senegal_france', mode_depot: 'collecte', statut: 'en_transit', date: '2026-04-03' },
  { id: 'YB-BAFS13042026C14KA', expediteur: { nom: 'Ba', prenom: 'Aissatou', telephone: '+33 6 45 67 89 01' }, destinataire: { nom: 'Ba', prenom: 'Oumar', telephone: '+221 70 456 78 90', adresse: 'Saint-Louis' }, categorie: '1', direction: 'france_senegal', mode_depot: 'depot', statut: 'livre', date: '2026-04-04' },
];

const STATUTS: Record<string, { label: string; background: string; color: string }> = {
  en_attente: { label: 'En attente', background: '#fef3c7', color: '#92400e' },
  valide: { label: 'Validé', background: '#dbeafe', color: '#1e40af' },
  paye: { label: 'Payé', background: '#e0e7ff', color: '#3730a3' },
  collecte: { label: 'Collecté', background: '#ede9fe', color: '#5b21b6' },
  en_transit: { label: 'En transit', background: '#e0f2fe', color: '#075985' },
  arrive_dakar: { label: 'Arrivé Dakar', background: '#dcfce7', color: '#166534' },
  livre: { label: 'Livré', background: '#d1fae5', color: '#065f46' },
  annule: { label: 'Annulé', background: '#f3f4f6', color: '#6b7280' },
  refuse: { label: 'Refusé', background: '#fee2e2', color: '#991b1b' },
};

const CATEGORIES: Record<string, string> = { '1': 'Document', '2': 'Colis moyen', '3': 'Gros colis' };
const DIRECTIONS: Record<string, string> = { france_senegal: 'France → Sénégal', senegal_france: 'Sénégal → France' };

export default function ColisPanel() {
  const [colis, setColis] = useState<Colis[]>(FAKE_COLIS);
  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const [filtreDirection, setFiltreDirection] = useState('tous');
  const [filtreCategorie, setFiltreCategorie] = useState('tous');
  const [selected, setSelected] = useState<Colis | null>(null);
  const [modalRefus, setModalRefus] = useState<Colis | null>(null);
  const [raisonRefus, setRaisonRefus] = useState('');

  const filtered = colis.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = c.id.toLowerCase().includes(q) || c.expediteur.nom.toLowerCase().includes(q) || c.destinataire.nom.toLowerCase().includes(q);
    const matchStatut = filtreStatut === 'tous' || c.statut === filtreStatut;
    const matchDirection = filtreDirection === 'tous' || c.direction === filtreDirection;
    const matchCategorie = filtreCategorie === 'tous' || c.categorie === filtreCategorie;
    return matchSearch && matchStatut && matchDirection && matchCategorie;
  });

  const changerStatut = (id: string, newStatut: string) => {
    setColis((prev) => prev.map((c) => (c.id === id ? { ...c, statut: newStatut } : c)));
    setSelected((s) => (s && s.id === id ? { ...s, statut: newStatut } : s));
  };

  const handleRefuser = () => {
    if (!raisonRefus.trim() || !modalRefus) return;
    changerStatut(modalRefus.id, 'refuse');
    setModalRefus(null);
    setRaisonRefus('');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.7rem', marginBottom: '0.8rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="db-form-input" placeholder="Rechercher numéro, expéditeur, destinataire..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 320, padding: '0.5rem 0.9rem' }} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: '#888', alignSelf: 'center' }}>Direction :</span>
        {['tous', 'france_senegal', 'senegal_france'].map((d) => (
          <button key={d} className={`db-chip${filtreDirection === d ? ' active' : ''}`} onClick={() => setFiltreDirection(d)}>
            {d === 'tous' ? 'Toutes' : DIRECTIONS[d]}
          </button>
        ))}
        <span style={{ fontSize: '0.8rem', color: '#888', alignSelf: 'center', marginLeft: 8 }}>Catégorie :</span>
        {['tous', '1', '2', '3'].map((c) => (
          <button key={c} className={`db-chip${filtreCategorie === c ? ' active' : ''}`} onClick={() => setFiltreCategorie(c)}>
            {c === 'tous' ? 'Toutes' : CATEGORIES[c]}
          </button>
        ))}
        <span style={{ fontSize: '0.8rem', color: '#888', alignSelf: 'center', marginLeft: 8 }}>Statut :</span>
        <select className="db-form-input db-form-select" value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} style={{ width: 160, padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}>
          <option value="tous">Tous</option>
          {Object.entries(STATUTS).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      <div className="db-card">
        <div className="db-table-wrap tbl-wrap">
          <table className="tbl-cards">
            <thead>
              <tr>
                <th>N° Suivi</th>
                <th>Expéditeur</th>
                <th>Destinataire</th>
                <th>Cat.</th>
                <th>Direction</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td className="tbl-empty" colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>Aucun colis trouvé</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="tbl-primary db-td-bold" style={{ fontSize: '0.78rem' }}>{c.id}</td>
                    <td data-label="Expéditeur">{c.expediteur.prenom} {c.expediteur.nom}</td>
                    <td data-label="Destinataire">{c.destinataire.prenom} {c.destinataire.nom}</td>
                    <td data-label="Cat."><span style={{ background: '#f0f4ff', color: '#1a56db', padding: '2px 8px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 600 }}>Cat. {c.categorie}</span></td>
                    <td data-label="Direction" style={{ fontSize: '0.82rem' }}>{DIRECTIONS[c.direction]}</td>
                    <td data-label="Statut">
                      <select value={c.statut} onChange={(e) => changerStatut(c.id, e.target.value)} style={{ background: STATUTS[c.statut]?.background, color: STATUTS[c.statut]?.color, border: 'none', borderRadius: 20, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                        {Object.entries(STATUTS).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Date" style={{ fontSize: '0.82rem' }}>{c.date}</td>
                    <td data-label="Actions" className="tbl-actions">
                      <div className="db-actions">
                        <button className="db-btn-ghost" onClick={() => setSelected(c)}>Voir</button>
                        {(c.categorie === '2' || c.categorie === '3') && c.statut === 'en_attente' && (
                          <>
                            <button className="db-btn-ghost" style={{ color: '#065f46', borderColor: '#065f46' }} onClick={() => changerStatut(c.id, 'valide')}>Valider</button>
                            <button className="db-btn-danger" onClick={() => setModalRefus(c)}>Refuser</button>
                          </>
                        )}
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
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <div className="db-modal-head">
              <div className="db-modal-title">Colis {selected.id}</div>
              <button className="db-modal-close" onClick={() => setSelected(null)}><Icon name="x" size={14} /></button>
            </div>
            <div style={{ padding: '0 1.65rem 1.65rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ background: STATUTS[selected.statut]?.background, color: STATUTS[selected.statut]?.color, padding: '4px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600 }}>{STATUTS[selected.statut]?.label}</span>
              </div>
              <SectionLabel label="Informations générales" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem', marginBottom: '1rem' }}>
                <InfoBox label="Catégorie" value={CATEGORIES[selected.categorie]} />
                <InfoBox label="Direction" value={DIRECTIONS[selected.direction]} />
                <InfoBox label="Mode dépôt" value={selected.mode_depot === 'depot' ? 'Dépôt en agence' : 'Collecte à domicile'} />
                <InfoBox label="Date" value={selected.date} />
              </div>
              <SectionLabel label="Expéditeur" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem', marginBottom: '1rem' }}>
                <InfoBox label="Nom" value={`${selected.expediteur.prenom} ${selected.expediteur.nom}`} />
                <InfoBox label="Téléphone" value={selected.expediteur.telephone} />
              </div>
              <SectionLabel label="Destinataire" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem', marginBottom: '1rem' }}>
                <InfoBox label="Nom" value={`${selected.destinataire.prenom} ${selected.destinataire.nom}`} />
                <InfoBox label="Téléphone" value={selected.destinataire.telephone} />
                <InfoBox label="Adresse" value={selected.destinataire.adresse || '—'} />
              </div>
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>Changer le statut</div>
                <select className="db-form-input db-form-select" value={selected.statut} onChange={(e) => changerStatut(selected.id, e.target.value)}>
                  {Object.entries(STATUTS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="db-modal-footer">
              <button className="db-btn secondary" onClick={() => setSelected(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {modalRefus && (
        <div onClick={() => { setModalRefus(null); setRaisonRefus(''); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
            <div className="db-modal-head">
              <div className="db-modal-title">Refuser le colis</div>
              <button className="db-modal-close" onClick={() => { setModalRefus(null); setRaisonRefus(''); }}><Icon name="x" size={14} /></button>
            </div>
            <div style={{ padding: '0 1.65rem 1.65rem' }}>
              <p style={{ color: '#444', marginBottom: '1rem', fontSize: '0.9rem' }}>
                Veuillez indiquer la raison du refus pour le colis <strong>{modalRefus.id}</strong>.
              </p>
              <div className="db-form-group">
                <label className="db-form-label">Raison du refus</label>
                <textarea className="db-form-input" rows={4} value={raisonRefus} onChange={(e) => setRaisonRefus(e.target.value)} placeholder="Ex: Contenu non conforme..." style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="db-modal-footer">
              <button className="db-btn secondary" onClick={() => { setModalRefus(null); setRaisonRefus(''); }}>Annuler</button>
              <button className="db-btn confirm" onClick={handleRefuser}>Confirmer le refus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>{label}</div>;
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f7f9fc', border: '1px solid #eaecf0', borderRadius: 10, padding: '0.75rem 1rem' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#111' }}>{value}</div>
    </div>
  );
}
