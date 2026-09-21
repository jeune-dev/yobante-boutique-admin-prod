import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminBackButton from '@/shared/components/AdminBackButton';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError } from '@/shared/utils/alert';

const api = {
  clients: () => shopClient.get('/admin/users', { params: { role: 'CLIENT', limit: 200 } }).then((r: any) => r.users ?? r ?? []),
  produits: () => shopClient.get('/admin/produits', { params: { limit: 200, actif: true } }).then((r: any) => r.produits ?? r ?? []),
  adresses: (userId: string) => shopClient.get(`/users/${userId}/adresses`).then((r: any) => r.adresses ?? r ?? []),
  creer: (data: any) => shopClient.post('/admin/commandes', data),
};

export default function OrderCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [clientId, setClientId] = useState('');
  const [adresseId, setAdresseId] = useState('');
  const [note, setNote] = useState('');
  const [methode, setMethode] = useState('cash_livraison');
  const [items, setItems] = useState<{ produitId: string; quantite: number; nom?: string; prix?: number }[]>([]);
  const [produitId, setProduitId] = useState('');
  const [quantite, setQuantite] = useState(1);

  const { data: clientsData } = useQuery({ queryKey: ['clients-select'], queryFn: api.clients });
  const { data: produitsData } = useQuery({ queryKey: ['produits-select'], queryFn: api.produits });
  const { data: adressesData, refetch: refetchAdresses } = useQuery({
    queryKey: ['adresses', clientId],
    queryFn: () => api.adresses(clientId),
    enabled: !!clientId,
  });

  const clients = clientsData || [];
  const produits = produitsData || [];
  const adresses = adressesData || [];

  const mutation = useMutation({
    mutationFn: (payload: any) => api.creer(payload),
    onSuccess: (data: any) => {
      showSuccess(data.message || data);
      qc.invalidateQueries({ queryKey: ['commandes'] });
      navigate('/boutique/commandes');
    },
    onError: (e: any) => showError(e),
  });

  const ajouterItem = () => {
    if (!produitId) return;
    const prod = produits.find((p: any) => p.id === produitId || p.id?.toString() === produitId);
    if (!prod) return;
    const exist = items.find((i) => i.produitId === produitId);
    if (exist) {
      setItems(items.map((i) => (i.produitId === produitId ? { ...i, quantite: i.quantite + quantite } : i)));
    } else {
      setItems([...items, { produitId, quantite, nom: prod.nom, prix: Number(prod.prix) }]);
    }
    setProduitId('');
    setQuantite(1);
  };

  const supprimerItem = (pid: string) => setItems(items.filter((i) => i.produitId !== pid));

  const calcSousTotal = () => items.reduce((s, i) => s + (i.prix || 0) * i.quantite, 0);
  const fraisLivraison = 15;
  const total = calcSousTotal() + fraisLivraison;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return showError('Sélectionnez un client');
    if (!adresseId) return showError('Sélectionnez une adresse');
    if (items.length === 0) return showError('Ajoutez au moins un produit');
    mutation.mutate({
      userId: clientId,
      adresseId,
      note,
      methode,
      items: items.map((i) => ({ produitId: i.produitId, quantite: i.quantite })),
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <AdminBackButton />
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nouvelle commande</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-6">
        <section>
          <h2 className="font-semibold text-gray-900 mb-3">Client</h2>
          <select
            required
            value={clientId}
            onChange={(e) => { setClientId(e.target.value); setAdresseId(''); }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            <option value="">— Sélectionner un client —</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.prenom} {c.nom} — {c.email}</option>
            ))}
          </select>
          {clientId && (
            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700 block mb-1">Adresse</label>
              <select
                required
                value={adresseId}
                onChange={(e) => setAdresseId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              >
                <option value="">— Sélectionner une adresse —</option>
                {adresses.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.rue}, {a.ville}</option>
                ))}
              </select>
            </div>
          )}
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-3">Produits</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <select
              value={produitId}
              onChange={(e) => setProduitId(e.target.value)}
              className="flex-1 min-w-[12rem] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
            >
              <option value="">— Produit —</option>
              {produits.map((p: any) => (
                <option key={p.id} value={p.id}>{p.nom} — {Number(p.prix || 0).toLocaleString('fr-FR')} FCFA</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={quantite}
              onChange={(e) => setQuantite(Number(e.target.value))}
              className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
            <button type="button" onClick={ajouterItem} className="px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">Ajouter</button>
          </div>
          {items.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <tr><th className="text-left py-2">Produit</th><th className="text-left py-2">Qté</th><th className="text-left py-2">Prix</th><th className="text-right py-2">Sous-total</th><th></th></tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.produitId} className="border-b border-gray-50">
                    <td className="py-2">{it.nom}</td>
                    <td className="py-2">{it.quantite}</td>
                    <td className="py-2">{(it.prix || 0).toLocaleString('fr-FR')} FCFA</td>
                    <td className="py-2 text-right">{((it.prix || 0) * it.quantite).toLocaleString('fr-FR')} FCFA</td>
                    <td className="py-2 text-right"><button type="button" onClick={() => supprimerItem(it.produitId)} className="text-xs text-red-500 hover:underline">Retirer</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="font-semibold text-gray-900 mb-3">Livraison & Paiement</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Méthode de paiement</label>
              <select value={methode} onChange={(e) => setMethode(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300">
                <option value="cash_livraison">Cash à la livraison</option>
                <option value="wave">Wave</option>
                <option value="orange_money">Orange Money</option>
                <option value="carte">Carte</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Note admin</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" placeholder="Note optionnelle" />
            </div>
          </div>
        </section>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between text-sm"><span>Sous-total</span><span>{calcSousTotal().toLocaleString('fr-FR')} FCFA</span></div>
          <div className="flex justify-between text-sm"><span>Frais livraison</span><span>{fraisLivraison.toLocaleString('fr-FR')} FCFA</span></div>
          <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-200"><span>Total</span><span>{total.toLocaleString('fr-FR')} FCFA</span></div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate('/boutique/commandes')} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-60">{mutation.isPending ? 'Création…' : 'Créer la commande'}</button>
        </div>
      </form>
    </div>
  );
}
