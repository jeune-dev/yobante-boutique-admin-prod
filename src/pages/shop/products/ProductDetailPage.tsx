import { useCallback, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import AdminBackButton from '@/shared/components/AdminBackButton';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import Icon from '@/shared/components/dashboard/Icon';
import BadgeStock from '@/shared/components/dashboard/BadgeStock';
import { Bloc, Chiffre, Squelette } from '@/shared/components/dashboard/Blocs';
import { etatRetour } from '@/shared/hooks/useRetour';
import { decimal, fcfa, nombre, pourcent } from '@/shared/utils/format';
import type { IndicateursProduit } from '@/domains/shop/types/indicateurs';
import StockModal from './components/StockModal';
import HistoriqueStock, { type IndicateursStock } from './components/HistoriqueStock';
import AjustementsManuels from './components/AjustementsManuels';
import CommandesDuProduit from './components/CommandesDuProduit';
import { nomUtilisateur } from './stock.labels';
import { CLASSE_ETAT_PRODUIT, LIBELLE_ETAT_PRODUIT, estEtatProduit } from '@/domains/shop/etatProduit';

interface Produit {
  id: string;
  nom: string;
  description?: string | null;
  reference?: string | null;
  prix?: number | string | null;
  prixPromo?: number | string | null;
  prixAchat?: number | string | null;
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
  /** Calculés par le backend : niveau de stock, marge, couverture, retours. */
  indicateurs?: IndicateursProduit;
}

function Ligne({ label, valeur }: { label: string; valeur: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</dt>
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
 *
 * Le niveau de stock vient du backend (`indicateurs.niveauStock`, quatre
 * paliers réglables côté serveur) et n'est pas recalculé ici — deux
 * implémentations finiraient par diverger.
 */
export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [stockModal, setStockModal] = useState(false);
  const [indicateurs, setIndicateurs] = useState<IndicateursStock | null>(null);

  // Référence stable : sans `useCallback`, l'effet de la section historique
  // se redéclencherait à chaque rendu de la page.
  const majIndicateurs = useCallback(
    (valeurs: IndicateursStock | null) => setIndicateurs(valeurs),
    []
  );

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
      <div className="space-y-3">
        <AdminBackButton parent="/boutique/produits" />
        <Squelette tuiles={6} />
      </div>
    );
  }

  if (isError || !produit) {
    return (
      <div className="space-y-3">
        <AdminBackButton parent="/boutique/produits" />
        <Bloc>
          <ErreurChargement
            erreur={error}
            onReessayer={() => refetch()}
            defaut="Produit introuvable."
          />
        </Bloc>
      </div>
    );
  }

  const stock = Number(produit.stock ?? 0);
  const image = produit.images?.[0];
  const boutique =
    produit.vendeur?.profilVendeur?.nomBoutique || nomUtilisateur(produit.vendeur, '');
  const ind = produit.indicateurs;

  return (
    <div className="space-y-3 sm:space-y-4">
      <AdminBackButton parent="/boutique/produits" />

      {/* ── En-tête de la fiche ──────────────────────────────────────── */}
      <Bloc className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {image ? (
            <img
              src={image}
              alt=""
              className="w-full sm:w-32 h-32 rounded-xl object-contain bg-white border border-gray-100 shrink-0"
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
                  {ind?.niveauStock ? (
                    <BadgeStock niveau={ind.niveauStock} stock={stock} />
                  ) : (
                    <span className="px-2 py-0.5 rounded-full border text-xs font-semibold bg-gray-50 text-gray-600 border-gray-200">
                      {nombre(stock)} en stock
                    </span>
                  )}
                  {produit.statutValidation && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600">
                      {produit.statutValidation}
                    </span>
                  )}
                  {estEtatProduit(produit.etat) && (
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${CLASSE_ETAT_PRODUIT[produit.etat]}`}>
                      {LIBELLE_ETAT_PRODUIT[produit.etat]}
                    </span>
                  )}
                  {produit.isActive === false && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-red-100 text-red-700">
                      Masqué
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStockModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600"
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
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  <Icon name="pencil" size={15} /> Modifier la fiche
                </button>
              </div>
            </div>

            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 mt-4">
              <Ligne label="Référence" valeur={produit.reference || '—'} />
              <Ligne
                label="Prix de vente"
                valeur={`${fcfa(produit.prix)}${produit.venduAuPoids ? ' / kg' : ''}`}
              />
              {produit.prixPromo != null && (
                <Ligne label="Prix promotionnel" valeur={fcfa(produit.prixPromo)} />
              )}
              {produit.prixAchat != null && (
                <Ligne label="Prix d’achat" valeur={fcfa(produit.prixAchat)} />
              )}
              <Ligne label="Rayon" valeur={produit.rayon?.nom || '—'} />
              <Ligne label="Sous-rayon" valeur={produit.sousRayon?.nom || '—'} />
              {produit.categorie?.nom && <Ligne label="Catégorie" valeur={produit.categorie.nom} />}
              {produit.poids != null && <Ligne label="Poids" valeur={`${produit.poids} kg`} />}
              <Ligne
                label="Stock disponible"
                valeur={nombre(ind?.stockDisponible ?? stock - Number(produit.stockAlloue ?? 0))}
              />
              <Ligne label="Stock réservé" valeur={nombre(produit.stockAlloue ?? 0)} />
              {boutique && <Ligne label="Vendeur" valeur={boutique} />}
            </dl>

            {produit.description && (
              <p className="text-sm text-gray-600 mt-4 whitespace-pre-wrap break-words">
                {produit.description}
              </p>
            )}
          </div>
        </div>
      </Bloc>

      {/* ── Mouvements de stock sur la période filtrée ───────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        <Chiffre libelle="Stock actuel" valeur={nombre(indicateurs?.stockActuel ?? stock)} />
        <Chiffre
          libelle="Entrées"
          valeur={indicateurs ? nombre(indicateurs.totalEntrees) : '—'}
          ton="bon"
          aide="Annulations, rejets et retours remis en stock"
        />
        <Chiffre
          libelle="Sorties"
          valeur={indicateurs ? nombre(indicateurs.totalSorties) : '—'}
          aide="Quantités sorties à la commande"
        />
        <Chiffre
          libelle="Ajustements +"
          valeur={indicateurs ? nombre(indicateurs.totalAjustementsPositifs) : '—'}
          ton="bon"
        />
        <Chiffre
          libelle="Ajustements −"
          valeur={indicateurs ? nombre(indicateurs.totalAjustementsNegatifs) : '—'}
          ton="attention"
        />
        <Chiffre
          libelle="Commandes"
          valeur={indicateurs ? nombre(indicateurs.nombreCommandes) : '—'}
          aide="Commandes distinctes contenant ce produit"
        />
      </div>

      {/* ── Indicateurs commerciaux déjà calculés par le backend ─────── */}
      {ind && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3">
          <Chiffre libelle="Quantité vendue" valeur={nombre(ind.quantiteVendue)} />
          <Chiffre libelle="Chiffre d’affaires" valeur={fcfa(ind.chiffreAffaires)} />
          <Chiffre
            libelle="Marge unitaire"
            valeur={ind.margeUnitaire == null ? '—' : fcfa(ind.margeUnitaire)}
            aide={
              ind.margeUnitaire == null
                ? "Prix d'achat non renseigné"
                : `Taux de marge ${pourcent(ind.tauxMarge)}`
            }
          />
          <Chiffre
            libelle="Couverture"
            valeur={ind.joursCouverture == null ? '—' : `${nombre(ind.joursCouverture)} j`}
            ton={
              ind.joursCouverture != null && ind.joursCouverture <= 7 ? 'critique' : 'neutre'
            }
            aide={
              ind.joursCouverture == null
                ? 'Aucune vente sur la fenêtre observée'
                : `Au rythme des ${ind.fenetreCouvertureJours} derniers jours`
            }
          />
          <Chiffre
            libelle="Taux de retour"
            valeur={pourcent(ind.tauxRetour)}
            ton={ind.tauxRetour >= 10 ? 'attention' : 'neutre'}
            aide={`${nombre(ind.quantiteRetournee)} article(s) sur ${decimal(ind.quantiteVendue, 0)} vendu(s)`}
          />
        </div>
      )}

      <HistoriqueStock produitId={produit.id} onIndicateurs={majIndicateurs} />

      <AjustementsManuels produitId={produit.id} />

      <CommandesDuProduit produitId={produit.id} vendeur={boutique || null} />

      {stockModal && <StockModal produit={produit} onFermer={() => setStockModal(false)} />}
    </div>
  );
}
