import { useState } from 'react';
import ChoixImagesProduit from './components/ChoixImagesProduit';
import AdminBackButton from '@/shared/components/AdminBackButton';
import { useRetour } from '@/shared/hooks/useRetour';
import { useConfirmationSortie } from '@/shared/hooks/useConfirmationSortie';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';

export default function ProductCreatePage() {
  const retour = useRetour('/boutique/produits');
  const qc = useQueryClient();

  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [prix, setPrix] = useState('');
  const [prixAchat, setPrixAchat] = useState('');
  const [venduAuPoids, setVenduAuPoids] = useState(false);
  const [stock, setStock] = useState('0');
  const [poids, setPoids] = useState('');
  const [reference, setReference] = useState('');
  const [avecEtat, setAvecEtat] = useState(false);
  const [etat, setEtat] = useState<'neuf' | 'reconditionne'>('neuf');
  const [rayonId, setRayonId] = useState('');
  const [sousRayonId, setSousRayonId] = useState('');
  const [images, setImages] = useState<File[]>([]);

  // Formulaire vierge = rien à protéger ; la moindre saisie demande confirmation
  // avant de quitter la page.
  const modifie =
    !!(nom || description || prix || poids || reference || rayonId || sousRayonId) ||
    venduAuPoids ||
    avecEtat ||
    stock !== '0' ||
    images.length > 0;
  const { autoriserSortie } = useConfirmationSortie(modifie);

  const { data: rayonsData } = useQuery({
    queryKey: ['rayons-select'],
    queryFn: () =>
      shopClient
        .get('/admin/rayons', { params: { actif: true, limit: 100 } })
        .then((r: any) => r.rayons ?? []),
  });

  const { data: sousRayonsData } = useQuery({
    queryKey: ['sous-rayons-select', rayonId],
    queryFn: () =>
      shopClient
        .get(`/admin/rayons/${rayonId}/sous-rayons`)
        .then((r: any) => r.sousRayons ?? []),
    enabled: !!rayonId,
  });

  const rayons: any[] = rayonsData || [];
  const sousRayons: any[] = sousRayonsData || [];

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => shopClient.post('/admin/produits', fd),
    onSuccess: (data) => {
      showSuccess(data);
      qc.invalidateQueries({ queryKey: ['admin-produits'] });
      autoriserSortie();
      retour();
    },
    // Le backend refuse notamment un sous-rayon étranger au rayon choisi :
    // afficher son message vaut mieux qu'un « Erreur » opaque.
    onError: (e: any) => showError(e),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rayonId) return showError('Choisissez un rayon');
    if (!sousRayonId) return showError('Choisissez un sous-rayon');

    // Confirmation avant tout appel : l'API n'est sollicitée qu'après un « oui ».
    const confirme = await showConfirm({
      titre: 'Créer le produit',
      message: `Confirmez-vous la création du produit « ${nom} » ?`,
      confirmText: 'Créer',
    });
    if (!confirme) return;

    const fd = new FormData();
    fd.append('nom', nom);
    fd.append('description', description);
    fd.append('prix', prix);
    if (prixAchat) fd.append('prixAchat', prixAchat);
    fd.append('venduAuPoids', String(venduAuPoids));
    fd.append('stock', stock);
    fd.append('rayonId', rayonId);
    fd.append('sousRayonId', sousRayonId);
    // Case décochée : état non précisé (aucun badge dans l'application).
    fd.append('etat', avecEtat ? etat : '');
    if (poids) fd.append('poids', poids);
    if (reference) fd.append('reference', reference);
    // Dans l'ordre choisi : la première est la photo principale.
    images.forEach((f) => fd.append('images', f));
    createMutation.mutate(fd);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <AdminBackButton parent="/boutique/produits" className="mb-3" />
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Nouveau produit</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700">Nom *</label>
            <input
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              placeholder="Nom du produit"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-vertical"
              placeholder="Description…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                {venduAuPoids ? 'Prix au kg (FCFA) *' : 'Prix (FCFA) *'}
              </label>
              <input
                required
                type="number"
                min="0"
                value={prix}
                onChange={(e) => setPrix(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={venduAuPoids}
                  onChange={(e) => setVenduAuPoids(e.target.checked)}
                  className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-300"
                />
                Vendre au poids (prix à la pesée)
              </label>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Stock *</label>
              <input
                required
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
            </div>
          </div>

          {/* Le prix d'achat n'est jamais exposé au client : le backend
              l'exclut par défaut de toutes ses lectures publiques. Il sert à
              calculer la marge brute dans la liste des produits. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                {venduAuPoids ? "Prix d'achat au kg (FCFA)" : "Prix d'achat (FCFA)"}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={prixAchat}
                onChange={(e) => setPrixAchat(e.target.value)}
                placeholder="Optionnel"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
              <p className="mt-1 text-xs text-gray-400">
                Réservé à l'administration. Sans lui, la marge reste incalculable.
              </p>
            </div>
            {/* Marge annoncée en direct : une erreur de saisie (prix d'achat
                supérieur au prix de vente) se voit immédiatement. */}
            {!!prix && !!prixAchat && (
              <div className="sm:self-end">
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    Number(prixAchat) >= Number(prix)
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-green-200 bg-green-50 text-green-700'
                  }`}
                >
                  {Number(prixAchat) >= Number(prix) ? (
                    <>Le prix d'achat atteint ou dépasse le prix de vente : marge nulle ou négative.</>
                  ) : (
                    <>
                      Marge unitaire{' '}
                      <strong>
                        {(Number(prix) - Number(prixAchat)).toLocaleString('fr-FR')} FCFA
                      </strong>{' '}
                      ({Math.round(((Number(prix) - Number(prixAchat)) / Number(prix)) * 100)} %)
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Le rangement du produit se fait uniquement par rayon puis
              sous-rayon : la catégorie a été retirée du formulaire, et le
              backend ne l'attend plus. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Rayon *</label>
              <select
                required
                value={rayonId}
                onChange={(e) => {
                  setRayonId(e.target.value);
                  // Le sous-rayon retenu appartient à l'ancien rayon : on le vide.
                  setSousRayonId('');
                }}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              >
                <option value="">— Sélectionner un rayon —</option>
                {rayons.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Sous-rayon *</label>
              <select
                required
                value={sousRayonId}
                onChange={(e) => setSousRayonId(e.target.value)}
                disabled={!rayonId}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">
                  {rayonId ? '— Sélectionner un sous-rayon —' : '— Choisir un rayon d’abord —'}
                </option>
                {sousRayons.map((sr: any) => (
                  <option key={sr.id} value={sr.id}>
                    {sr.nom}
                  </option>
                ))}
              </select>
              {rayonId && sousRayons.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  Ce rayon n’a aucun sous-rayon. Créez-en un depuis la page Rayons.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Référence</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                placeholder="REF-001"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Poids (kg)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={poids}
                onChange={(e) => setPoids(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                placeholder="0.5"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={avecEtat}
                onChange={(e) => setAvecEtat(e.target.checked)}
                className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-300"
              />
              Préciser l'état du produit (neuf / reconditionné)
            </label>
            {avecEtat && (
              <select
                value={etat}
                onChange={(e) => setEtat(e.target.value as 'neuf' | 'reconditionne')}
                className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              >
                <option value="neuf">Neuf</option>
                <option value="reconditionne">Reconditionné</option>
              </select>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Photos du produit</label>
            <ChoixImagesProduit fichiers={images} onChange={setImages} />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={retour}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60"
            >
              {createMutation.isPending ? 'Création…' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
