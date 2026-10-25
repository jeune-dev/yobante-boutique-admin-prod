import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { etatRetour } from '@/shared/hooks/useRetour';
import { useAuthStore } from '@/auth/store/auth.store';
import { useAuth } from '@/auth/hooks/useAuth';
import Icon from '@/shared/components/dashboard/Icon';
import { libelleDuChemin } from '../navigation';

/** Libellés des sections qui ne figurent pas dans la navigation. */
const TITRES_HORS_NAV: Record<string, string> = {
  profil: 'Mon profil',
};

interface Props {
  /** Ouvre le tiroir de navigation (sous `md`). */
  onOuvrirMenu: () => void;
  tiroirOuvert: boolean;
}

export default function ShopHeader({ onOuvrirMenu, tiroirOuvert }: Props) {
  const user = useAuthStore((s) => s.user);
  // `useAuth().logout` révoque le refresh token côté serveur avant de vider
  // la session locale ; le `logout` du store seul ne faisait que le second.
  const { logout } = useAuth();
  const location = useLocation();
  const { pathname } = location;

  // Menu de compte : profil et déconnexion n'encombrent plus la navigation
  // principale, qui ne porte que les sections de travail.
  const [menuOuvert, setMenuOuvert] = useState(false);
  const zoneMenu = useRef<HTMLDivElement>(null);

  // Le menu se referme en changeant de page, sinon il resterait ouvert
  // par-dessus l'écran suivant.
  useEffect(() => setMenuOuvert(false), [pathname]);

  useEffect(() => {
    if (!menuOuvert) return;
    const auClic = (e: MouseEvent) => {
      if (!zoneMenu.current?.contains(e.target as Node)) setMenuOuvert(false);
    };
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOuvert(false);
    };
    document.addEventListener('mousedown', auClic);
    document.addEventListener('keydown', auClavier);
    return () => {
      document.removeEventListener('mousedown', auClic);
      document.removeEventListener('keydown', auClavier);
    };
  }, [menuOuvert]);

  // La navigation est passée en colonne à gauche : l'entête n'a plus
  // d'onglets, le titre de la page y est donc affiché en permanence.
  const section = pathname.split('/')[2] ?? '';
  const libelleNav = libelleDuChemin(pathname);
  const titre = libelleNav ?? TITRES_HORS_NAV[section] ?? 'Boutique';

  const initiales = `${user?.prenom?.[0] ?? ''}${user?.nom?.[0] ?? ''}`.toUpperCase();

  return (
    <header className="h-16 xl:h-[4.5rem] shrink-0 bg-white border-b border-gray-100 flex items-center gap-1.5 sm:gap-3 lg:gap-4 px-2.5 sm:px-4 lg:px-5">
      {/* Sous `md`, la colonne de navigation devient un tiroir : ce bouton
          l'ouvre. Le logo vit dans la colonne, y compris dans le tiroir. */}
      <button
        type="button"
        onClick={onOuvrirMenu}
        aria-label="Ouvrir le menu"
        aria-controls="menu-principal"
        aria-expanded={tiroirOuvert}
        className="md:hidden flex items-center justify-center w-10 shrink-0 -ml-1 rounded-lg text-gray-600 hover:bg-gray-50"
      >
        <Icon name="menu" size={22} />
      </button>

      <div className="flex min-w-0 flex-1 items-center">
        <h1 className="text-lg font-bold text-gray-900 truncate">{titre}</h1>
      </div>

      <div className="relative shrink-0 flex items-center" ref={zoneMenu}>
        <button
          type="button"
          onClick={() => setMenuOuvert((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOuvert}
          className={`flex items-center gap-2 p-1.5 sm:pr-2.5 rounded-lg transition-colors ${
            menuOuvert ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <span className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-700 text-xs font-bold flex items-center justify-center shrink-0">
            {initiales || <Icon name="user" size={15} />}
          </span>
          <span className="text-sm text-gray-700 hidden lg:block max-w-[140px] truncate">
            {user?.prenom} {user?.nom}
          </span>
          <Icon name="chevron-right" size={14} className="text-gray-400 rotate-90 shrink-0" />
        </button>

        {menuOuvert && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden z-50"
          >
            {/* Le nom est répété ici : sous `lg` il est masqué dans le bouton,
                et le menu serait alors le seul endroit qui dit qui est connecté. */}
            <div className="px-3.5 py-3 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>

            <Link
              to="/boutique/profil"
              role="menuitem"
              // Le bouton Retour du profil ramène à la page quittée.
              state={pathname === '/boutique/profil' ? location.state : etatRetour(location)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Icon name="user" size={16} className="text-gray-400" />
              Mon profil
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-gray-50"
            >
              <Icon name="log-out" size={16} />
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
