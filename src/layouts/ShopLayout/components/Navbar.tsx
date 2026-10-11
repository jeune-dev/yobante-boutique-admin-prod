import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
import { navPourAcces, estActif, type EntreeNav } from '../navigation';
import { useAuthStore } from '@/auth/store/auth.store';

/** Largeur du fondu appliqué au bord où la barre continue hors champ. */
const FONDU = '28px';
/** Largeur du menu dépliant, nécessaire pour le recadrer dans la fenêtre. */
const LARGEUR_MENU = 248;

/**
 * Onglet de la barre. Dimensions resserrées depuis le passage à neuf sections :
 * en `text-sm` avec des icônes de 18 px, la liste débordait dès 1 280 px et
 * imposait de défiler pour atteindre Analytics. Icône et intitulé réduits d'un
 * cran, gouttières comprises, font tenir l'ensemble sans défilement.
 */
const classesOnglet = (actif: boolean) =>
  `flex items-center gap-1.5 whitespace-nowrap px-2 lg:px-2.5 text-[13.5px] font-medium border-b-2 transition-colors ${
    actif
      ? 'border-yellow-400 text-yellow-700'
      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
  }`;

/** Taille des icônes d'onglet, accordée aux intitulés (13,5 px). */
const TAILLE_ICONE = 16;

/**
 * Navigation principale, intégrée à la barre du haut.
 *
 * Les pages d'un même sujet sont regroupées derrière un menu dépliant (voir
 * `navigation.ts`) : six entrées tiennent sur la ligne là où douze
 * débordaient. Un groupe s'affiche actif dès que l'une de ses sous-pages
 * l'est, pour qu'on sache toujours dans quelle branche on se trouve.
 *
 * Les menus sont rendus dans un portail : la barre est un conteneur
 * `overflow-x-auto`, qui les rognerait s'ils étaient positionnés à
 * l'intérieur.
 *
 * Sous le point de rupture `md`, cette barre disparaît entièrement : six noms
 * déployés ne laisseraient voir que deux sections sur un écran de 375 px, et
 * les réduire à des icônes obligerait à deviner. C'est `MenuMobile`, un
 * tiroir listant l'arborescence complète, qui prend le relais.
 *
 * La barre de défilement est masquée — disgracieuse en travers de l'entête —
 * et remplacée par un fondu sur le bord où la liste continue, sans quoi rien
 * n'indiquerait que des sections existent hors champ sur un écran étroit.
 */
