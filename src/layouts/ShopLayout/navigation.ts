/* ──────────────────────────────────────────────────────────────────────────
   Structure de navigation de l'espace Boutique.

   Les treize entrées de l'ancienne liste plate sont toutes conservées, aux
   mêmes libellés et vers les mêmes routes ; elles sont seulement regroupées
   sous quatre rubriques pour que la barre latérale tienne sans défilement et
   que les sous-menus aient un sens. Aucune route n'est ajoutée ni retirée.

   Il n'y a volontairement aucun filtrage par rôle ici : l'accès au dashboard
   est déjà tranché en amont par `PrivateRoute` (seul le rôle ADMIN entre),
   et aucune entrée de menu n'était filtrée auparavant.
   ────────────────────────────────────────────────────────────────────────── */

/** Entrée qui mène directement à une page. */
export interface LienNav {
  label: string;
  /** Nom d'icône de `@/shared/components/dashboard/Icon`. */
  icon: string;
  path: string;
}

/** Entrée qui ouvre un sous-menu ; elle ne navigue pas elle-même. */
export interface GroupeNav {
  id: string;
  label: string;
  icon: string;
  enfants: LienNav[];
}

export type EntreeNav = LienNav | GroupeNav;

export const estGroupe = (entree: EntreeNav): entree is GroupeNav => 'enfants' in entree;

export const NAV: EntreeNav[] = [
  { label: 'Dashboard', icon: 'layout-dashboard', path: '/boutique/dashboard' },
  { label: "Page d'accueil", icon: 'layout-template', path: '/boutique/accueil' },
  {
    id: 'catalogue',
    label: 'Catalogue',
    icon: 'package',
    enfants: [
      { label: 'Rayons', icon: 'grid', path: '/boutique/rayons' },
      { label: 'Produits', icon: 'package', path: '/boutique/produits' },
      { label: 'Demandes', icon: 'clipboard-list', path: '/boutique/demandes' },
      { label: 'Avis', icon: 'star', path: '/boutique/avis' },
    ],
  },
  {
    id: 'ventes',
    label: 'Ventes',
    icon: 'shopping-cart',
    enfants: [
      { label: 'Commandes', icon: 'shopping-cart', path: '/boutique/commandes' },
      { label: 'Paiements', icon: 'credit-card', path: '/boutique/paiements' },
    ],
  },
  {
    id: 'utilisateurs',
    label: 'Utilisateurs',
    icon: 'users',
    enfants: [
      { label: 'Clients', icon: 'users', path: '/boutique/clients' },
      { label: 'Vendeurs', icon: 'store', path: '/boutique/vendeurs' },
      { label: 'Administrateurs', icon: 'shield', path: '/boutique/administrateurs' },
    ],
  },
  {
    id: 'espace',
    label: 'Mon espace',
    icon: 'settings',
    enfants: [
      { label: 'Profil', icon: 'user', path: '/boutique/profil' },
      { label: 'Paramètres', icon: 'settings', path: '/boutique/parametres' },
    ],
  },
];

/**
 * Une entrée est « active » quand l'URL courante est sa page ou l'une de ses
 * sous-pages (`/boutique/produits/12/modifier` garde « Produits » allumé).
 */
export const cheminActif = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

/** Le groupe dont une des pages est affichée. */
export const groupeActif = (pathname: string, groupe: GroupeNav) =>
  groupe.enfants.some((enfant) => cheminActif(pathname, enfant.path));
