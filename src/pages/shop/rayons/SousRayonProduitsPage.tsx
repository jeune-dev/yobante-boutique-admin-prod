import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/utils/alert';
import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';
import Modal, { BoutonSecondaire } from '@/pages/shop/accueil/components/Modal';

const api = {
  sousRayon: (id: string) => shopClient.get(`/admin/rayons/sous-rayons/${id}`),
  rayons: () => shopClient.get('/admin/rayons', { params: { limit: 200 } }),
  produits: (sousRayonId: string) =>
    shopClient.get('/admin/produits', { params: { sousRayonId, limit: 200 } }),
  ranger: (produitId: string, corps: any) =>
    shopClient.put(`/admin/produits/${produitId}`, corps),
};

const formaterPrix = (v: any) => Number(v ?? 0).toLocaleString('fr-FR');

/**
 * Produits rangés dans un sous-rayon, avec ajout depuis le catalogue et retrait.
 *
 * Ranger un produit revient à renseigner son `sousRayonId` (et le `rayonId`
 * parent) ; le retirer remet les deux à vide. Il n'existe pas de table de
 * liaison : un produit n'appartient qu'à un seul sous-rayon.
 */
export default function SousRayonProduitsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ajoutOuvert, setAjoutOuvert] = useState(false);

  // La route dédiée n'existe pas côté API : on retrouve le sous-rayon dans la
  // liste des rayons, qui les embarque déjà tous.
  const rayonsQuery = useQuery({ queryKey: ['rayons-tous'], queryFn: api.rayons });

  const { rayon, sousRayon } = (() => {
    const rayons: any[] = (rayonsQuery.data as any)?.rayons ?? [];
    for (const r of rayons) {
      const sr = (r.sousRayons ?? []).find((x: any) => x.id === id);
      if (sr) return { rayon: r, sousRayon: sr };
    }
    return { rayon: null, sousRayon: null };
  })();

  const produitsQuery = useQuery({
    queryKey: ['sous-rayon', id, 'produits'],
    queryFn: () => api.produits(id),
    enabled: !!id,
  });

  const produits: any[] = (produitsQuery.data as any)?.produits ?? [];

  const rafraichir = () => {
    qc.invalidateQueries({ queryKey: ['sous-rayon', id, 'produits'] });
    qc.invalidateQueries({ queryKey: ['rayons'] });
  };

  const retirer = useMutation({
    mutationFn: (produitId: string) =>
      api.ranger(produitId, { rayonId: null, sousRayonId: null }),
    onSuccess: (data) => {
      showSuccess(data);
      rafraichir();
    },
    onError: (e: any) => showError(e),
  });

  const ajouter = useMutation({
    mutationFn: (produitId: string) =>
      api.ranger(produitId, { rayonId: rayon?.id, sousRayonId: id }),
    onSuccess: (data) => {
      showSuccess(data);
      rafraichir();
    },
    onError: (e: any) => showError(e),
  });

  return (
    <div>
      <div className="flex flex-wrap items-start gap-3 mb-6">
        <button
          onClick={() => navigate('/boutique/rayons')}
          className="btn-icon -ml-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Retour"
        >
          <Icon name="chevron-left" size={20} />
        </button>
        <div className="min-w-0 flex-1 basis-40">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
            {sousRayon?.nom ?? 'Sous-rayon'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {rayon ? (
              <>
                Rayon{' '}
                <Link to="/boutique/rayons" className="text-yellow-700 hover:underline">
                  {rayon.nom}
                </Link>{' '}
                ·{' '}
              </>
            ) : null}
            {produits.length} produit{produits.length > 1 ? 's' : ''} rangé
            {produits.length > 1 ? 's' : ''} ici.
          </p>
        </div>
        <button
          onClick={() => setAjoutOuvert(true)}
          disabled={!rayon}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3.5 py-2.5 sm:py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 shrink-0"
        >
          <Icon name="plus" size={15} /> Ajouter un produit
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {produitsQuery.isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : produits.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 mb-3">Aucun produit dans ce sous-rayon.</p>
            <button
              onClick={() => setAjoutOuvert(true)}
              disabled={!rayon}
              className="text-sm font-medium text-yellow-700 hover:underline disabled:opacity-50"
            >
              Ajouter le premier produit
            </button>
          </div>
        ) : (
          <div className="tbl-wrap">
          <table className="w-full text-sm tbl-cards">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-medium text-gray-500">Produit</th>
                <th className="p-4 font-medium text-gray-500">Prix</th>
                <th className="p-4 font-medium text-gray-500">Stock</th>
                <th className="p-4 font-medium text-gray-500">État</th>
                <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {produits.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="p-4 tbl-primary">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.images?.[0] ? (
                        <img
                          src={p.images[0]}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <span className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                      )}
                      <span className="font-medium text-gray-900 line-clamp-2 min-w-0">{p.nom}</span>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap" data-label="Prix">{formaterPrix(p.prix)} FCFA</td>
                  <td className="p-4 text-gray-600" data-label="Stock">{p.stock ?? 0}</td>
                  <td className="p-4" data-label="État">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        p.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {p.isActive ? 'Visible' : 'Masqué'}
                    </span>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap tbl-actions" data-label="Actions">
                    <Link
                      to={`/boutique/produits/${p.id}/modifier`}
                      title="Modifier la fiche"
                      aria-label="Modifier la fiche"
                      className="btn-icon text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <Icon name="pencil" size={16} />
                    </Link>
                    <button
                      onClick={() => retirer.mutate(p.id)}
                      disabled={retirer.isPending}
                      title="Retirer du sous-rayon"
                      aria-label="Retirer du sous-rayon"
                      className="btn-icon text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {ajoutOuvert && rayon && (
        <ModaleAjout
          sousRayonNom={sousRayon?.nom ?? ''}
          dejaRanges={new Set(produits.map((p) => p.id))}
          onChoisir={(produitId) => ajouter.mutate(produitId)}
          enCours={ajouter.isPending}
          onFermer={() => setAjoutOuvert(false)}
        />
      )}
    </div>
  );
}