export default function ShopNavbar() {
  // Seules les pages autorisées de l'administrateur apparaissent.
  const permissions = useAuthStore((s) => s.user?.permissions);
  const NAV = useMemo(() => navPourAcces(permissions), [permissions]);
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const bandeau = useRef<HTMLElement>(null);
  const [deborde, setDeborde] = useState({ gauche: false, droite: false });
  const [ouvert, setOuvert] = useState<{ label: string; x: number; y: number } | null>(null);

  const mesurer = useCallback(() => {
    const el = bandeau.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setDeborde({
      gauche: el.scrollLeft > 1,
      // 1px de tolérance : les navigateurs arrondissent `scrollLeft`, et le
      // fondu de droite resterait sinon affiché en fin de course.
      droite: el.scrollLeft < max - 1,
    });
  }, []);

  useEffect(() => {
    const el = bandeau.current;
    if (!el) return;
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [mesurer]);

  useEffect(() => {
    const actif = bandeau.current?.querySelector<HTMLElement>('[data-actif="true"]');
    // `nearest` : on ne déplace la barre que si l'onglet est hors vue, sans
    // recentrer inutilement à chaque navigation.
    actif?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    mesurer();
    setOuvert(null);
  }, [pathname, mesurer]);

  useEffect(() => {
    if (!ouvert) return;
    const auClic = (e: MouseEvent) => {
      const cible = e.target as HTMLElement;
      // Le menu vit dans un portail, hors du <nav> : on le reconnaît par son
      // marqueur plutôt que par `contains` sur le bandeau.
      if (!cible.closest('[data-menu-nav]') && !cible.closest('[data-declencheur-nav]')) {
        setOuvert(null);
      }
    };
    const auClavier = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(null);
    // Position figée à l'ouverture : plutôt que de la recalculer en continu,
    // on referme dès que la page ou la fenêtre bouge.
    const fermer = () => setOuvert(null);
    document.addEventListener('mousedown', auClic);
    document.addEventListener('keydown', auClavier);
    window.addEventListener('resize', fermer);
    window.addEventListener('scroll', fermer, true);
    return () => {
      document.removeEventListener('mousedown', auClic);
      document.removeEventListener('keydown', auClavier);
      window.removeEventListener('resize', fermer);
      window.removeEventListener('scroll', fermer, true);
    };
  }, [ouvert]);

  const basculer = (entree: EntreeNav) => (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ouvert?.label === entree.label) return setOuvert(null);
    const r = e.currentTarget.getBoundingClientRect();
    setOuvert({
      label: entree.label,
      // Recadré des deux côtés : un groupe en bout de barre n'ouvre pas son
      // menu hors de la fenêtre à droite, et sur un écran très étroit la
      // position ne peut pas devenir négative à gauche.
      x: Math.max(8, Math.min(r.left, window.innerWidth - LARGEUR_MENU - 8)),
      y: r.bottom,
    });
  };

  const masque =
    deborde.gauche && deborde.droite
      ? `linear-gradient(90deg, transparent 0, #000 ${FONDU}, #000 calc(100% - ${FONDU}), transparent 100%)`
      : deborde.droite
        ? `linear-gradient(90deg, #000 calc(100% - ${FONDU}), transparent 100%)`
        : deborde.gauche
          ? `linear-gradient(90deg, transparent 0, #000 ${FONDU})`
          : undefined;

  const groupeOuvert = NAV.find((e) => e.label === ouvert?.label);

  return (
    <>
      <nav
        id="menu-principal"
        ref={bandeau}
        onScroll={mesurer}
        aria-label="Menu principal"
        style={{ WebkitMaskImage: masque, maskImage: masque }}
        // `min-w-0` est indispensable : sans lui, un enfant flex refuse de
        // rétrécir sous sa largeur de contenu et pousserait le menu de compte
        // hors de l'écran au lieu de défiler.
        className="hidden md:block flex-1 min-w-0 self-stretch overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* `w-max` + `mx-auto` : les sections sont centrées tant qu'elles
            tiennent dans la barre, et les marges automatiques retombent à zéro
            dès que ça déborde — le défilement reste donc complet, alors qu'un
            `justify-center` rendrait le début de la liste inatteignable. */}
        <ul className="flex items-stretch h-full gap-0.5 w-max mx-auto">
          {NAV.map((entree) => {
            // Un groupe s'allume dès qu'une de ses sous-pages est ouverte ; on
            // ignore ici les paramètres de requête, sinon le groupe Stock
            // s'éteindrait en consultant la vue « Ruptures ».
            const actif = entree.path
              ? estActif(entree.path, pathname, search)
              : (entree.enfants ?? []).some((c) =>
                  estActif(c.path.split('?')[0], pathname, '')
                );

            return (
              <li key={entree.label} className="flex">
                {entree.path ? (
                  <NavLink
                    to={entree.path}
                    data-actif={actif}
                    title={entree.label}
                    aria-label={entree.label}
                    className={classesOnglet(actif)}
                  >
                    <Icon name={entree.icon} size={TAILLE_ICONE} className="shrink-0" />
                    {entree.label}
                  </NavLink>
                ) : (
                  <button
                    type="button"
                    data-actif={actif}
                    aria-label={entree.label}
                    data-declencheur-nav
                    onClick={basculer(entree)}
                    aria-haspopup="menu"
                    aria-expanded={ouvert?.label === entree.label}
                    className={classesOnglet(actif)}
                  >
                    <Icon name={entree.icon} size={TAILLE_ICONE} className="shrink-0" />
                    {entree.label}
                    <Icon
                      name="chevron-right"
                      size={11}
                      className={`shrink-0 transition-transform ${
                        ouvert?.label === entree.label ? '-rotate-90' : 'rotate-90'
                      }`}
                    />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {ouvert &&
        groupeOuvert?.enfants &&
        createPortal(
          <div
            data-menu-nav
            role="menu"
            aria-label={groupeOuvert.label}
            style={{ top: ouvert.y + 4, left: ouvert.x, width: LARGEUR_MENU }}
            className="fixed z-50 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden"
          >
            {groupeOuvert.enfants.map((enfant) => {
              const actif = estActif(enfant.path, pathname, search);
              return (
                <button
                  key={enfant.path}
                  type="button"
                  role="menuitem"
                  onClick={() => navigate(enfant.path)}
                  className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
                    actif ? 'bg-yellow-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <Icon
                    name={enfant.icon}
                    size={TAILLE_ICONE}
                    className={`mt-0.5 shrink-0 ${actif ? 'text-yellow-600' : 'text-gray-400'}`}
                  />
                  {/* L'intitulé reste au-dessus du `text-xs` des onglets : ce
                      panneau sert à comprendre où l'on va, pas à gagner de la
                      largeur. Seules les gouttières se resserrent. */}
                  <span className="min-w-0">
                    <span
                      className={`block text-[14px] font-medium leading-snug ${
                        actif ? 'text-yellow-700' : 'text-gray-800'
                      }`}
                    >
                      {enfant.label}
                    </span>
                    {enfant.aide && (
                      <span className="block text-[12px] text-gray-400 leading-tight">
                        {enfant.aide}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
