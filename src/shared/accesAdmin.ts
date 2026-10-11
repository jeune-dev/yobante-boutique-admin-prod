/**
 * Accès d'un administrateur, page par page.
 *
 * `permissions` vaut null (accès complet) ou la liste des clés ci-dessous.
 * Les clés doivent rester identiques à celles du backend
 * (yobante-boutique-back/src/constants/accesAdmin.js), qui applique les mêmes
 * restrictions sur l'API.
 */
export interface PageAdmin {
  cle: string;
  libelle: string;
  groupe: string;
  /** Préfixes d'URL couverts par cette page. */
  chemins: string[];
}

export const PAGES_ADMIN: PageAdmin[] = [
  { cle: 'dashboard', libelle: 'Dashboard', groupe: 'Général', chemins: ['/boutique/dashboard'] },
  { cle: 'alertes', libelle: 'À surveiller', groupe: 'Général', chemins: ['/boutique/alertes'] },
  { cle: 'produits', libelle: 'Produits', groupe: 'Commerce', chemins: ['/boutique/produits'] },
  { cle: 'rayons', libelle: 'Rayons', groupe: 'Commerce', chemins: ['/boutique/rayons'] },
  { cle: 'commandes', libelle: 'Commandes', groupe: 'Commerce', chemins: ['/boutique/commandes'] },
  {
    cle: 'accueil',
    libelle: "Promotions et page d'accueil",
    groupe: 'Commerce',
    chemins: ['/boutique/accueil'],
  },
  { cle: 'demandes', libelle: 'Demandes de publication', groupe: 'Commerce', chemins: ['/boutique/demandes'] },
  { cle: 'stock', libelle: 'Stock', groupe: 'Stock', chemins: ['/boutique/stock'] },
  { cle: 'vendeurs', libelle: 'Vendeurs', groupe: 'Marketplace', chemins: ['/boutique/vendeurs'] },
  {
    cle: 'commissions',
    libelle: 'Commissions',
    groupe: 'Marketplace',
    chemins: ['/boutique/finance/commissions'],
  },
  {
    cle: 'reversements',
    libelle: 'Reversements',
    groupe: 'Marketplace',
    chemins: ['/boutique/finance/reversements'],
  },
  { cle: 'clients', libelle: 'Clients', groupe: 'Clients', chemins: ['/boutique/clients'] },
  { cle: 'reclamations', libelle: 'Réclamations', groupe: 'Clients', chemins: ['/boutique/reclamations'] },
  { cle: 'livraison', libelle: 'Livraison', groupe: 'Logistique', chemins: ['/boutique/livraison'] },
  { cle: 'retours', libelle: 'Retours', groupe: 'Logistique', chemins: ['/boutique/retours'] },
  { cle: 'finance', libelle: 'Synthèse financière', groupe: 'Finance', chemins: ['/boutique/finance'] },
  { cle: 'paiements', libelle: 'Paiements', groupe: 'Finance', chemins: ['/boutique/paiements'] },
  { cle: 'analytics', libelle: 'Analytics (toutes les analyses)', groupe: 'Analytics', chemins: ['/boutique/analytics'] },
  {
    cle: 'administrateurs',
    libelle: 'Administrateurs',
    groupe: 'Administration',
    chemins: ['/boutique/administrateurs'],
  },
  { cle: 'parametres', libelle: 'Paramètres', groupe: 'Administration', chemins: ['/boutique/parametres'] },
];

/** Toujours accessibles, quels que soient les accès (compte personnel). */
const TOUJOURS = ['/boutique/profil'];

export const accesComplet = (permissions?: string[] | null) => !Array.isArray(permissions);

/** Page (clé) couvrant ce chemin : le préfixe le plus long l'emporte. */
export function cleDuChemin(pathname: string): string | null {
  const chemin = pathname.split('?')[0];
  let meilleure: { cle: string; long: number } | null = null;
  for (const page of PAGES_ADMIN) {
    for (const c of page.chemins) {
      if ((chemin === c || chemin.startsWith(`${c}/`)) && (!meilleure || c.length > meilleure.long)) {
        meilleure = { cle: page.cle, long: c.length };
      }
    }
  }
  return meilleure?.cle ?? null;
}

/** L'administrateur peut-il ouvrir ce chemin ? */
export function peutOuvrir(permissions: string[] | null | undefined, chemin: string): boolean {
  if (accesComplet(permissions)) return true;
  const sansRequete = chemin.split('?')[0];
  if (TOUJOURS.some((t) => sansRequete === t || sansRequete.startsWith(`${t}/`))) return true;
  const cle = cleDuChemin(sansRequete);
  return cle !== null && (permissions as string[]).includes(cle);
}

/** Première page autorisée, pour rediriger un administrateur restreint. */
export function premierCheminAutorise(permissions: string[] | null | undefined): string {
  if (accesComplet(permissions)) return '/boutique/dashboard';
  const page = PAGES_ADMIN.find((p) => (permissions as string[]).includes(p.cle));
  return page ? page.chemins[0] : '/boutique/profil';
}

/** Libellés des pages d'une liste, dans l'ordre du catalogue. */
export const libellesPages = (permissions: string[]) =>
  PAGES_ADMIN.filter((p) => permissions.includes(p.cle)).map((p) => p.libelle);
