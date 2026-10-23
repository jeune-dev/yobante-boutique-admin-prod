import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
import { cheminActif, type GroupeNav } from '../navigation';

/** Marge minimale conservée entre le panneau et les bords de la fenêtre. */
const MARGE = 12;
/** Écart horizontal entre la barre latérale et le panneau (zone de survol). */
const PONT = 8;

interface Props {
  groupe: GroupeNav;
  /** Rectangle du bouton parent, qui sert d'ancre au panneau. */
  ancre: DOMRect;
  pathname: string;
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
  ancre,
  pathname,
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
      style={{ top: pos.top, left: pos.left, paddingLeft: PONT, paddingTop: PONT, paddingBottom: PONT }}
      onMouseEnter={onEntrer}
      onMouseLeave={onSortir}
      onKeyDown={surTouche}
    >
      <div
        ref={refCarte}
        id={`sous-menu-${groupe.id}`}
        role="group"
        aria-labelledby={`sous-menu-titre-${groupe.id}`}
        className="nav-flyout min-w-[12rem] max-w-[16rem] overflow-y-auto rounded-xl border border-gray-100 bg-white p-1.5 shadow-lg shadow-gray-900/5"
        style={{ maxHeight: pos.maxHeight }}
      >
        <p
          id={`sous-menu-titre-${groupe.id}`}
          className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
        >
          {groupe.label}
        </p>
        <ul>
          {groupe.enfants.map((enfant) => {
            const actif = cheminActif(pathname, enfant.path);
            return (
              <li key={enfant.path}>
                <NavLink
                  to={enfant.path}
                  aria-current={actif ? 'page' : undefined}
                  onClick={() => onFermer(false)}
                  className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50 ${
                    actif
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon name={enfant.icon} size={16} />
                  {enfant.label}
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
