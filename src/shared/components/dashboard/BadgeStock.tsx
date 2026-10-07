import {
  CLASSE_NIVEAU_STOCK,
  LIBELLE_NIVEAU_STOCK,
  PUCE_NIVEAU_STOCK,
  type NiveauStock,
} from '@/domains/shop/types/indicateurs';

interface Props {
  niveau: NiveauStock;
  /** Quantité affichée à côté du libellé, quand elle est connue. */
  stock?: number;
  /** `compact` n'affiche que la pastille et le nombre — pour les tableaux. */
  compact?: boolean;
}

/**
 * Alerte visuelle de stock sur les quatre paliers de la boutique.
 *
 * Le niveau est **calculé par le backend** (`indicateurs.niveauStock`) et non
 * déduit du stock ici : les seuils sont réglables côté serveur, les rejouer
 * dans le front les ferait diverger à la première modification.
 *
 * La pastille colorée est doublée d'un libellé : la couleur seule n'est pas
 * lisible pour une personne daltonienne.
 */
export default function BadgeStock({ niveau, stock, compact = false }: Props) {
  const libelle = LIBELLE_NIVEAU_STOCK[niveau] ?? niveau;

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap"
        title={`${libelle}${stock !== undefined ? ` — ${stock} en stock` : ''}`}
      >
        <span aria-hidden="true">{PUCE_NIVEAU_STOCK[niveau]}</span>
        {stock !== undefined && <span className="font-medium text-gray-900">{stock}</span>}
        <span className="sr-only">{libelle}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap ${
        CLASSE_NIVEAU_STOCK[niveau] ?? 'bg-gray-50 text-gray-600 border-gray-200'
      }`}
    >
      <span aria-hidden="true">{PUCE_NIVEAU_STOCK[niveau]}</span>
      {libelle}
      {stock !== undefined && <span className="font-normal opacity-80">· {stock}</span>}
    </span>
  );
}
