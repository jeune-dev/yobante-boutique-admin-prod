import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent as KeyboardEventReact,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
import { PICTO } from '@/assets/images/logos';
import { NAV, estGroupe, groupeActif, type GroupeNav } from '../navigation';
import SousMenuFlottant from './SousMenuFlottant';

/** Infobulle affichée à droite d'une icône quand la barre est repliée. */
interface Infobulle {
  label: string;
  top: number;
  left: number;
}

/** Panneau de sous-menu ouvert (écran large). */
interface PanneauOuvert {
  id: string;
  ancre: DOMRect;
  /** Ouvert au clic : il reste affiché quand la souris s'en va. */
  epingle: boolean;
  /** Ouvert au clavier : le focus part sur le premier lien. */
  clavier: boolean;
}

/** Liseré d'élément actif : discret, aux couleurs de la marque. */
const LISERE = (
  <span
    aria-hidden="true"
    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-yellow-500"
  />
);

/** `md` : au-dessus, la barre est une colonne ; en dessous, un tiroir. */
const ECRAN_MD = '(min-width: 768px)';
/** `lg` : au-dessus seulement, la barre peut rester dépliée. */
const ECRAN_LG = '(min-width: 1024px)';

/** Délai avant fermeture d'un panneau survolé : tolère un trajet imprécis. */
const DELAI_FERMETURE = 180;

/** Suit le franchissement d'un point de rupture. */
function usePointDeRupture(requete: string) {
  const [atteint, setAtteint] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(requete).matches
  );

  useEffect(() => {
    const mq = window.matchMedia?.(requete);
    if (!mq) return;
    const maj = () => setAtteint(mq.matches);
    maj();
    mq.addEventListener?.('change', maj);
    return () => mq.removeEventListener?.('change', maj);
  }, [requete]);

  return atteint;
}

interface Props {
  /** Repliée (≥ lg, choix de l'utilisateur) : seules les icônes restent. */
  replie: boolean;
  onBasculer: () => void;
  /** Tiroir ouvert (écran étroit) : la barre glisse par-dessus le contenu. */
  tiroirOuvert: boolean;
  onFermerTiroir: () => void;
}

/**
 * Barre latérale du dashboard boutique.
 *
 * Trois comportements selon la largeur d'écran :
 *  - ≥ lg : colonne fixe, dépliée ou repliée en bandeau d'icônes au choix ;
 *  - md → lg (tablette) : toujours le bandeau d'icônes, pour laisser la
 *    place au contenu sans masquer la navigation ;
 *  - < md : tiroir hors écran, ouvert par le bouton du header, avec un voile
 *    sur le contenu ; il se referme au choix d'un menu, au clic sur le voile
 *    ou avec Échap.
 *
 * Les sous-menus s'ouvrent dans un panneau flottant à droite (survol ou clic)
 * dès que la barre est une colonne ; dans le tiroir, ils se déplient en
 * accordéon, plus sûr au doigt sur un écran étroit.
 */
