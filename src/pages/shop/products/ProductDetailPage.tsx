import { useCallback, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import AdminBackButton from '@/shared/components/AdminBackButton';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import Icon from '@/shared/components/dashboard/Icon';
import { etatRetour } from '@/shared/hooks/useRetour';
import StockModal from './components/StockModal';
import HistoriqueStock, { type Indicateurs } from './components/HistoriqueStock';
import AjustementsManuels from './components/AjustementsManuels';
import CommandesDuProduit from './components/CommandesDuProduit';
import { formaterMontant, nomUtilisateur } from './stock.labels';

interface Produit {
  id: string;
  nom: string;
  description?: string | null;
  reference?: string | null;
  prix?: number | string | null;
  prixPromo?: number | string | null;
  stock?: number | null;
  stockAlloue?: number | null;
  images?: string[] | null;
  isActive?: boolean;
  statutValidation?: string;
  venduAuPoids?: boolean;
  etat?: string | null;
  poids?: number | string | null;
  rayon?: { id: string; nom: string } | null;
  sousRayon?: { id: string; nom: string } | null;
  categorie?: { id: string; nom: string } | null;
  vendeur?: {
    id: string;
    nom?: string;
    prenom?: string;
    email?: string;
    profilVendeur?: { nomBoutique?: string } | null;
  } | null;
}

/**
 * Seuil d'alerte du dashboard (`getKpiStocks` côté API). Le modèle Produit
 * ne porte PAS de seuil par produit : celui-ci est global et sert uniquement
 * à qualifier l'affichage, rien n'est inventé en base.
 */
const SEUIL_ALERTE = 5;

const statutStock = (stock: number) => {
  if (stock <= 0) return { libelle: 'En rupture', classe: 'bg-red-100 text-red-700' };
  if (stock <= SEUIL_ALERTE) return { libelle: 'Stock faible', classe: 'bg-yellow-100 text-yellow-700' };
  return { libelle: 'Stock suffisant', classe: 'bg-green-100 text-green-700' };
};

/** Tuile d'indicateur. Affiche « — » tant que la valeur n'est pas connue. */
function Tuile({ libelle, valeur, ton = 'neutre' }: { libelle: string; valeur?: number; ton?: 'neutre' | 'positif' | 'negatif' }) {
  const couleur =
    ton === 'positif' ? 'text-green-600' : ton === 'negatif' ? 'text-red-600' : 'text-gray-900';
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      <p className="text-xs text-gray-500">{libelle}</p>
      <p className={`text-xl font-bold mt-0.5 ${couleur}`}>{valeur ?? '—'}</p>
    </div>
  );
}

function Ligne({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900 break-words">{valeur}</dd>
    </div>
  );
}

/**
 * Fiche d'un produit : identité commerciale, indicateurs de stock, journal
 * complet des mouvements, ajustements manuels et commandes concernées.
 *
 * Chaque section charge ses propres données et gère seule son chargement,
 * son erreur et son état vide : une section en échec n'emporte pas la page.
 */
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [stockModal, setStockModal] = useState(false);
  const [indicateurs, setIndicateurs] = useState<Indicateurs | null>(null);

  // Référence stable : sans `useCallback`, l'effet de la section historique
  // se redéclencherait à chaque rendu de la page.
  const majIndicateurs = useCallback((valeurs: Indicateurs | null) => setIndicateurs(valeurs), []);

  const {
    data: produit,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-produit', id],
    queryFn: () =>
      shopClient
        .get<{ produit: Produit }>(`/admin/produits/${id}`)
        .then((reponse) => reponse.produit),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div>
        <AdminBackButton parent="/boutique/produits" className="mb-3" />
        <div className="p-8 text-center text-gray-400">Chargement…</div>
      </div>
    );
  }

  if (isError || !produit) {
    return (
      <div>
        <AdminBackButton parent="/boutique/produits" className="mb-3" />
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <ErreurChargement
            erreur={error}
            onReessayer={() => refetch()}
            defaut="Produit introuvable."
          />
        </div>
      </div>
    );
  }

  const stock = Number(produit.stock ?? 0);
  const etatStock = statutStock(stock);
  const image = produit.images?.[0];
  const boutique =
    produit.vendeur?.profilVendeur?.nomBoutique || nomUtilisateur(produit.vendeur, '');

  return (
    <div className="space-y-5">
      <AdminBackButton parent="/boutique/produits" />

      {/* ── En-tête de la fiche ──────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {image ? (
            <img
              src={image}
              alt=""
              className="w-full sm:w-32 h-32 rounded-xl object-cover shrink-0 bg-gray-50"
            />
          ) : (
            <div className="w-full sm:w-32 h-32 rounded-xl bg-gray-100 shrink-0" />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                  {produit.nom}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${etatStock.classe}`}>
                    {etatStock.libelle} · {stock} en stock
                  </span>
                  {produit.statutValidation && (
                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                      {produit.statutValidation}
                    </span>
                  )}
                  {produit.etat === 'reconditionne' && (
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                      Reconditionné
                    </span>
                  )}
                  {produit.isActive === false && (
                    <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                      Masqué
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStockModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 sm:py-2 text-sm font-semibold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600"
                >
                  <Icon name="package" size={15} /> Modifier le stock
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/boutique/produits/${produit.id}/modifier`, {
                      state: etatRetour(location),
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  <Icon name="pencil" size={15} /> Modifier la fiche
                </button>
              </div>
            </div>

            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 mt-4">
              <Ligne label="Référence" valeur={produit.reference || '—'} />
              <Ligne
                label="Prix de vente"
                valeur={`${formaterMontant(produit.prix)}${produit.venduAuPoids ? ' / kg' : ''}`}
              />
              {produit.prixPromo != null && (
                <Ligne label="Prix promotionnel" valeur={formaterMontant(produit.prixPromo)} />
              )}
              <Ligne label="Rayon" valeur={produit.rayon?.nom || '—'} />
              <Ligne label="Sous-rayon" valeur={produit.sousRayon?.nom || '—'} />
              {produit.categorie?.nom && (
                <Ligne label="Catégorie" valeur={produit.categorie.nom} />
              )}
              {produit.poids != null && <Ligne label="Poids" valeur={`${produit.poids} kg`} />}
              <Ligne label="Stock alloué" valeur={String(produit.stockAlloue ?? 0)} />
              {boutique && <Ligne label="Vendeur" valeur={boutique} />}
            </dl>

            {produit.description && (
              <p className="text-sm text-gray-600 mt-4 whitespace-pre-wrap break-words">
                {produit.description}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Indicateurs, alignés sur la période filtrée ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Tuile libelle="Stock actuel" valeur={indicateurs?.stockActuel ?? stock} />
        <Tuile libelle="Entrées" valeur={indicateurs?.totalEntrees} ton="positif" />
        <Tuile libelle="Sorties" valeur={indicateurs?.totalSorties} ton="negatif" />
        <Tuile
          libelle="Ajustements +"
          valeur={indicateurs?.totalAjustementsPositifs}
          ton="positif"
        />
        <Tuile
          libelle="Ajustements −"
          valeur={indicateurs?.totalAjustementsNegatifs}
          ton="negatif"
        />
        <Tuile libelle="Commandes" valeur={indicateurs?.nombreCommandes} />
      </div>

      <HistoriqueStock produitId={produit.id} onIndicateurs={majIndicateurs} />

      <AjustementsManuels produitId={produit.id} />

      <CommandesDuProduit produitId={produit.id} vendeur={boutique || null} />

      {stockModal && (
        <StockModal produit={produit} onFermer={() => setStockModal(false)} />
      )}
    </div>
  );
}
