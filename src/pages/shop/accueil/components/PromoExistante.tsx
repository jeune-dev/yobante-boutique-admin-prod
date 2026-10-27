import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';

/** Libellés des sections de l'accueil. */
export const LIBELLE_SECTION: Record<string, string> = {
  nos_promos_du_moment: 'Nos promos du moment',
  a_ne_pas_rater: 'À ne pas rater',
  nos_promos_a_venir: 'Nos promos à venir',
};

/** « À ne pas rater › Ramadan », ou la section seule. */
export const emplacementPromo = (p: any) =>
  [LIBELLE_SECTION[p.section] ?? p.section, p.blocPromo?.titre].filter(Boolean).join(' › ');

/**
 * Promotions en cours ou à venir d'un produit, avec une vraie remise.
 * Un produit garde la même remise dans toutes les sections : ce sont ces
 * promotions qui fixent celle à reprendre.
 */
export async function promosEnCoursDuProduit(produitId: string, saufId?: string): Promise<any[]> {
  try {
    const r: any = await shopClient.get('/admin/promotions', {
      params: { produitId, enCours: true, limit: 50 },
    });
    return (r.promotions ?? []).filter(
      (p: any) => p.id !== saufId && Number(p.prixPromo) > 0
    );
  } catch {
    // Contrôle de confort : le serveur refuse de toute façon une remise différente.
    return [];
  }
}

const fcfa = (v: any) => `${Math.round(Number(v ?? 0)).toLocaleString('fr-FR')} FCFA`;
const date = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : null);

function periode(p: any) {
  const debut = date(p.dateDebut);
  const fin = date(p.dateFin);
  if (debut && fin) return `du ${debut} au ${fin}`;
  if (fin) return `jusqu'au ${fin}`;
  if (debut) return `à partir du ${debut}`;
  return 'sans date de fin';
}

/**
 * Mini fiche affichée quand l'admin choisit un produit déjà en promotion
 * ailleurs : où, avec quelle remise, à quel prix et jusqu'à quand. Il confirme
 * (le produit garde la même remise) ou annule.
 */
export default function PromoExistante({
  produit,
  promos,
  cible,
  onConfirmer,
  onAnnuler,
}: {
  produit: any;
  promos: any[];
  /** Où l'admin veut placer le produit. */
  cible: string;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  const ref = promos[0];
  const prixNormal = Number(produit?.prix ?? ref?.produit?.prix ?? 0);
  const image = produit?.images?.[0] ?? ref?.produit?.images?.[0];
  const pct = Math.round(Number(ref?.pourcentageReduction) || 0);
  const lieux = promos.map(emplacementPromo);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
        <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
        <p className="text-sm">
          Ce produit est déjà en promotion dans{' '}
          {lieux.map((l, i) => (
            <span key={l + i}>
              {i > 0 && (i === lieux.length - 1 ? ' et ' : ', ')}
              <strong>« {l} »</strong>
            </span>
          ))}
          {pct > 0 && <> avec une remise de <strong>−{pct} %</strong></>}.
        </p>
      </div>

      {/* Mini fiche produit */}
      <div className="carte flex gap-3 p-3">
        <div className="w-20 h-20 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
          {image ? (
            <img src={image} alt="" className="w-full h-full object-contain p-1.5" />
          ) : (
            <Icon name="image" size={20} className="text-gray-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{produit?.nom ?? ref?.produit?.nom}</p>
          <div className="flex flex-wrap items-baseline gap-x-2 mt-1">
            <span className="text-lg font-bold text-green-700 tabular-nums">{fcfa(ref?.prixPromo)}</span>
            {prixNormal > 0 && (
              <span className="text-sm text-gray-400 line-through tabular-nums">{fcfa(prixNormal)}</span>
            )}
            {pct > 0 && (
              <span className="text-xs font-bold text-white bg-red-500 rounded px-1.5 py-0.5">−{pct} %</span>
            )}
          </div>
          <ul className="mt-2 space-y-1">
            {promos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-2 text-xs text-gray-600">
                <Icon name="tag" size={12} className="text-gray-400" />
                <span className="font-medium text-gray-800">{emplacementPromo(p)}</span>
                <span className="text-gray-400">·</span>
                <span>{periode(p)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-sm text-gray-700">
        Voulez-vous également placer ce produit dans <strong>« {cible} »</strong> ? Il y gardera la
        même remise ({fcfa(ref?.prixPromo)}).
      </p>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onAnnuler}
          className="btn-secondaire"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirmer}
          className="btn-primaire"
        >
          Confirmer
        </button>
      </div>
    </div>
  );
}