export default function ShopSidebar({ replie, onBasculer, tiroirOuvert, onFermerTiroir }: Props) {
  const { pathname } = useLocation();
  const ecranMd = usePointDeRupture(ECRAN_MD);
  const ecranLg = usePointDeRupture(ECRAN_LG);
  /** Barre en colonne : les sous-menus s'ouvrent alors en panneau flottant. */
  const ecranLarge = ecranMd;
  /** Bandeau d'icônes : imposé en tablette, au choix au-delà. */
  const compact = ecranMd && (!ecranLg || replie);

  const [infobulle, setInfobulle] = useState<Infobulle | null>(null);
  const [panneau, setPanneau] = useState<PanneauOuvert | null>(null);
  /** Groupes dépliés en accordéon (écran étroit). */
  const [deplies, setDeplies] = useState<string[]>([]);

  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refsBoutons = useRef<Record<string, HTMLButtonElement | null>>({});

  const annulerFermeture = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = null;
  }, []);

  const idOuvert = panneau?.id ?? null;

  const fermerPanneau = useCallback(
    (rendreFocus = false) => {
      annulerFermeture();
      if (rendreFocus && idOuvert) refsBoutons.current[idOuvert]?.focus();
      setPanneau(null);
    },
    [annulerFermeture, idOuvert]
  );

  /** Fermeture différée : la souris peut traverser le vide jusqu'au panneau. */
  const programmerFermeture = useCallback(() => {
    annulerFermeture();
    minuteur.current = setTimeout(() => {
      setPanneau((ouvert) => (ouvert?.epingle ? ouvert : null));
    }, DELAI_FERMETURE);
  }, [annulerFermeture]);

  useEffect(() => () => annulerFermeture(), [annulerFermeture]);

  // Le panneau est positionné à partir d'un rectangle figé : tout ce qui le
  // déplace (navigation, repli, redimensionnement, défilement) le referme.
  useEffect(() => {
    setPanneau(null);
  }, [pathname, compact, ecranLarge]);

  useEffect(() => {
    if (!panneau) return;
    const fermer = () => setPanneau(null);
    // Échap referme le panneau même quand le focus n'y est pas (ouverture au
    // survol) ; le panneau gère lui-même le retour du focus au bouton.
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer();
    };
    window.addEventListener('resize', fermer);
    window.addEventListener('scroll', fermer, true);
    document.addEventListener('keydown', surTouche);
    return () => {
      window.removeEventListener('resize', fermer);
      window.removeEventListener('scroll', fermer, true);
      document.removeEventListener('keydown', surTouche);
    };
  }, [panneau]);

  // Panneau ouvert au clic : un clic ailleurs le referme.
  useEffect(() => {
    if (!panneau?.epingle) return;
    const surClic = (e: PointerEvent) => {
      const cible = e.target as Node;
      if (refsBoutons.current[panneau.id]?.contains(cible)) return;
      if (document.getElementById(`sous-menu-${panneau.id}`)?.parentElement?.contains(cible)) return;
      setPanneau(null);
    };
    document.addEventListener('pointerdown', surClic);
    return () => document.removeEventListener('pointerdown', surClic);
  }, [panneau]);

  // Écran étroit : le groupe de la page courante s'ouvre de lui-même.
  useEffect(() => {
    const actif = NAV.find((e) => estGroupe(e) && groupeActif(pathname, e));
    if (actif && estGroupe(actif)) {
      setDeplies((liste) => (liste.includes(actif.id) ? liste : [...liste, actif.id]));
    }
  }, [pathname]);

  // Barre repliée : le libellé n'est plus visible, on l'affiche dès le survol
  // (ou le focus clavier) de l'icône. Rendu dans un portail, en position
  // fixe, pour ne pas être rogné par le défilement de la barre.
  const montrerInfobulle = (label: string) => (e: MouseEvent | FocusEvent) => {
    if (!compact) return;
    const r = e.currentTarget.getBoundingClientRect();
    setInfobulle({ label, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const cacherInfobulle = () => setInfobulle(null);

  const ouvrirPanneau = (groupe: GroupeNav, bouton: HTMLButtonElement, options: Partial<PanneauOuvert> = {}) => {
    annulerFermeture();
    setPanneau({ id: groupe.id, ancre: bouton.getBoundingClientRect(), epingle: false, clavier: false, ...options });
  };

  const surClicGroupe = (groupe: GroupeNav) => (e: MouseEvent<HTMLButtonElement>) => {
    cacherInfobulle();
    if (!ecranLarge) {
      setDeplies((liste) =>
        liste.includes(groupe.id) ? liste.filter((id) => id !== groupe.id) : [...liste, groupe.id]
      );
      return;
    }
    if (panneau?.id === groupe.id && panneau.epingle) {
      fermerPanneau();
      return;
    }
    ouvrirPanneau(groupe, e.currentTarget, { epingle: true });
  };

  const surToucheGroupe = (groupe: GroupeNav) => (e: KeyboardEventReact<HTMLButtonElement>) => {
    if (!ecranLarge) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      ouvrirPanneau(groupe, e.currentTarget, { epingle: true, clavier: true });
    } else if (e.key === 'Escape') {
      fermerPanneau();
    }
  };

  /** Classes communes aux entrées de premier niveau. */
  const classeEntree = (actif: boolean, desactive = false) =>
    [
      'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50',
      compact ? 'justify-center px-0' : '',
      desactive
        ? 'cursor-not-allowed text-gray-300'
        : actif
          ? 'bg-yellow-50 text-yellow-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
    ]
      .filter(Boolean)
      .join(' ');

  const libelleMasque = compact ? 'hidden' : '';

  return (
    <>
      {/* Voile derrière le tiroir (écran étroit uniquement). */}
      {tiroirOuvert && !ecranMd && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/50"
          onClick={onFermerTiroir}
          aria-hidden="true"
        />
      )}

      <aside
        id="menu-principal"
        className={`
          nav-transition z-40 flex h-screen shrink-0 flex-col border-r border-gray-100 bg-white
          transition-[transform,width] duration-200
          ${
            ecranMd
              ? `static ${compact ? 'w-[76px]' : 'w-64'} translate-x-0 shadow-none`
              : `fixed inset-y-0 left-0 w-72 max-w-[85vw] ${
                  tiroirOuvert ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
                }`
          }
        `}
      >
        <div
          className={`h-16 flex items-center gap-2 border-b border-gray-100 px-4 ${
            compact ? 'justify-center px-2' : ''
          }`}
        >
          <img src={PICTO} alt="Yobante Boutique" className="h-9 w-auto shrink-0" />
          <span
            className={`font-bold text-[15px] text-gray-900 leading-tight truncate ${libelleMasque}`}
          >
            Yobante <span className="text-yellow-500">Boutique</span>
          </span>

          {/* Écran étroit : fermeture du tiroir. */}
          {!ecranMd && (
            <button
              type="button"
              onClick={onFermerTiroir}
              aria-label="Fermer le menu"
              className="btn-icon ml-auto text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            >
              <Icon name="x" size={18} />
            </button>
          )}

          {/* ≥ lg : repli en bandeau d'icônes. Le bouton reste collé au logo.
              En tablette le bandeau est imposé : pas de bascule à proposer. */}
          {ecranLg && !replie && (
            <button
              type="button"
              onClick={onBasculer}
              aria-label="Replier le menu"
              title="Replier le menu"
              className="ml-auto shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            >
              <Icon name="chevrons-left" size={18} />
            </button>
          )}
        </div>

        {ecranLg && replie && (
          <button
            type="button"
            onClick={onBasculer}
            aria-label="Déplier le menu"
            title="Déplier le menu"
            className="mx-auto mt-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
          >
            <Icon name="chevrons-right" size={18} />
          </button>
        )}

        <nav
          aria-label="Menu principal"
          className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-3"
        >
          {NAV.map((entree) => {
            /* ── Entrée simple : un lien ─────────────────────────────── */
            if (!estGroupe(entree)) {
              return (
                <NavLink
                  key={entree.path}
                  to={entree.path}
                  onMouseEnter={montrerInfobulle(entree.label)}
                  onMouseLeave={cacherInfobulle}
                  onFocus={montrerInfobulle(entree.label)}
                  onBlur={cacherInfobulle}
                  onClick={() => {
                    cacherInfobulle();
                    fermerPanneau();
                    onFermerTiroir();
                  }}
                  className={({ isActive }) => classeEntree(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && LISERE}
                      <Icon name={entree.icon} size={18} />
                      <span className={libelleMasque}>{entree.label}</span>
                    </>
                  )}
                </NavLink>
              );
            }

            /* ── Groupe : bouton + sous-menu ──────────────────────────── */
            const actif = groupeActif(pathname, entree);
            const deplie = deplies.includes(entree.id);
            const ouvert = ecranLarge ? panneau?.id === entree.id : deplie;

            return (
              <div
                key={entree.id}
                onMouseEnter={() => {
                  if (!ecranLarge) return;
                  const bouton = refsBoutons.current[entree.id];
                  // Le panneau porte déjà le libellé du groupe : pas
                  // d'infobulle en plus quand la barre est repliée.
                  if (bouton) ouvrirPanneau(entree, bouton);
                }}
                onMouseLeave={() => {
                  if (ecranLarge) programmerFermeture();
                }}
              >
                <button
                  type="button"
                  ref={(el) => {
                    refsBoutons.current[entree.id] = el;
                  }}
                  aria-haspopup="true"
                  aria-expanded={!!ouvert}
                  aria-controls={ouvert ? `sous-menu-${entree.id}` : undefined}
                  onClick={surClicGroupe(entree)}
                  onKeyDown={surToucheGroupe(entree)}
                  className={classeEntree(actif)}
                >
                  {actif && LISERE}
                  <Icon name={entree.icon} size={18} />
                  <span className={libelleMasque}>{entree.label}</span>
                  <Icon
                    name="chevron-right"
                    size={14}
                    className={`ml-auto shrink-0 text-gray-300 nav-transition transition-transform ${libelleMasque} ${
                      !ecranLarge && deplie ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {/* Écran étroit : accordéon sous le parent. */}
                {!ecranLarge && deplie && (
                  <ul className="ml-[22px] mt-0.5 space-y-0.5 border-l border-gray-100 pl-2">
                    {entree.enfants.map((enfant) => (
                      <li key={enfant.path}>
                        <NavLink
                          to={enfant.path}
                          onClick={() => onFermerTiroir()}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50 ${
                              isActive
                                ? 'bg-yellow-50 font-medium text-yellow-700'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`
                          }
                        >
                          <Icon name={enfant.icon} size={16} />
                          {enfant.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Écran large : panneau flottant du groupe survolé ou cliqué. */}
      {ecranLarge &&
        panneau &&
        (() => {
          const groupe = NAV.find((e) => estGroupe(e) && e.id === panneau.id);
          if (!groupe || !estGroupe(groupe)) return null;
          return (
            <SousMenuFlottant
              groupe={groupe}
              ancre={panneau.ancre}
              pathname={pathname}
              focusAuto={panneau.clavier}
              onEntrer={annulerFermeture}
              onSortir={programmerFermeture}
              onFermer={fermerPanneau}
            />
          );
        })()}

      {infobulle &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
            style={{ top: infobulle.top, left: infobulle.left }}
          >
            {/* Petite flèche vers l'icône survolée. */}
            <span
              aria-hidden="true"
              className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"
            />
            {infobulle.label}
          </div>,
          document.body
        )}
    </>
  );
}
