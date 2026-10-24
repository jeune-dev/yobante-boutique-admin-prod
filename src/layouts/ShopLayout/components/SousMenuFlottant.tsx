import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
import { estActif, type EntreeNav } from '../navigation';

/** Marge minimale conservée entre le panneau et les bords de la fenêtre. */
const MARGE = 12;
/** Écart horizontal entre la barre latérale et le panneau (zone de survol). */
const PONT = 8;

interface Props {
  groupe: EntreeNav;
  /** Identifiant stable du groupe, pour `aria-controls`. */
  idGroupe: string;
  /** Rectangle du bouton parent, qui sert d'ancre au panneau. */
  ancre: DOMRect;
  pathname: string;
  search: string;
  /** Prendre le focus sur le premier lien (ouverture au clavier). */
  focusAuto: boolean;
  /** La souris revient sur le panneau : on annule la fermeture différée. */
  onEntrer: () => void;
  onSortir: () => void;
  /** Échap, Tab sortant, ou choix d'un lien. */
  onFermer: (rendreFocus: boolean) => void;
}

/**
 * Panneau flottant d'un sous-menu, rendu dans un portail pour échapper au
 * défilement et au `overflow` de la barre latérale.
 *
 * Positionnement : collé au bord droit de la barre, aligné sur son parent,
 * puis décalé vers le haut s'il dépasse en bas (shift) et basculé à gauche
 * s'il dépasse à droite (flip). Un liseré transparent de 8 px à gauche sert
 * de pont : la souris ne quitte jamais une zone survolée en passant du
 * parent au panneau.
 */
export default function SousMenuFlottant({
  groupe,
  idGroupe,
  ancre,
  pathname,
  search,
  focusAuto,
  onEntrer,
  onSortir,
  onFermer,
}: Props) {
  const refCarte = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight?: number }>(() => ({
    top: ancre.top - PONT,
    left: ancre.right,
  }));

  useLayoutEffect(() => {
    const carte = refCarte.current;
    if (!carte) return;

    const dispo = window.innerHeight - MARGE * 2;
    const hauteur = carte.offsetHeight;
    const largeur = carte.offsetWidth;

    let top = ancre.top - PONT;
    if (top + hauteur > window.innerHeight - MARGE) {
      top = window.innerHeight - MARGE - Math.min(hauteur, dispo);
    }
    if (top < MARGE) top = MARGE;

    let left = ancre.right;
    if (left + PONT + largeur > window.innerWidth - MARGE) {
      left = Math.max(MARGE, ancre.left - largeur - PONT * 2);
    }

    setPos({ top, left, maxHeight: hauteur > dispo ? dispo : undefined });
  }, [ancre]);

  // Ouverture au clavier : le focus part sur le premier lien du panneau.
  useLayoutEffect(() => {
    if (!focusAuto) return;
    refCarte.current?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [focusAuto]);

  // Flèches, Début/Fin : déplacement d'un lien à l'autre. Échap et Tab
  // referment le panneau, Échap en rendant le focus au bouton parent.
  const surTouche = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onFermer(true);
      return;
    }
    if (e.key === 'Tab') {
      onFermer(false);
      return;
    }
    const liens = Array.from(refCarte.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
    if (!liens.length) return;
    const index = liens.indexOf(document.activeElement as HTMLAnchorElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      liens[(index + 1) % liens.length].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      liens[(index - 1 + liens.length) % liens.length].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      liens[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      liens[liens.length - 1].focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onFermer(true);
    }
  };

  return createPortal(
    <div
      className="fixed z-50"
      style={{
        top: pos.top,
        left: pos.left,
        paddingLeft: PONT,
        paddingTop: PONT,
        paddingBottom: PONT,
      }}
      onMouseEnter={onEntrer}
      onMouseLeave={onSortir}
      onKeyDown={surTouche}
    >
      <div
        ref={refCarte}
        id={`sous-menu-${idGroupe}`}
        role="group"
        aria-labelledby={`sous-menu-titre-${idGroupe}`}
        className="nav-flyout w-[16.5rem] overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg shadow-gray-900/5"
        style={{ maxHeight: pos.maxHeight }}
      >
        <p
          id={`sous-menu-titre-${idGroupe}`}
          className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
        >
          {groupe.label}
        </p>
        <ul>
          {(groupe.enfants ?? []).map((enfant) => {
            const actif = estActif(enfant.path, pathname, search);
            return (
              <li key={enfant.path}>
                <NavLink
                  to={enfant.path}
                  aria-current={actif ? 'page' : undefined}
                  onClick={() => onFermer(false)}
                  className={`flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50 ${
                    actif ? 'bg-yellow-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <Icon
                    name={enfant.icon}
                    size={16}
                    className={`mt-0.5 shrink-0 ${actif ? 'text-yellow-600' : 'text-gray-400'}`}
                  />
                  {/* L'aide est conservée : c'est elle qui dit ce que la page
                      contient, le seul intitulé ne suffit pas toujours. */}
                  <span className="min-w-0">
                    <span
                      className={`block text-[14px] font-medium leading-snug ${
                        actif ? 'text-yellow-700' : 'text-gray-800'
                      }`}
                    >
                      {enfant.label}
                    </span>
                    {enfant.aide && (
                      <span className="block text-[12px] leading-tight text-gray-400">
                        {enfant.aide}
                      </span>
                    )}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </div>,
    document.body
  );
}
