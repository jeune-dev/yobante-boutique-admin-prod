import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/utils/alert';
import shopClient from '@/infrastructure/http/shop.client';
import { promotionsApi } from '@/domains/shop/api/promotions.api';
import Icon from '@/shared/components/dashboard/Icon';
import Modal, { BoutonPrincipal, BoutonSecondaire, Champ } from './Modal';

interface Props {
  section: string;
  /** Renseigné depuis la page d'une sous-section : le produit s'y rattache. */
  blocPromoId?: string;
  /** Null en création. */
  promotion: any | null;
  onFermer: () => void;
  onEnregistre: () => void;
}

/** Découpe la date ISO renvoyée par l'API pour un `input[type=date]`. */
const versInputDate = (iso?: string) => (iso ? iso.slice(0, 10) : '');

const formaterPrix = (v: any) => Number(v ?? 0).toLocaleString('fr-FR');

/**
 * Rattache un produit à une section ou à une sous-section, avec sa remise et
 * sa période de validité.
 *
 * L'ajout se fait en deux temps : on choisit d'abord un produit dans le
 * catalogue, puis on règle les conditions de la promotion. En modification, le
 * produit est figé et seule la seconde étape s'affiche.
 */
export default function PromotionModal({
  section,
  blocPromoId,
  promotion,
  onFermer,
  onEnregistre,
}: Props) {
  const edition = Boolean(promotion);

  // En modification le produit est déjà connu : on ouvre directement le réglage.
  const [etape, setEtape] = useState<'choix' | 'details'>(edition ? 'details' : 'choix');
  const [produit, setProduit] = useState<any>(promotion?.produit ?? null);

  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState<any[]>([]);
  const [chargement, setChargement] = useState(false);

  const [prixPromo, setPrixPromo] = useState(promotion?.prixPromo?.toString() ?? '');
  const [reduction, setReduction] = useState(
    promotion?.pourcentageReduction ? String(Math.round(Number(promotion.pourcentageReduction))) : ''
  );
  const [dateDebut, setDateDebut] = useState(versInputDate(promotion?.dateDebut));
  const [dateFin, setDateFin] = useState(versInputDate(promotion?.dateFin));

  /**
   * Charge le catalogue à l'ouverture, puis à chaque recherche.
   *
   * La liste s'affiche d'emblée : l'admin doit pouvoir parcourir les produits
   * disponibles sans deviner un nom à taper.
   */
  useEffect(() => {
    if (etape !== 'choix') return;

    setChargement(true);
    const t = setTimeout(
      async () => {
        try {
          const r: any = await shopClient.get('/admin/produits', {
            params: {
              limit: 30,
              isActive: true,
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
      // Pas d'attente au premier affichage, anti-rebond ensuite.
      recherche ? 350 : 0
    );
    return () => clearTimeout(t);
  }, [recherche, etape]);

  const prixBase = Number(produit?.prix ?? 0);

  /**
   * Le prix promotionnel et le pourcentage décrivent la même remise : saisir
   * l'un déduit l'autre, pour éviter des valeurs incohérentes.
   */
  const surPrix = (valeur: string) => {
    setPrixPromo(valeur);
    const promo = Number(valeur);
    if (prixBase > 0 && promo > 0 && promo < prixBase) {
      setReduction(Math.round((1 - promo / prixBase) * 100).toString());
    }
  };

  const surReduction = (valeur: string) => {
    setReduction(valeur);
    const pct = Number(valeur);
    if (prixBase > 0 && pct > 0 && pct < 100) {
      setPrixPromo(Math.round(prixBase * (1 - pct / 100)).toString());
    }
  };

  const enregistrer = useMutation({
    mutationFn: () => {
      const corps: any = {
        section,
        ...(blocPromoId ? { blocPromoId } : {}),
        ...(prixPromo ? { prixPromo: Number(prixPromo) } : {}),
        ...(reduction ? { pourcentageReduction: Number(reduction) } : {}),
        ...(dateDebut ? { dateDebut: new Date(dateDebut).toISOString() } : {}),
        // Fin de journée : une promotion « jusqu'au 15 » doit couvrir le 15.
        ...(dateFin ? { dateFin: new Date(`${dateFin}T23:59:59`).toISOString() } : {}),
      };
      if (edition) return promotionsApi.update(promotion.id, corps);
      return promotionsApi.create({ ...corps, produitId: produit.id });
    },
    onSuccess: (data) => {
      showSuccess(data);
      onEnregistre();
      onFermer();
    },
    onError: (e: any) => showError(e),
  });

  const valider = () => {
    if (!edition && !produit) {
      showError('Choisissez un produit');
      return;
    }
    if (prixBase > 0 && Number(prixPromo) >= prixBase) {
      showError('Le prix promotionnel doit être inférieur au prix du produit');
      return;
    }
    if (dateDebut && dateFin && new Date(dateFin) < new Date(dateDebut)) {
      showError('La date de fin précède la date de début');
      return;
    }
    enregistrer.mutate();
  };

  const choisir = (p: any) => {
    setProduit(p);
    setEtape('details');
    // Pré-remplit avec le prix promo déjà porté par la fiche produit, s'il existe.
    if (p.prixPromo && Number(p.prixPromo) > 0 && !prixPromo) {
      surPrix(String(Math.round(Number(p.prixPromo))));
    }
  };

  return (
    <Modal
      titre={edition ? 'Modifier la promotion' : 'Ajouter un produit en promotion'}
      sousTitre={
        edition
          ? undefined
          : etape === 'choix'
            ? 'Étape 1 sur 2 — choisir le produit'
            : 'Étape 2 sur 2 — définir la remise et la durée'
      }
      onFermer={onFermer}
      actions={
        etape === 'choix' ? (
          <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
        ) : (
          <>
            {!edition && (
              <BoutonSecondaire onClick={() => setEtape('choix')}>Retour</BoutonSecondaire>
            )}
            <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
            <BoutonPrincipal onClick={valider} disabled={enregistrer.isPending} ton="or">
              {enregistrer.isPending
                ? 'Enregistrement…'
                : edition
                  ? 'Enregistrer'
                  : 'Ajouter à la promotion'}
            </BoutonPrincipal>
          </>
        )
      }
    >
      {/* ── Étape 1 : choisir dans le catalogue ────────────────────────── */}
      {etape === 'choix' && (
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

          {chargement && <p className="text-xs text-gray-400">Chargement du catalogue…</p>}

          {!chargement && resultats.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">
              {recherche ? 'Aucun produit ne correspond.' : 'Aucun produit dans le catalogue.'}
            </p>
          )}

          {resultats.length > 0 && (
            <ul className="border border-gray-100 rounded-lg max-h-80 overflow-auto divide-y divide-gray-50">
              {resultats.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => choisir(p)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-yellow-50/60 transition-colors"
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
                      <span className="block text-xs text-gray-400">Stock : {p.stock ?? 0}</span>
                    </span>
                    <span className="text-sm text-gray-600 shrink-0">
                      {formaterPrix(p.prix)} FCFA
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Étape 2 : conditions de la promotion ───────────────────────── */}
      {etape === 'details' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
            {produit?.images?.[0] && (
              <img
                src={produit.images[0]}
                alt=""
                className="w-10 h-10 rounded-md object-cover shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {produit?.nom ?? 'Produit'}
              </p>
              {prixBase > 0 && (
                <p className="text-xs text-gray-500">
                  Prix habituel : {formaterPrix(prixBase)} FCFA
                </p>
              )}
            </div>
            {!edition && (
              <button
                onClick={() => setEtape('choix')}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 shrink-0"
              >
                Changer
              </button>
            )}
          </div>

          {/* ── Remise ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Prix promo (FCFA)" valeur={prixPromo} onChange={surPrix} type="number" />
            <Champ label="Remise (%)" valeur={reduction} onChange={surReduction} type="number" />
          </div>
          <p className="text-xs text-gray-400 -mt-2">
            Saisir l'un calcule l'autre automatiquement.
          </p>

          {/* ── Durée ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Début" valeur={dateDebut} onChange={setDateDebut} type="date" />
            <Champ label="Fin" valeur={dateFin} onChange={setDateFin} type="date" />
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50/60 rounded-lg">
            <Icon name="clock" size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800">
              Passé la date de fin, le produit disparaît automatiquement de l'application.
              Sans dates, la promotion reste affichée en permanence.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
