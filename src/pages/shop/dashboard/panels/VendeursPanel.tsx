import { useState } from 'react';
import { useVendeurs, useStatutVendeur, useCreerVendeur } from '@/domains/shop/hooks/useAdminBoutique';
import { showConfirm } from '@/shared/utils/alert';
import Icon from '@/shared/components/dashboard/Icon';
import { StateRow } from './_state';

interface Vendeur {
  id: string;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string | null;
  isActive?: boolean;
  isBlocked?: boolean;
  statut?: 'actif' | 'bloque';
  nomBoutique?: string | null;
  adresseBoutique?: string | null;
  boutique?: { nom?: string | null; adresse?: string | null } | null;
}

/** Le backend renvoie `statut`; `isActive` sert de repli défensif. */
const estBloque = (v: Vendeur) =>
  v.statut ? v.statut === 'bloque' : v.isBlocked ?? v.isActive === false;

const nomBoutique = (v: Vendeur) => v.nomBoutique || v.boutique?.nom || '—';

const EMPTY = { nom: '', prenom: '', email: '', telephone: '', nomBoutique: '', adresseBoutique: '' };

export default function VendeursPanel() {
  const { data, isLoading, isError } = useVendeurs();
  const statut = useStatutVendeur();
  const creer = useCreerVendeur();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const vendeurs: Vendeur[] = data?.vendeurs ?? [];

  const handleCreer = async () => {
    if (!form.nom || !form.prenom || !form.email || !form.nomBoutique) return;

    const confirme = await showConfirm({
      titre: 'Créer le vendeur',
      message: `Créer le compte vendeur de ${form.prenom} ${form.nom} ? Un mot de passe temporaire lui sera envoyé par email.`,
      confirmText: 'Créer',
    });
    if (!confirme) return;

    // Les champs facultatifs vides ne sont pas transmis : le backend valide des
    // chaînes non vides dès que la clé est présente.
    const payload: Record<string, string> = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      nomBoutique: form.nomBoutique.trim(),
    };
    if (form.telephone.trim()) payload.telephone = form.telephone.trim();
    if (form.adresseBoutique.trim()) payload.adresseBoutique = form.adresseBoutique.trim();

    creer.mutate(payload, {
      onSuccess: () => {
        setModal(false);
        setForm(EMPTY);
      },
    });
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

    statut.mutate({ id: v.id, bloquer });
  };

  return (
    <div>
      <div style={{ display: 'flex', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ fontSize: '0.9rem', color: '#555' }}>{vendeurs.length} vendeur(s)</div>
        <button className="db-btn primary" style={{ marginLeft: 'auto' }} onClick={() => { setForm(EMPTY); setModal(true); }}>
          + Ajouter un vendeur
        </button>
      </div>
      <div className="db-card">
        <div className="db-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendeur</th>
                <th>Boutique</th>
                <th>Email</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <StateRow colSpan={5} loading={isLoading} error={isError} empty={vendeurs.length === 0} emptyLabel="Aucun vendeur" />
              {!isLoading && !isError &&
                vendeurs.map((v) => {
                  const bloque = estBloque(v);
                  return (
                    <tr key={v.id}>
                      <td className="db-td-bold">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {v.prenom} {v.nom}
                          {/* Repère visuel immédiat d'un compte bloqué */}
                          {bloque && (
                            <span title="Vendeur bloqué" aria-label="Vendeur bloqué" style={{ color: '#dc2626', display: 'inline-flex' }}>
                              <Icon name="lock" size={13} />
                            </span>
                          )}
                        </span>
                      </td>
                      <td>{nomBoutique(v)}</td>
                      <td>{v.email || '—'}</td>
                      <td>
                        <span style={{ background: bloque ? '#fee2e2' : '#d1fae5', color: bloque ? '#991b1b' : '#065f46', padding: '3px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                          {bloque ? 'Bloqué' : 'Actif'}
                        </span>
                      </td>
                      <td>
                        <div className="db-actions">
                          <button
                            className="db-btn-ghost"
                            style={{ color: bloque ? '#065f46' : '#991b1b', borderColor: bloque ? '#065f46' : '#991b1b' }}
                            disabled={statut.isPending}
                            onClick={() => handleStatut(v)}
                          >
                            {bloque ? 'Débloquer' : 'Bloquer'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div onClick={() => setModal(false)} className="db-pop-overlay">
          <div onClick={(e) => e.stopPropagation()} className="db-pop" style={{ maxWidth: 480 }}>
            <div className="db-modal-head">
              <div className="db-modal-title">Ajouter un vendeur</div>
              <button className="db-modal-close" onClick={() => setModal(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="db-pop-body">
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.8rem' }}>
                Le compte sera <strong>actif immédiatement</strong>. Un mot de passe temporaire est
                envoyé par email ; le vendeur devra le changer à sa première connexion.
              </p>
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
                <label className="db-form-label">Nom de la boutique</label>
                <input className="db-form-input" value={form.nomBoutique} onChange={(e) => setForm({ ...form, nomBoutique: e.target.value })} />
              </div>
              <div className="db-form-group">
                <label className="db-form-label">Adresse de la boutique</label>
                <input className="db-form-input" value={form.adresseBoutique} onChange={(e) => setForm({ ...form, adresseBoutique: e.target.value })} />
              </div>
            </div>
            <div className="db-modal-footer">
              <button className="db-btn secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="db-btn primary" disabled={creer.isPending} onClick={handleCreer}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
