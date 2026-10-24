/**
 * Export Excel (.xlsx) des listes de l'administration.
 *
 * Le fichier compte deux feuilles :
 * - « Données » : une ligne par élément, en-têtes en gras figés en haut ;
 *   dates et montants restent de vraies valeurs Excel (tri, somme, filtre
 *   automatique possibles), pas du texte mis en forme ;
 * - « Filtres » : date de l'export, nombre de lignes et filtres appliqués,
 *   pour savoir plus tard ce que contient le fichier.
 *
 * La bibliothèque n'est chargée qu'au premier export : elle ne pèse rien sur
 * l'ouverture du dashboard.
 */

export type ValeurExport = string | number | boolean | Date | null | undefined;

export interface ColonneExport<T> {
  titre: string;
  valeur: (ligne: T) => ValeurExport;
  /** Largeur en caractères (défaut : 18). */
  largeur?: number;
  /** Montant : séparateur de milliers, sans décimale. */
  montant?: boolean;
  /** Date seule (sans heure). */
  dateSeule?: boolean;
}

export interface OptionsExport<T> {
  /** Préfixe du nom de fichier, ex. « commandes ». */
  nomFichier: string;
  lignes: T[];
  colonnes: ColonneExport<T>[];
  /** Filtres appliqués, libellé → valeur lisible. Les valeurs vides sont ignorées. */
  filtres?: Record<string, string | undefined>;
}

const deux = (n: number) => String(n).padStart(2, '0');

/** `commandes_2026-10-24_14h05.xlsx` */
export const nomFichierExport = (prefixe: string, maintenant = new Date()) =>
  `${prefixe}_${maintenant.getFullYear()}-${deux(maintenant.getMonth() + 1)}-${deux(
    maintenant.getDate()
  )}_${deux(maintenant.getHours())}h${deux(maintenant.getMinutes())}.xlsx`;

/** Date ISO / chaîne → Date valide, sinon null (cellule vide plutôt que « Invalid Date »). */
export const enDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Nombre ou null : une valeur absente reste une cellule vide, pas un 0 trompeur. */
export const enNombre = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const STYLE_ENTETE = {
  fontWeight: 'bold' as const,
  backgroundColor: '#FEF3C7',
  borderColor: '#D1D5DB',
  borderStyle: 'thin' as const,
};

/** Cellule au format attendu par write-excel-file. */
function cellule(valeur: ValeurExport, col: { montant?: boolean; dateSeule?: boolean }) {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  if (valeur instanceof Date) {
    return { value: valeur, type: Date, format: col.dateSeule ? 'dd/mm/yyyy' : 'dd/mm/yyyy hh:mm' };
  }
  if (typeof valeur === 'number') {
    return { value: valeur, type: Number, format: col.montant ? '#,##0' : undefined };
  }
  if (typeof valeur === 'boolean') return { value: valeur ? 'Oui' : 'Non', type: String };
  return { value: String(valeur), type: String };
}

/** Construit les feuilles (exporté pour les tests). */
export function construireFeuilles<T>({ lignes, colonnes, filtres }: OptionsExport<T>, maintenant = new Date()) {
  const donnees = [
    colonnes.map((c) => ({ value: c.titre, ...STYLE_ENTETE })),
    ...lignes.map((l) => colonnes.map((c) => cellule(c.valeur(l), c))),
  ];

  const filtresActifs = Object.entries(filtres ?? {}).filter(([, v]) => v && v.trim());
  const resume = [
    [{ value: 'Export', ...STYLE_ENTETE }, { value: '', ...STYLE_ENTETE }],
    ['Date de l’export', { value: maintenant, type: Date, format: 'dd/mm/yyyy hh:mm' }],
    ['Nombre de lignes', { value: lignes.length, type: Number }],
    [null, null],
    [{ value: 'Filtre', ...STYLE_ENTETE }, { value: 'Valeur', ...STYLE_ENTETE }],
    ...(filtresActifs.length
      ? filtresActifs.map(([cle, v]) => [cle, v as string])
      : [['Aucun filtre', 'Toutes les données']]),
  ];

  return [
    {
      data: donnees,
      sheet: 'Données',
      columns: colonnes.map((c) => ({ width: c.largeur ?? 18 })),
      stickyRowsCount: 1,
    },
    { data: resume, sheet: 'Filtres', columns: [{ width: 24 }, { width: 48 }] },
  ];
}

/** Génère le fichier et lance son téléchargement dans le navigateur. */
export async function exporterExcel<T>(options: OptionsExport<T>): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const maintenant = new Date();
  // Les types de la bibliothèque ne décrivent pas l'union de cellules que l'on
  // construit (chaînes nues et objets stylés mêlés) : la forme est vérifiée
  // par les tests de `construireFeuilles`.
  await writeXlsxFile(construireFeuilles(options, maintenant) as any).toFile(
    nomFichierExport(options.nomFichier, maintenant)
  );
}
