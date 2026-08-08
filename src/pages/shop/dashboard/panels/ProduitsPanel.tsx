import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';
import {
  useProduits,
  useCategories,
  useCreerProduit,
  useModifierProduit,
  useCreerCategorie,
  boutiqueKeys,
} from '@/domains/shop/hooks/useAdminBoutique';
import * as api from '@/domains/shop/api/admin.api';
import Icon from '@/shared/components/dashboard/Icon';
import { StateRow, fcfa } from './_state';

interface Categorie { id: string; nom?: string }
interface Produit {
  id: string;
  nom?: string;
  titre?: string;
  prix?: number;
  stock?: number;
  quantite?: number;
  description?: string;
  categorie?: { id?: string; nom?: string } | string;
  categorieId?: string;
  image?: string;
  images?: string[];
  isVisible?: boolean;
  isActive?: boolean;
}

const nomCategorie = (c: Produit['categorie']) =>
  typeof c === 'string' ? c : c?.nom || '—';
const imgOf = (p?: Produit): string | null => (p?.image || p?.images?.[0]) ?? null;

export default function ProduitsPanel() {
  const { data, isLoading, isError } = useProduits({ limit: 100 });
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ produit: Produit | null } | null>(null);

  const produits: Produit[] = data?.produits ?? [];

  const del = useMutation({
    mutationFn: (id: string) => api.supprimerProduit(id),
    onSuccess: (data) => {
      showSuccess(data);
      qc.invalidateQueries({ queryKey: ['boutique', 'produits'] });
    },
    onError: (e: any) => showError(e),
  });

  const toggleVis = useMutation({
    mutationFn: (id: string) => api.toggleProduitVisibilite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: boutiqueKeys.produits() }),
    onError: (e: any) => showError(e),
  });

  const confirmerSuppression = async (p: Produit) => {
    const confirme = await showConfirm({
      titre: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer ${p.nom || p.titre || 'ce produit'} ?`,
      confirmText: 'Supprimer',
      danger: true,
    });
    if (confirme) del.mutate(p.id);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return produits.filter((p) => (p.nom || p.titre || '').toLowerCase().includes(q));
  }, [produits, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.7rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="db-form-input" placeholder="Rechercher un produit..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 260, padding: '0.5rem 0.9rem' }} />
        <button className="db-btn primary" style={{ marginLeft: 'auto' }} onClick={() => setEditor({ produit: null })}>+ Ajouter un produit</button>
      </div>

      <div className="db-card">
        <div className="db-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Prix</th>
                <th>Stock</th>
                <th>Visible</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <StateRow colSpan={7} loading={isLoading} error={isError} empty={filtered.length === 0} emptyLabel="Aucun produit trouvé" />
              {!isLoading && !isError &&
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: '#f0f0ee', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                        {imgOf(p) ? <img src={imgOf(p)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="shopping-bag" size={20} />}
                      </div>
                    </td>
                    <td className="db-td-bold">{p.nom || p.titre || '—'}</td>
                    <td>{nomCategorie(p.categorie)}</td>
                    <td>{fcfa(p.prix)}</td>
                    <td>{p.stock ?? p.quantite ?? '—'}</td>
                    <td>
                      <span onClick={() => toggleVis.mutate(p.id)} style={{ background: p.isVisible ? '#d1fae5' : '#fee2e2', color: p.isVisible ? '#065f46' : '#991b1b', padding: '3px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }} title="Changer la visibilité">
                        {p.isVisible ? 'Visible' : 'Masqué'}
                      </span>
                    </td>
                    <td>
                      <div className="db-actions">
                        <button className="db-btn-ghost" onClick={() => setEditor({ produit: p })}>Modifier</button>
                        <button className="db-btn-danger" onClick={() => confirmerSuppression(p)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {editor && <ProductEditor produit={editor.produit} onClose={() => setEditor(null)} />}
    </div>
  );
}

function ProductEditor({ produit, onClose }: { produit: Produit | null; onClose: () => void }) {
  const { data: catData } = useCategories();
  const creer = useCreerProduit();
  const modifier = useModifierProduit();
  const creerCat = useCreerCategorie();
  const categories: Categorie[] = catData?.categories ?? [];

  const initialCatId =
    produit?.categorieId ?? (typeof produit?.categorie === 'object' ? produit?.categorie?.id : '') ?? '';

  const [nom, setNom] = useState(produit?.nom ?? '');
  const [description, setDescription] = useState(produit?.description ?? '');
  const [prix, setPrix] = useState(String(produit?.prix ?? ''));
  const [stock, setStock] = useState(String(produit?.stock ?? ''));
  const [categorieId, setCategorieId] = useState(initialCatId);
  const [files, setFiles] = useState<FileList | null>(null);
  const [newCat, setNewCat] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  const busy = creer.isPending || modifier.isPending;
  const canSave = !!nom && !!prix && !!categorieId;

  const handleCreerCategorie = () => {
    if (!newCat.trim()) return;
    const fd = new FormData();
    fd.append('nom', newCat.trim());
    creerCat.mutate(fd, {
      onSuccess: (res: any) => {
        const created = res?.categorie ?? res;
        if (created?.id) setCategorieId(created.id);
        setNewCat('');
        setShowNewCat(false);
      },
    });
  };

  const handleSave = () => {
    if (!canSave) return;
    const fd = new FormData();
    fd.append('nom', nom);
    if (description) fd.append('description', description);
    fd.append('prix', prix);
    if (stock) fd.append('stock', stock);
    fd.append('categorieId', categorieId);
    if (files) Array.from(files).slice(0, 5).forEach((f) => fd.append('images', f));

    if (produit) {
      modifier.mutate({ id: produit.id, data: fd }, { onSuccess: onClose });
    } else {
      creer.mutate(fd, { onSuccess: onClose });
    }
  };

  return (
    <div onClick={onClose} className="db-pop-overlay">
      <div onClick={(e) => e.stopPropagation()} className="db-pop" style={{ maxWidth: 520 }}>
        <div className="db-modal-head">
          <div className="db-modal-title">{produit ? 'Modifier le produit' : 'Ajouter un produit'}</div>
          <button className="db-modal-close" onClick={onClose}><Icon name="x" size={14} /></button>
        </div>
        <div className="db-pop-body">
          <div className="db-form-group">
            <label className="db-form-label">Nom du produit</label>
            <input className="db-form-input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Huile de palme" />
          </div>
          <div className="db-form-group">
            <label className="db-form-label">Description</label>
            <textarea className="db-form-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div className="db-form-group">
              <label className="db-form-label">Prix (FCFA)</label>
              <input className="db-form-input" type="number" value={prix} onChange={(e) => setPrix(e.target.value)} placeholder="3500" />
            </div>
            <div className="db-form-group">
              <label className="db-form-label">Stock</label>
              <input className="db-form-input" type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="10" />
            </div>
          </div>

          <div className="db-form-group">
            <label className="db-form-label">Catégorie</label>
            {showNewCat ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="db-form-input" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nom de la catégorie" />
                <button className="db-btn primary" disabled={creerCat.isPending} onClick={handleCreerCategorie}>Créer</button>
                <button className="db-btn secondary" onClick={() => setShowNewCat(false)}>×</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="db-form-input db-form-select" value={categorieId} onChange={(e) => setCategorieId(e.target.value)} style={{ flex: 1 }}>
                  <option value="">— Choisir —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
                <button className="db-btn secondary" onClick={() => setShowNewCat(true)} title="Nouvelle catégorie"><Icon name="plus" size={14} /></button>
              </div>
            )}
          </div>

          <div className="db-form-group">
            <label className="db-form-label">Images {produit && '(laisser vide pour conserver)'}</label>
            <input className="db-form-input" type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
          </div>
        </div>
        <div className="db-modal-footer">
          <button className="db-btn secondary" onClick={onClose}>Annuler</button>
          <button className="db-btn primary" disabled={!canSave || busy} onClick={handleSave}>
            {produit ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
