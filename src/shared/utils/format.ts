/**
 * Formatage des valeurs affichées dans le dashboard.
 *
 * Centralisé parce que chaque page redéfinissait ses propres `fcfa` et
 * `nombre` : la même somme apparaissait « 1 250 000 FCFA » ici et
 * « 1250000 F CFA » là. Une seule définition, un seul rendu.
 */

const FR = 'fr-FR';

/** Montant en francs CFA, sans décimale : la monnaie n'a pas de centime. */
export const fcfa = (v: unknown): string =>
  `${Math.round(Number(v ?? 0)).toLocaleString(FR)} FCFA`;

/**
 * Montant abrégé pour les tuiles étroites : 1,2 M au lieu de 1 250 000.
 * La valeur exacte reste disponible en infobulle via `fcfa`.
 */
export const fcfaCourt = (v: unknown): string => {
  const n = Number(v ?? 0);
  const signe = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return `${signe}${(a / 1_000_000_000).toLocaleString(FR, { maximumFractionDigits: 1 })} Md`;
  if (a >= 1_000_000) return `${signe}${(a / 1_000_000).toLocaleString(FR, { maximumFractionDigits: 1 })} M`;
  if (a >= 10_000) return `${signe}${Math.round(a / 1000).toLocaleString(FR)} k`;
  return `${signe}${Math.round(a).toLocaleString(FR)}`;
};

export const nombre = (v: unknown): string => Number(v ?? 0).toLocaleString(FR);

/** Pourcentage déjà calculé par le backend — on ne divise pas une seconde fois. */
export const pourcent = (v: unknown, decimales = 1): string =>
  `${Number(v ?? 0).toLocaleString(FR, { maximumFractionDigits: decimales })} %`;

/** Décimal court, pour les moyennes de vente et les notes. */
export const decimal = (v: unknown, decimales = 2): string =>
  Number(v ?? 0).toLocaleString(FR, { maximumFractionDigits: decimales });

export const date = (iso?: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString(FR, { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

export const dateCourte = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleDateString(FR, { day: '2-digit', month: '2-digit' }) : '—';

/**
 * Libellé des bornes renvoyées par le backend.
 *
 * On affiche les bornes effectivement appliquées plutôt que de reconstituer
 * le texte depuis le filtre choisi : les deux pourraient diverger (borne de
 * fin inclusive, période « tout » sans borne).
 */
export const libelleBornes = (bornes?: { debut: string | null; fin: string | null } | null): string => {
  if (!bornes || (!bornes.debut && !bornes.fin)) return 'depuis le début';
  if (bornes.debut && bornes.fin) return `${date(bornes.debut)} → ${date(bornes.fin)}`;
  if (bornes.debut) return `depuis le ${date(bornes.debut)}`;
  return `jusqu'au ${date(bornes.fin)}`;
};

/** Convertit un filtre de période en bornes `debut`/`fin` pour les API analytiques. */
export const bornesDepuisPeriode = (filtre: {
  periode?: string;
  debut?: string;
  fin?: string;
}): { debut?: string; fin?: string } => {
  const { periode, debut, fin } = filtre;
  if (periode === 'personnalise') {
    return { ...(debut ? { debut } : {}), ...(fin ? { fin } : {}) };
  }
  if (periode === 'tout' || !periode) return {};

  const maintenant = new Date();
  const d = new Date(maintenant);
  if (periode === 'jour') d.setHours(0, 0, 0, 0);
  else if (periode === 'semaine') d.setDate(maintenant.getDate() - 7);
  else if (periode === 'annee') d.setFullYear(maintenant.getFullYear(), 0, 1);
  else d.setFullYear(maintenant.getFullYear(), maintenant.getMonth(), 1);

  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { debut: iso(d), fin: iso(maintenant) };
};
