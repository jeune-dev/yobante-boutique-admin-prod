import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
import { PICTO } from '@/assets/images/logos';
import { navPourAcces, estActif } from '../navigation';
import { useAuthStore } from '@/auth/store/auth.store';

/**
 * Navigation mobile : un tiroir listant **toutes** les pages, groupes dépliés.
 *
 * En dessous de `md`, la barre horizontale ne peut montrer que des icônes, ce
 * qui oblige à deviner ou à ouvrir un menu par groupe. Le tiroir affiche au
 * contraire l'arborescence complète d'un coup — intitulés et descriptions —
 * et évite ces deux frictions.
 */
export default function MenuMobile() {
  // Seules les pages autorisées de l'administrateur apparaissent.
  const permissions = useAuthStore((s) => s.user?.permissions);
  const NAV = useMemo(() => navPourAcces(permissions), [permissions]);
  const { pathname, search } = useLocation();
  const [ouvert, setOuvert] = useState(false);

  // Se referme à chaque navigation, sinon il recouvrirait l'écran d'arrivée.
  useEffect(() => setOuvert(false), [pathname]);

  useEffect(() => {
    if (!ouvert) return;
    const auClavier = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    document.addEventListener('keydown', auClavier);
    // Le fond ne défile pas sous le tiroir : sans ce verrou, faire glisser le
    // doigt dans le tiroir entraîne la page derrière lui.
    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', auClavier);
      document.body.style.overflow = overflowInitial;
    };
  }, [ouvert]);

  const classesLien = (actif: boolean) =>
    `flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
      actif ? 'bg-yellow-50' : 'hover:bg-gray-50 active:bg-gray-100'
    }`;

  const contenuLien = (
    item: { label: string; icon: string; aide?: string },
    actif: boolean
  ) => (
    <>
      <Icon
        name={item.icon}
        size={18}
        className={`mt-0.5 shrink-0 ${actif ? 'text-yellow-600' : 'text-gray-400'}`}
      />
      <span className="min-w-0">
        <span
          className={`block text-sm font-medium ${actif ? 'text-yellow-700' : 'text-gray-800'}`}
        >
          {item.label}
        </span>
        {item.aide && (
          <span className="block text-xs text-gray-400 leading-tight">{item.aide}</span>
        )}
      </span>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-label="Ouvrir le menu"
        aria-controls="menu-mobile"
        aria-expanded={ouvert}
        className="md:hidden flex items-center justify-center w-10 shrink-0 -ml-1 rounded-lg text-gray-600 hover:bg-gray-50"
      >
        <Icon name="menu" size={22} />
      </button>

      {ouvert &&
        createPortal(
          <div className="md:hidden fixed inset-0 z-[60]">
            <div
              className="absolute inset-0 bg-gray-900/50"
              onClick={() => setOuvert(false)}
              aria-hidden="true"
            />

            <div
              id="menu-mobile"
              role="dialog"
              aria-modal="true"
              aria-label="Menu principal"
              className="absolute inset-y-0 left-0 w-[86vw] max-w-sm bg-white shadow-2xl flex flex-col"
            >
              <div className="h-16 shrink-0 flex items-center gap-2.5 px-4 border-b border-gray-100">
                <img src={PICTO} alt="" aria-hidden="true" className="h-9 w-auto" />
                <span className="font-bold text-[15px] text-gray-900 leading-tight">
                  Yobante <span className="text-yellow-500">Boutique</span>
                </span>
                <button
                  type="button"
                  onClick={() => setOuvert(false)}
                  aria-label="Fermer le menu"
                  className="ml-auto p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto overscroll-contain p-2">
                {NAV.map((entree) =>
                  entree.path ? (
                    <NavLink
                      key={entree.label}
                      to={entree.path}
                      className={classesLien(estActif(entree.path, pathname, search))}
                    >
                      {contenuLien(entree, estActif(entree.path, pathname, search))}
                    </NavLink>
                  ) : (
                    // Les groupes sont dépliés d'emblée : replier obligerait à
                    // un clic de plus pour voir ce que le tiroir est censé
                    // montrer d'un coup.
                    <div key={entree.label} className="mt-2 first:mt-0">
                      <p className="flex items-center gap-2 px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        <Icon name={entree.icon} size={13} />
                        {entree.label}
                      </p>
                      {(entree.enfants ?? []).map((enfant) => (
                        <NavLink
                          key={enfant.path}
                          to={enfant.path}
                          className={classesLien(estActif(enfant.path, pathname, search))}
                        >
                          {contenuLien(enfant, estActif(enfant.path, pathname, search))}
                        </NavLink>
                      ))}
                    </div>
                  )
                )}
              </nav>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
