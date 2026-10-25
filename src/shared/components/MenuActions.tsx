import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/shared/components/dashboard/Icon';

export interface ActionMenu {
  libelle: string;
  icone?: string;
  onClick: () => void;
  /** Action destructrice : affichée en rouge, séparée des autres. */
  danger?: boolean;
}

/**
 * Bouton « ⋯ » qui regroupe les actions secondaires d'une ligne de tableau.
 *
 * Sept icônes alignées faisaient déborder les tableaux et se lisaient mal :
 * on garde les actions courantes visibles et on range les autres ici. Le
 * menu est rendu dans `document.body`, en position fixe : dans le conteneur
 * `.tbl-wrap` (défilement horizontal), un menu absolu serait rogné.
 */
export default function MenuActions({
  actions,
  libelle = "Plus d'actions",
}: {
  actions: ActionMenu[];
  libelle?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ouvert || !bouton.current) return;
    const r = bouton.current.getBoundingClientRect();
    const hauteur = menu.current?.offsetHeight ?? 0;
    // Pas assez de place sous le bouton : le menu s'ouvre au-dessus.
    const enHaut = r.bottom + hauteur + 8 > window.innerHeight;
    setPosition({
      top: enHaut ? Math.max(8, r.top - hauteur - 4) : r.bottom + 4,
      right: Math.max(8, window.innerWidth - r.right),
    });
  }, [ouvert]);

  useEffect(() => {
    if (!ouvert) return;
    const fermer = () => setOuvert(false);
    const auClic = (e: MouseEvent) => {
      const cible = e.target as Node;
      if (!menu.current?.contains(cible) && !bouton.current?.contains(cible)) fermer();
    };
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        fermer();
        bouton.current?.focus();
      }
    };
    document.addEventListener('mousedown', auClic);
    document.addEventListener('keydown', auClavier);
    // Le menu est fixe : il se refermerait décalé si la page défilait dessous.
    window.addEventListener('scroll', fermer, true);
    window.addEventListener('resize', fermer);
    return () => {
      document.removeEventListener('mousedown', auClic);
      document.removeEventListener('keydown', auClavier);
      window.removeEventListener('scroll', fermer, true);
      window.removeEventListener('resize', fermer);
    };
  }, [ouvert]);

  const normales = actions.filter((a) => !a.danger);
  const dangereuses = actions.filter((a) => a.danger);

  const entree = (a: ActionMenu) => (
    <button
      key={a.libelle}
      type="button"
      role="menuitem"
      onClick={(e) => {
        // La ligne entière ouvre la fiche : le clic ne doit pas lui parvenir.
        e.stopPropagation();
        setOuvert(false);
        a.onClick();
      }}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
        a.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {a.icone && <Icon name={a.icone} size={16} className="shrink-0 opacity-70" />}
      {a.libelle}
    </button>
  );

  return (
    <>
      <button
        ref={bouton}
        type="button"
        aria-label={libelle}
        title={libelle}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        onClick={(e) => {
          e.stopPropagation();
          setOuvert((v) => !v);
        }}
        className={`btn-icon text-gray-500 hover:bg-gray-100 hover:text-gray-900 ${ouvert ? 'bg-gray-100 text-gray-900' : ''}`}
      >
        <Icon name="more-horizontal" size={18} />
      </button>
      {ouvert &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[80] min-w-[13rem] overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
            style={position ?? { top: -9999, right: 0 }}
          >
            {normales.map(entree)}
            {normales.length > 0 && dangereuses.length > 0 && <div className="my-1 border-t border-gray-100" />}
            {dangereuses.map(entree)}
          </div>,
          document.body
        )}
    </>
  );
}
