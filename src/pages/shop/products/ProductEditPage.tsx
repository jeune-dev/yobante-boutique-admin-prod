import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [prix, setPrix] = useState('');
  const [venduAuPoids, setVenduAuPoids] = useState(false);
  const [stock, setStock] = useState('0');
  const [poids, setPoids] = useState('');
  const [reference, setReference] = useState('');
  const [avecEtat, setAvecEtat] = useState(false);
  const [etat, setEtat] = useState<'neuf' | 'reconditionne'>('neuf');
  const [rayonId, setRayonId] = useState('');
  const [sousRayonId, setSousRayonId] = useState('');
  const [loaded, setLoaded] = useState(false);

  const { data: produit } = useQuery({
    queryKey: ['produit', id],
    queryFn: () =>
      shopClient.get(`/admin/produits/${id}`).then((r: any) => r.produit ?? r),
    enabled: !!id,
  });

  useEffect(() => {
    if (produit && !loaded) {
      setNom(produit.nom || '');
      setDescription(produit.description || '');
      setPrix(String(produit.prix || ''));
      setVenduAuPoids(Boolean(produit.venduAuPoids));
      setStock(String(produit.stock || '0'));
      setPoids(String(produit.poids || ''));
      setReference(produit.reference || '');
      // Le backend stocke toujours un état (défaut « neuf ») : la case n'est
      // pré-cochée que si un état explicite (reconditionné) a été renseigné.
      setAvecEtat(produit.etat === 'reconditionne');
      setEtat(produit.etat === 'reconditionne' ? 'reconditionne' : 'neuf');
      setRayonId(produit.rayonId || produit.rayon?.id || '');
      setSousRayonId(produit.sousRayonId || produit.sousRayon?.id || '');
      setLoaded(true);
    }
  }, [produit, loaded]);

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

  const updateMutation = useMutation({
    mutationFn: (fd: FormData) => shopClient.put(`/admin/produits/${id}`, fd),
    onSuccess: (data) => {
      showSuccess(data);
      navigate('/boutique/produits');
    },
    onError: (e: any) => showError(e),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Modification importante : confirmation avant l'appel API.
    const confirme = await showConfirm({
      titre: 'Enregistrer les modifications',
      message: `Confirmez-vous la modification du produit « ${nom} » ?`,
      confirmText: 'Enregistrer',
    });
    if (!confirme) return;

    const fd = new FormData();
    fd.append('nom', nom);
    fd.append('description', description);
    fd.append('prix', prix);
    fd.append('venduAuPoids', String(venduAuPoids));
    fd.append('stock', stock);
    fd.append('etat', avecEtat ? etat : 'neuf');
    if (poids) fd.append('poids', poids);
    if (reference) fd.append('reference', reference);
    if (rayonId) fd.append('rayonId', rayonId);
    if (sousRayonId) fd.append('sousRayonId', sousRayonId);
    const files = fileRef.current?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) fd.append('images', files[i]);
    }
    updateMutation.mutate(fd);
  };

  if (!produit && id) {
    return <div className="p-8 text-center text-gray-400">Chargement…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/boutique/produits')}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le produit</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-700">Nom *</label>
            <input
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-vertical"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div>
            <label className="text-sm font-medium text-gray-700">Rayon</label>
            <select
              value={rayonId}
              onChange={(e) => {
                setRayonId(e.target.value);
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
            <label className="text-sm font-medium text-gray-700">Sous-rayon</label>
            <select
              value={sousRayonId}
              onChange={(e) => setSousRayonId(e.target.value)}
              disabled={!rayonId}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">— Sélectionner un sous-rayon —</option>
              {sousRayons.map((sr: any) => (
                <option key={sr.id} value={sr.id}>
                  {sr.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Référence</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
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
            <label className="text-sm font-medium text-gray-700">
              Images (vide = garder les actuelles)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/boutique/produits')}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Mise à jour…' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
