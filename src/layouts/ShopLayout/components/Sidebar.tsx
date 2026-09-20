import { NavLink } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
import { PICTO } from '@/assets/images/logos';

const NAV = [
  { label: 'Dashboard', icon: 'layout-dashboard', path: '/boutique/dashboard' },
  { label: "Page d'accueil", icon: 'layout-template', path: '/boutique/accueil' },
  { label: 'Rayons', icon: 'grid', path: '/boutique/rayons' },
  { label: 'Produits', icon: 'package', path: '/boutique/produits' },
  { label: 'Commandes', icon: 'shopping-cart', path: '/boutique/commandes' },
  { label: 'Clients', icon: 'users', path: '/boutique/clients' },
  { label: 'Vendeurs', icon: 'store', path: '/boutique/vendeurs' },
  { label: 'Demandes', icon: 'clipboard-list', path: '/boutique/demandes' },
  { label: 'Avis', icon: 'star', path: '/boutique/avis' },
  { label: 'Paiements', icon: 'credit-card', path: '/boutique/paiements' },
  { label: 'Profil', icon: 'user', path: '/boutique/profil' },
  { label: 'Paramètres', icon: 'settings', path: '/boutique/parametres' },
];

interface Props {
  /** Repliée (écran large) : seules les icônes restent visibles. */
  replie: boolean;
  onBasculer: () => void;
  /** Tiroir ouvert (écran étroit) : la barre glisse par-dessus le contenu. */
  tiroirOuvert: boolean;
  onFermerTiroir: () => void;
}

/**
 * Barre latérale du dashboard boutique.
 *
 * Deux comportements selon la largeur d'écran :
 *  - ≥ lg : colonne fixe, repliable en bandeau d'icônes ;
 *  - < lg : tiroir hors écran, ouvert par le bouton du header, avec un voile
 *    sur le contenu ; il se referme au choix d'un menu, au clic sur le voile
 *    ou avec Échap. Sur écran étroit, le tiroir est toujours déplié.
 */
export default function ShopSidebar({ replie, onBasculer, tiroirOuvert, onFermerTiroir }: Props) {
  return (
    <>
      {/* Voile derrière le tiroir (écran étroit uniquement). */}
      {tiroirOuvert && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/50 lg:hidden"
          onClick={onFermerTiroir}
          aria-hidden="true"
        />
      )}

      <aside
        id="menu-principal"
        className={`
          fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw]
          lg:static lg:z-auto lg:max-w-none ${replie ? 'lg:w-[76px]' : 'lg:w-64'}
          shrink-0 h-screen bg-white border-r border-gray-100 flex flex-col
          transition-[transform,width] duration-200
          ${tiroirOuvert ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} lg:translate-x-0 lg:shadow-none
        `}
        aria-label="Menu principal"
      >
        <div
          className={`h-16 flex items-center gap-2 border-b border-gray-100 px-4 ${
            replie ? 'lg:justify-center lg:px-2' : ''
          }`}
        >
          <img src={PICTO} alt="Yobante Boutique" className="h-9 w-auto shrink-0" />
          <span
            className={`font-bold text-[15px] text-gray-900 leading-tight truncate ${
              replie ? 'lg:hidden' : ''
            }`}
          >
            Yobante <span className="text-yellow-500">Boutique</span>
          </span>

          {/* Écran étroit : fermeture du tiroir. */}
          <button
            type="button"
            onClick={onFermerTiroir}
            aria-label="Fermer le menu"
            className="btn-icon ml-auto text-gray-400 hover:bg-gray-50 hover:text-gray-700 lg:hidden"
          >
            <Icon name="x" size={18} />
          </button>

          {/* Écran large : repli en bandeau d'icônes. Le bouton reste collé au
              logo, replié comme déplié. */}
          <button
            type="button"
            onClick={onBasculer}
            aria-label={replie ? 'Déplier le menu' : 'Replier le menu'}
            title={replie ? 'Déplier le menu' : 'Replier le menu'}
            className={`hidden ${
              replie ? '' : 'lg:inline-flex ml-auto'
            } p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700 shrink-0`}
          >
            <Icon name="chevrons-left" size={18} />
          </button>
        </div>

        {replie && (
          <button
            type="button"
            onClick={onBasculer}
            aria-label="Déplier le menu"
            title="Déplier le menu"
            className="hidden lg:block mx-auto mt-3 p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700"
          >
            <Icon name="chevrons-right" size={18} />
          </button>
        )}

        <nav className="flex-1 py-3 overflow-y-auto overscroll-contain">
          {NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              // `title` sert d'infobulle quand le libellé est masqué.
              title={replie ? item.label : undefined}
              onClick={onFermerTiroir}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 my-0.5 rounded-lg py-2.5 text-sm font-medium transition-colors px-4 ${
                  replie ? 'lg:justify-center lg:px-0' : ''
                } ${
                  isActive
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon name={item.icon} size={18} />
              <span className={replie ? 'lg:hidden' : ''}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
