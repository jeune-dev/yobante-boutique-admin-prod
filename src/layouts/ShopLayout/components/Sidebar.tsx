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
  /** Repliée : seules les icônes restent visibles. */
  replie: boolean;
  onBasculer: () => void;
}

export default function ShopSidebar({ replie, onBasculer }: Props) {
  return (
    // Fixée : elle ne défile pas avec le contenu. `shrink-0` empêche la barre
    // d'être compressée quand la zone de droite déborde.
    <aside
      className={`${
        replie ? 'w-[76px]' : 'w-64'
      } shrink-0 h-screen sticky top-0 bg-white border-r border-gray-100 flex flex-col transition-[width] duration-200`}
    >
      <div
        className={`h-16 flex items-center gap-2 border-b border-gray-100 ${
          replie ? 'justify-center px-2' : 'px-4'
        }`}
      >
        <img src={PICTO} alt="Yobante Boutique" className="h-9 w-auto shrink-0" />
        {!replie && (
          <span className="font-bold text-[15px] text-gray-900 leading-tight truncate">
            Yobante <span className="text-yellow-500">Boutique</span>
          </span>
        )}
        {/* Le bouton reste collé au logo, replié comme déplié. */}
        <button
          type="button"
          onClick={onBasculer}
          aria-label={replie ? 'Déplier le menu' : 'Replier le menu'}
          title={replie ? 'Déplier le menu' : 'Replier le menu'}
          className={`${
            replie ? 'hidden' : 'ml-auto'
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
          className="mx-auto mt-3 p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700"
        >
          <Icon name="chevrons-right" size={18} />
        </button>
      )}

      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            // `title` sert d'infobulle quand le libellé est masqué.
            title={replie ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 my-0.5 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                replie ? 'justify-center px-0' : 'px-4'
              } ${
                isActive
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon name={item.icon} size={18} />
            {!replie && item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
