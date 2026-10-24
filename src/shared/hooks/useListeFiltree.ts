import { useQuery, useQueryClient } from '@tanstack/react-query';

/** Une page de résultats, ramenée à une forme commune quelle que soit la route. */
export interface PageChargee<T> {
  lignes: T[];
  totalPages: number;
  total?: number;
}

export type ChargerPage<T> = (page: number, limit: number) => Promise<PageChargee<T>>;

/** Au-delà, l'export est tronqué (et l'administrateur prévenu). */
export const LIMITE_LIGNES = 10_000;
const TAILLE_LOT = 100;
const PAGES_EN_PARALLELE = 4;

export interface ToutesLesLignes<T> {
  lignes: T[];
  /** Vrai si la limite a interrompu le chargement avant la dernière page. */
  tronque: boolean;
}

/**
 * Charge toutes les pages d'une liste, par lots parallèles.
 *
 * Les doublons (une ligne décalée d'une page à l'autre pendant le chargement)
 * sont écartés par identifiant.
 */
export async function chargerToutesLesPages<T>(
  chargerPage: ChargerPage<T>,
  limite = LIMITE_LIGNES
): Promise<ToutesLesLignes<T>> {
  const premiere = await chargerPage(1, TAILLE_LOT);
  const totalPages = Math.max(1, premiere.totalPages || 1);
  const lignes = [...premiere.lignes];

  let page = 2;
  while (page <= totalPages && lignes.length < limite) {
    const numeros = Array.from(
      { length: Math.min(PAGES_EN_PARALLELE, totalPages - page + 1) },
      (_, i) => page + i
    );
    const lot = await Promise.all(numeros.map((n) => chargerPage(n, TAILLE_LOT)));
    lot.forEach((r) => lignes.push(...r.lignes));
    page += numeros.length;
  }

  const vus = new Set<unknown>();
  const uniques = lignes.filter((l: any) => {
    const id = l?.id;
    if (id === undefined) return true;
    if (vus.has(id)) return false;
    vus.add(id);
    return true;
  });

  return {
    lignes: uniques.slice(0, limite),
    tronque: page <= totalPages || uniques.length > limite,
  };
}

interface Options<T> {
  /**
   * Clé de cache, préfixe compris (ex. `['commandes', { search, statut }]`) :
   * les invalidations existantes sur le préfixe rafraîchissent aussi la liste.
   */
  cle: readonly unknown[];
  chargerPage: ChargerPage<T>;
  page: number;
  parPage: number;
  /** Filtres que le backend ne connaît pas, appliqués dans le navigateur. */
  filtreLocal?: (ligne: T) => boolean;
  /** Au moins un filtre local est renseigné. */
  filtresLocauxActifs: boolean;
}

/**
 * Liste paginée dotée de filtres avancés et d'un export.
 *
 * - Sans filtre avancé : pagination serveur, comme avant.
 * - Avec un filtre avancé : toutes les lignes répondant aux filtres serveur
 *   sont chargées, filtrées ici puis paginées ici. Le compte et les pages
 *   affichés correspondent alors exactement au filtre, même si la route ne
 *   connaît pas le critère.
 * - `chargerPourExport` renvoie toujours la totalité des lignes filtrées
 *   (pas seulement la page affichée).
 */
export function useListeFiltree<T>({
  cle,
  chargerPage,
  page,
  parPage,
  filtreLocal,
  filtresLocauxActifs,
}: Options<T>) {
  const qc = useQueryClient();
  const cleTout = [...cle, 'tout'];
  const chargerTout = () => chargerToutesLesPages(chargerPage);

  const pagine = useQuery({
    queryKey: [...cle, 'page', page, parPage],
    queryFn: () => chargerPage(page, parPage),
    enabled: !filtresLocauxActifs,
  });

  const complet = useQuery({
    queryKey: cleTout,
    queryFn: chargerTout,
    enabled: filtresLocauxActifs,
    staleTime: 30_000,
  });

  const filtrer = (lignes: T[]) => (filtreLocal ? lignes.filter(filtreLocal) : lignes);

  let lignes: T[];
  let total: number;
  let totalPages: number;
  if (filtresLocauxActifs) {
    const filtrees = filtrer(complet.data?.lignes ?? []);
    total = filtrees.length;
    totalPages = Math.max(1, Math.ceil(total / parPage));
    lignes = filtrees.slice((page - 1) * parPage, page * parPage);
  } else {
    lignes = pagine.data?.lignes ?? [];
    total = pagine.data?.total ?? lignes.length;
    totalPages = pagine.data?.totalPages ?? 1;
  }

  const requete = filtresLocauxActifs ? complet : pagine;

  /** Toutes les lignes répondant aux filtres (serveur + locaux), pour l'export. */
  const chargerPourExport = async (): Promise<ToutesLesLignes<T>> => {
    const r = await qc.fetchQuery({ queryKey: cleTout, queryFn: chargerTout, staleTime: 30_000 });
    return { lignes: filtrer(r.lignes), tronque: r.tronque };
  };

  return {
    lignes,
    total,
    totalPages,
    isLoading: requete.isLoading,
    isError: requete.isError,
    error: requete.error,
    refetch: requete.refetch,
    /** Le chargement complet a atteint la limite : résultats partiels. */
    tronque: filtresLocauxActifs && !!complet.data?.tronque,
    chargerPourExport,
  };
}
