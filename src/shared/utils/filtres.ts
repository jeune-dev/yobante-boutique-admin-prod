/**
 * Prédicats de filtrage partagés par les listes de l'administration.
 *
 * Ils s'appliquent côté navigateur, sur la totalité des lignes chargées :
 * le résultat ne dépend donc pas de ce que chaque route du backend sait
 * filtrer. Une borne vide ne filtre rien.
 */

/** Minuscules, sans accents ni espaces superflus : « Éléphant » ≈ « elephant ». */
export const normaliser = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Vrai si l'un des champs contient le texte recherché. */
export const contientTexte = (champs: unknown[], recherche: string) => {
  const q = normaliser(recherche);
  if (!q) return true;
  return champs.some((c) => normaliser(c).includes(q));
};

/**
 * Date comprise dans [du ; au], bornes incluses, au jour près (AAAA-MM-JJ).
 * Une date absente ne passe qu'en l'absence de bornes.
 */
export const dansPeriode = (iso: string | null | undefined, du: string, au: string) => {
  if (!du && !au) return true;
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  // Comparaison en date locale : une commande de 23 h reste sur sa journée.
  const jour = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
  if (du && jour < du) return false;
  if (au && jour > au) return false;
  return true;
};

/** Nombre compris dans [min ; max], bornes incluses. Bornes saisies en texte. */
export const dansIntervalle = (valeur: unknown, min: string, max: string) => {
  if (min === '' && max === '') return true;
  const n = Number(valeur);
  if (valeur === null || valeur === undefined || !Number.isFinite(n)) return false;
  if (min !== '' && n < Number(min)) return false;
  if (max !== '' && n > Number(max)) return false;
  return true;
};

/** « du 01/10/2026 au 24/10/2026 », pour la feuille « Filtres » de l'export. */
export const libellePeriode = (du: string, au: string) => {
  const fr = (j: string) => j.split('-').reverse().join('/');
  if (du && au) return `du ${fr(du)} au ${fr(au)}`;
  if (du) return `à partir du ${fr(du)}`;
  if (au) return `jusqu'au ${fr(au)}`;
  return '';
};

/** « 1 000 à 5 000 », « ≥ 1 000 », « ≤ 5 000 ». */
export const libelleIntervalle = (min: string, max: string, unite = '') => {
  const f = (v: string) => `${Number(v).toLocaleString('fr-FR')}${unite}`;
  if (min && max) return `${f(min)} à ${f(max)}`;
  if (min) return `≥ ${f(min)}`;
  if (max) return `≤ ${f(max)}`;
  return '';
};