/** Choix d'un produit du catalogue à ranger dans le sous-rayon. */
function ModaleAjout({
  sousRayonNom,
  dejaRanges,
  onChoisir,
  enCours,
  onFermer,
}: {
  sousRayonNom: string;
  dejaRanges: Set<string>;
  onChoisir: (produitId: string) => void;
  enCours: boolean;
  onFermer: () => void;
}) {
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState<any[]>([]);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    setChargement(true);
    const t = setTimeout(
      async () => {
        try {
          const r: any = await shopClient.get('/admin/produits', {
            params: {
              limit: 30,
              ...(recherche.trim().length >= 2 ? { search: recherche.trim() } : {}),
            },
          });
          setResultats(r.produits ?? []);
        } catch {
          setResultats([]);
        } finally {
          setChargement(false);
        }
      },
      recherche ? 350 : 0
    );
    return () => clearTimeout(t);
  }, [recherche]);

  return (
    <Modal
      titre="Ajouter un produit"
      sousTitre={`Il sera rangé dans « ${sousRayonNom} »`}
      onFermer={onFermer}
      actions={<BoutonSecondaire onClick={onFermer}>Fermer</BoutonSecondaire>}
    >
      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon name="search" size={15} />
          </span>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher dans le catalogue…"
            autoFocus
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>

        {chargement && <p className="text-xs text-gray-400">Chargement…</p>}

        {!chargement && resultats.length === 0 && (
          <p className="text-sm text-gray-400 py-8 text-center">
            {recherche ? 'Aucun produit ne correspond.' : 'Aucun produit dans le catalogue.'}
          </p>
        )}

        {resultats.length > 0 && (
          <ul className="border border-gray-100 rounded-lg max-h-80 overflow-auto divide-y divide-gray-50">
            {resultats.map((p) => {
              const dedans = dejaRanges.has(p.id);
              // Un produit rangé ailleurs sera déplacé, pas dupliqué : on le
              // signale pour que ce ne soit pas une surprise.
              const ailleurs = !dedans && p.sousRayonId;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => !dedans && onChoisir(p.id)}
                    disabled={dedans || enCours}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-yellow-50/60 disabled:hover:bg-transparent disabled:opacity-60"
                  >
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt=""
                        className="w-10 h-10 rounded-md object-cover shrink-0"
                      />
                    ) : (
                      <span className="w-10 h-10 rounded-md bg-gray-100 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900 truncate">
                        {p.nom}
                      </span>
                      <span className="block text-xs text-gray-400">
                        {formaterPrix(p.prix)} FCFA
                        {ailleurs && ' · rangé dans un autre sous-rayon'}
                      </span>
                    </span>
                    {dedans && (
                      <span className="text-xs font-medium text-gray-400 shrink-0">Déjà ici</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
