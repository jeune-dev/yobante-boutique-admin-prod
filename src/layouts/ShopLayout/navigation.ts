export interface EntreeNav {
  label: string;
  icon: string;
  /** Feuille : une destination. Absent sur un groupe. */
  path?: string;
  /** Groupe : ses sous-pages, dépliées au clic. */
  enfants?: Array<{ label: string; icon: string; path: string; aide?: string }>;
}

/**
 * Sections de la navigation principale.
 *
 * Le découpage suit celui du cahier des charges — Commerce, Stock,
 * Marketplace, Clients, Logistique, Finance, Analytics — parce que c'est
 * ainsi que la boutique raisonne : on cherche une commission dans Finance,
 * pas dans Utilisateurs.
 *
 * « À surveiller » est une feuille de premier niveau et non une sous-page :
 * c'est l'écran qu'on ouvre en arrivant le matin, il ne doit pas demander
 * deux clics.
 *
 * Dans son propre module plutôt que dans `Navbar.tsx` : un fichier qui exporte
 * à la fois un composant et une constante désactive le Fast Refresh de Vite,
 * et l'entête a besoin de cette liste pour savoir si la page courante y figure.
 *
 * Profil et déconnexion n'y sont pas : ils vivent dans le menu de compte.
 */
export const NAV: EntreeNav[] = [
  { label: 'Dashboard', icon: 'layout-dashboard', path: '/boutique/dashboard' },
  { label: 'À surveiller', icon: 'siren', path: '/boutique/alertes' },
  {
    label: 'Commerce',
    icon: 'package',
    enfants: [
      {
        label: 'Produits',
        icon: 'package',
        path: '/boutique/produits',
        aide: 'Fiches, prix, stocks et marges',
      },
      {
        label: 'Rayons',
        icon: 'grid',
        path: '/boutique/rayons',
        aide: 'Rangement du catalogue',
      },
      {
        label: 'Commandes',
        icon: 'shopping-cart',
        path: '/boutique/commandes',
        aide: 'Suivi, modification et annulation',
      },
      {
        label: 'Promotions',
        icon: 'tag',
        path: '/boutique/accueil',
        aide: "Promotions et mises en avant de la page d'accueil",
      },
      {
        label: 'Demandes',
        icon: 'clipboard-list',
        path: '/boutique/demandes',
        aide: 'Publications soumises par les vendeurs',
      },
    ],
  },
  {
    label: 'Stock',
    icon: 'boxes',
    enfants: [
      {
        label: 'Stocks',
        icon: 'boxes',
        path: '/boutique/stock',
        aide: 'Couverture, rotation et valeur du stock',
      },
      {
        label: 'Ruptures',
        icon: 'alert-triangle',
        path: '/boutique/stock?vue=rupture',
        aide: 'Produits à zéro et sous le seuil de ventes',
      },
    ],
  },
  {
    label: 'Marketplace',
    icon: 'store',
    enfants: [
      {
        label: 'Vendeurs',
        icon: 'store',
        path: '/boutique/vendeurs',
        aide: 'Comptes, boutiques et fiabilité',
      },
      {
        label: 'Score vendeurs',
        icon: 'activity',
        path: '/boutique/analytics/vendeurs',
        aide: 'CA, taux, note et commission par vendeur',
      },
      {
        label: 'Commissions',
        icon: 'percent',
        path: '/boutique/finance/commissions',
        aide: 'Taux négociés et montants dus',
      },
      {
        label: 'Reversements',
        icon: 'banknote',
        path: '/boutique/finance/reversements',
        aide: 'Versements effectués et en attente',
      },
    ],
  },
  {
    label: 'Clients',
    icon: 'users',
    enfants: [
      {
        label: 'Clients',
        icon: 'users',
        path: '/boutique/clients',
        aide: 'Comptes, activité et historique de commandes',
      },
      {
        label: 'Indicateurs clients',
        icon: 'trending-up',
        path: '/boutique/analytics/clients',
        aide: 'Conversion, réachat et churn',
      },
      {
        label: 'Réclamations',
        icon: 'flag',
        path: '/boutique/reclamations',
        aide: 'Signalements envoyés depuis l’application',
      },
    ],
  },
  {
    label: 'Logistique',
    icon: 'truck',
    enfants: [
      {
        label: 'Livraison',
        icon: 'truck',
        path: '/boutique/livraison',
        aide: 'Charge du jour, retards et performance',
      },
      {
        label: 'Retours',
        icon: 'refresh-cw',
        path: '/boutique/retours',
        aide: 'Taux, motifs et remboursements',
      },
    ],
  },
  {
    label: 'Finance',
    icon: 'wallet',
    enfants: [
      {
        label: 'Synthèse',
        icon: 'wallet',
        path: '/boutique/finance',
        aide: 'CA, commissions et revenu de la plateforme',
      },
      {
        label: 'Rentabilité',
        icon: 'pie-chart',
        path: '/boutique/analytics/rentabilite',
        aide: 'Partage du chiffre d’affaires et marges',
      },
      {
        label: 'Paiements',
        icon: 'credit-card',
        path: '/boutique/paiements',
        aide: 'Transactions clients et statuts',
      },
    ],
  },
  {
    label: 'Analytics',
    icon: 'bar-chart',
    enfants: [
      {
        label: 'Ventes',
        icon: 'bar-chart',
        path: '/boutique/analytics/ventes',
        aide: 'CA, marge et répartition par rayon',
      },
      {
        label: 'Produits',
        icon: 'package',
        path: '/boutique/analytics/produits',
        aide: 'Meilleures ventes par rayon et par origine',
      },
      {
        label: 'Clients',
        icon: 'users',
        path: '/boutique/analytics/clients',
        aide: 'Acquisition, conversion et fidélité',
      },
      {
        label: 'Vendeurs',
        icon: 'store',
        path: '/boutique/analytics/vendeurs',
        aide: 'Tableau de bord des vendeurs marketplace',
      },
      {
        label: 'Rentabilité',
        icon: 'pie-chart',
        path: '/boutique/analytics/rentabilite',
        aide: 'Marge plateforme et part vendeurs',
      },
    ],
  },
  {
    label: 'Administration',
    icon: 'shield',
    enfants: [
      {
        label: 'Administrateurs',
        icon: 'shield',
        path: '/boutique/administrateurs',
        aide: 'Accès au dashboard',
      },
      {
        label: "Page d'accueil",
        icon: 'layout-template',
        path: '/boutique/accueil',
        aide: "Bannières, sections et promotions de l'application",
      },
      {
        label: 'Paramètres',
        icon: 'settings',
        path: '/boutique/parametres',
        aide: 'Frais de livraison et réglages',
      },
    ],
  },
];

