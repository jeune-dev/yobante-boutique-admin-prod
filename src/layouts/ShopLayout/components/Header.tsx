import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/auth/store/auth.store';
import { useAuth } from '@/auth/hooks/useAuth';
import Icon from '@/shared/components/dashboard/Icon';

/** Libellés des sections, pour situer l'utilisateur dans le dashboard. */
const TITRES: Record<string, string> = {
  dashboard: 'Tableau de bord',
  accueil: "Page d'accueil",
  rayons: 'Rayons',
  produits: 'Produits',
  commandes: 'Commandes',
  clients: 'Clients',
  vendeurs: 'Vendeurs',
  demandes: 'Demandes de publication',
  avis: 'Avis',
  paiements: 'Paiements',
  profil: 'Mon profil',
  parametres: 'Paramètres',
};

interface Props {
  /** Ouvre le tiroir de navigation (écran étroit). */
  onOuvrirMenu: () => void;
}

export default function ShopHeader({ onOuvrirMenu }: Props) {
  const user = useAuthStore((s) => s.user);
  // `useAuth().logout` révoque le refresh token côté serveur avant de vider
  // la session locale ; le `logout` du store seul ne faisait que le second.
  const { logout } = useAuth();
  const { pathname } = useLocation();

  // /boutique/<section>/... → on ne garde que la section pour le titre.
  const section = pathname.split('/')[2] ?? 'dashboard';
  const titre = TITRES[section] ?? 'Boutique';

  const initiales = `${user?.prenom?.[0] ?? ''}${user?.nom?.[0] ?? ''}`.toUpperCase();

  return (
    <header className="h-16 shrink-0 bg-white border-b border-gray-100 flex items-center gap-2 sm:gap-3 px-3 sm:px-6">
      <button
        type="button"
        onClick={onOuvrirMenu}
        aria-label="Ouvrir le menu"
        aria-controls="menu-principal"
        className="btn-icon -ml-1 text-gray-500 hover:bg-gray-50 hover:text-gray-900 lg:hidden"
      >
        <Icon name="menu" size={22} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-[15px] font-bold text-gray-900 truncate">{titre}</h1>
        <p className="text-xs text-gray-400 truncate">Yobante Boutique</p>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        <Link
          to="/boutique/profil"
          className="flex items-center gap-2.5 p-1.5 sm:pl-2 sm:pr-3 rounded-lg hover:bg-gray-50 transition-colors"
          title="Mon profil"
          aria-label="Mon profil"
        >
          <span className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-700 text-xs font-bold flex items-center justify-center shrink-0">
            {initiales || <Icon name="user" size={15} />}
          </span>
          <span className="text-sm text-gray-700 hidden md:block max-w-[180px] truncate">
            {user?.prenom} {user?.nom}
          </span>
        </Link>

        <button
          onClick={logout}
          className="btn-icon text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="Déconnexion"
          aria-label="Déconnexion"
        >
          <Icon name="log-out" size={18} />
        </button>
      </div>
    </header>
  );
}
