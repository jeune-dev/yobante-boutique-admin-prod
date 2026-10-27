import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { etatRetour } from '@/shared/hooks/useRetour';
import { useAuthStore } from '@/auth/store/auth.store';
import { useAuth } from '@/auth/hooks/useAuth';
import Icon from '@/shared/components/dashboard/Icon';
import { filAriane } from '../navigation';

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

  // Fil d'Ariane plutôt que titre seul : le titre est déjà en tête de page,
  // l'entête dit dans quelle partie de l'administration on se trouve.
  const section = pathname.split('/')[2] ?? '';
  const { groupe, page } = filAriane(pathname);
  const titre = page ?? TITRES_HORS_NAV[section] ?? 'Boutique';

  const initiales = `${user?.prenom?.[0] ?? ''}${user?.nom?.[0] ?? ''}`.toUpperCase();

  return (
    <header className="z-30 flex h-16 shrink-0 items-center gap-2 border-b border-gray-200/70 bg-white/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-white/75 sm:gap-3 sm:px-5 lg:px-8">
      {/* Sous `md`, la colonne de navigation devient un tiroir : ce bouton
          l'ouvre. Le logo vit dans la colonne, y compris dans le tiroir. */}
      <button
        type="button"
        onClick={onOuvrirMenu}
        aria-label="Ouvrir le menu"
        aria-controls="menu-principal"
        aria-expanded={tiroirOuvert}
        className="btn-icon -ml-1 shrink-0 text-gray-600 hover:bg-gray-100 md:hidden"
      >
        <Icon name="menu" size={22} />
      </button>

      <nav aria-label="Fil d'Ariane" className="flex min-w-0 flex-1 items-center">
        <ol className="flex min-w-0 items-center gap-1.5 text-sm">
          {groupe && (
            <>
              <li className="hidden shrink-0 text-gray-500 sm:block">{groupe}</li>
              <li aria-hidden="true" className="hidden shrink-0 text-gray-300 sm:block">
                <Icon name="chevron-right" size={14} />
              </li>
            </>
          )}
          <li className="truncate font-semibold text-gray-900" aria-current="page">
            {titre}
          </li>
        </ol>
      </nav>

      <div className="relative shrink-0 flex items-center" ref={zoneMenu}>
        <button
          type="button"
          onClick={() => setMenuOuvert((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOuvert}
          className={`flex items-center gap-2.5 rounded-full border py-1 pl-1 pr-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 sm:pr-3 ${
            menuOuvert ? 'border-gray-300 bg-gray-50' : 'border-gray-200 bg-white hover:bg-gray-50'
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-yellow-400">
            {initiales || <Icon name="user" size={15} />}
          </span>
          <span className="hidden max-w-[160px] truncate text-left lg:block">
            <span className="block text-sm font-medium leading-tight text-gray-900">
              {user?.prenom} {user?.nom}
            </span>
            <span className="block text-xs leading-tight text-gray-500">Administrateur</span>
          </span>
          <Icon
            name="chevron-right"
            size={14}
            className={`hidden shrink-0 text-gray-400 transition-transform sm:block ${menuOuvert ? '-rotate-90' : 'rotate-90'}`}
          />
        </button>

        {menuOuvert && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-64 animate-apparition-fenetre overflow-hidden rounded-xl border border-gray-200/80 bg-white p-1 shadow-flottant"
          >
            {/* Le nom est répété ici : sous `lg` il est masqué dans le bouton,
                et le menu serait alors le seul endroit qui dit qui est connecté. */}
            <div className="mb-1 flex items-center gap-3 border-b border-gray-100 px-3 pb-3 pt-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-yellow-400">
                {initiales || <Icon name="user" size={15} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-gray-900">
                  {user?.prenom} {user?.nom}
                </span>
                <span className="block truncate text-xs text-gray-500">{user?.email}</span>
              </span>
            </div>

            <Link
              to="/boutique/profil"
              role="menuitem"
              // Le bouton Retour du profil ramène à la page quittée.
              state={pathname === '/boutique/profil' ? location.state : etatRetour(location)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <Icon name="user" size={16} className="text-gray-400" />
              Mon profil
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
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