/**
 * L'entrée de navigation `cible` désigne-t-elle l'emplacement courant ?
 *
 * Certaines entrées portent un paramètre de requête — « Ruptures » pointe sur
 * `/boutique/stock?vue=rupture`, qui est une vue de la page Stock et non une
 * page à part. Une comparaison sur `pathname` seul ne les distinguerait
 * jamais : `pathname` ne contient pas la requête, et « Ruptures » ne
 * s'allumerait donc jamais tandis que « Stocks » resterait allumé même en
 * consultant les ruptures.
 *
 * Règle : le chemin doit correspondre, et si la cible impose des paramètres,
 * chacun doit être présent avec la même valeur dans l'URL courante.
 */
export function estActif(cible: string, pathname: string, search = ''): boolean {
  const [cheminCible, requeteCible = ''] = cible.split('?');

  const cheminCorrespond = pathname === cheminCible || pathname.startsWith(`${cheminCible}/`);
  if (!cheminCorrespond) return false;
  if (!requeteCible) {
    // Une entrée sans paramètre ne s'allume pas sur une vue filtrée : sinon
    // « Stocks » et « Ruptures » seraient actives en même temps.
    const attendus = new Set(
      (NAV.flatMap((e) => e.enfants ?? [])
        .map((c) => c.path)
        .filter((p) => p.split('?')[0] === cheminCible && p.includes('?'))
        .map((p) => p.split('?')[1].split('=')[0]))
    );
    const courants = new URLSearchParams(search);
    return ![...attendus].some((cle) => courants.has(cle));
  }

  const courants = new URLSearchParams(search);
  return [...new URLSearchParams(requeteCible)].every(([cle, val]) => courants.get(cle) === val);
}

/**
 * Libellé de la page correspondant à un chemin, groupes aplatis.
 *
 * Sert au titre de l'entête : sur mobile la barre horizontale est remplacée
 * par le tiroir, plus aucun onglet actif n'indique donc où l'on se trouve.
 *
 * Les chemins les plus longs sont essayés d'abord : sans cela
 * `/boutique/finance/reversements` serait étiqueté « Synthèse », qui vit sur
 * `/boutique/finance` et correspond aussi par préfixe. Les paramètres de
 * requête sont ignorés — `?vue=rupture` ne change pas la page.
 */
export function libelleDuChemin(pathname: string): string | null {
  const chemin = pathname.split('?')[0];

  const feuilles: Array<{ path: string; label: string }> = [];
  for (const entree of NAV) {
    if (entree.path) feuilles.push({ path: entree.path, label: entree.label });
    for (const enfant of entree.enfants ?? []) {
      feuilles.push({ path: enfant.path.split('?')[0], label: enfant.label });
    }
  }

  const correspondance = feuilles
    .filter((f) => chemin === f.path || chemin.startsWith(`${f.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];

  return correspondance?.label ?? null;
}
