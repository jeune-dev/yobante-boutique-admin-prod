import {
  useCallback,
  useEffect,
  useMemo,
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
import { useAuthStore } from '@/auth/store/auth.store';
import { navPourAcces, estActif, type EntreeNav } from '../navigation';
import SousMenuFlottant from './SousMenuFlottant';

/** Infobulle affichée à droite d'une icône quand la barre est en bandeau. */
interface Infobulle {
  label: string;
  top: number;
  left: number;
}

/** Panneau de sous-menu ouvert (barre en colonne). */
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

/** Identifiant stable tiré du libellé (les entrées n'ont pas de clé propre). */
const idDuLabel = (label: string) =>
  label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Un groupe s'allume dès qu'une de ses sous-pages est ouverte ; les
 * paramètres de requête sont ignorés, sinon le groupe s'éteindrait sur une
 * vue filtrée (`/boutique/stock?vue=rupture`).
 */
const entreeActive = (entree: EntreeNav, pathname: string, search: string) =>
  entree.path
    ? estActif(entree.path, pathname, search)
    : (entree.enfants ?? []).some((c) => estActif(c.path.split('?')[0], pathname, ''));

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
  /** Tiroir ouvert (< md) : la barre glisse par-dessus le contenu. */
  tiroirOuvert: boolean;
  onFermerTiroir: () => void;
}

/**
 * Navigation principale : colonne verticale à gauche.
 *
 * Remplace la barre d'onglets horizontale, qui débordait dès neuf sections et
 * imposait de défiler latéralement dans l'entête pour atteindre les
 * dernières. En colonne, les dix sections tiennent sans défilement et leurs
 * sous-pages s'ouvrent dans un panneau flottant à droite.
 *
 * Trois comportements selon la largeur :
 *  - ≥ lg : colonne dépliée ou repliée en bandeau d'icônes, au choix (le
 *    choix est conservé d'une visite à l'autre par `ShopLayout`) ;
 *  - md → lg (tablette) : toujours le bandeau d'icônes, pour laisser la
 *    place au contenu sans masquer la navigation ;
 *  - < md : tiroir hors écran ouvert par le bouton de l'entête, avec un
 *    voile ; il se referme au choix d'une page, au clic sur le voile ou avec
 *    Échap. Les groupes y sont dépliés d'emblée — l'intérêt du tiroir est de
 *    montrer l'arborescence complète d'un coup.
 *
 * Seules les pages autorisées de l'administrateur apparaissent : la liste
 * vient de `navPourAcces`, exactement comme l'ancienne barre.
 */
export default function ShopSidebar({ replie, onBasculer, tiroirOuvert, onFermerTiroir }: Props) {
  const permissions = useAuthStore((s) => s.user?.permissions);
  const NAV = useMemo(() => navPourAcces(permissions), [permissions]);
  const { pathname, search } = useLocation();

  const ecranMd = usePointDeRupture(ECRAN_MD);
  const ecranLg = usePointDeRupture(ECRAN_LG);
  /** Bandeau d'icônes : imposé en tablette, au choix au-delà. */
  const compact = ecranMd && (!ecranLg || replie);

  const [infobulle, setInfobulle] = useState<Infobulle | null>(null);
  const [panneau, setPanneau] = useState<PanneauOuvert | null>(null);

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
  }, [pathname, compact, ecranMd]);

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

  // Bandeau d'icônes : le libellé n'est plus visible, on l'affiche dès le
  // survol (ou le focus clavier) de l'icône. Rendu dans un portail, en
  // position fixe, pour ne pas être rogné par le défilement de la barre.
  const montrerInfobulle = (label: string) => (e: MouseEvent | FocusEvent) => {
    if (!compact) return;
    const r = e.currentTarget.getBoundingClientRect();
    setInfobulle({ label, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const cacherInfobulle = () => setInfobulle(null);

  const ouvrirPanneau = (
    id: string,
    bouton: HTMLButtonElement,
    options: Partial<PanneauOuvert> = {}
  ) => {
    annulerFermeture();
    setPanneau({
      id,
      ancre: bouton.getBoundingClientRect(),
      epingle: false,
      clavier: false,
      ...options,
    });
  };

  const surClicGroupe = (id: string) => (e: MouseEvent<HTMLButtonElement>) => {
    cacherInfobulle();
    if (panneau?.id === id && panneau.epingle) {
      fermerPanneau();
      return;
    }
    ouvrirPanneau(id, e.currentTarget, { epingle: true });
  };

  const surToucheGroupe = (id: string) => (e: KeyboardEventReact<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      ouvrirPanneau(id, e.currentTarget, { epingle: true, clavier: true });
    } else if (e.key === 'Escape') {
      fermerPanneau();
    }
  };

  /** Classes communes aux entrées de premier niveau de la colonne. */
  const classeEntree = (actif: boolean, desactive = false) =>
    [
      'relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
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

  /* ── Tiroir (< md) : arborescence complète, groupes dépliés ───────────── */
  const contenuTiroir = (
    <nav aria-label="Menu principal" className="flex-1 overflow-y-auto overscroll-contain p-2">
      {NAV.map((entree) => {
        const lien = (
          item: { label: string; icon: string; path: string; aide?: string },
          indente: boolean
        ) => {
          const actif = estActif(item.path, pathname, search);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-current={actif ? 'page' : undefined}
              onClick={onFermerTiroir}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                indente ? 'ml-1' : ''
              } ${actif ? 'bg-yellow-50' : 'hover:bg-gray-50 active:bg-gray-100'}`}
            >
              <Icon
                name={item.icon}
                size={18}
                className={`mt-0.5 shrink-0 ${actif ? 'text-yellow-600' : 'text-gray-400'}`}
              />
              <span className="min-w-0">
                <span
                  className={`block text-sm font-medium ${
                    actif ? 'text-yellow-700' : 'text-gray-800'
                  }`}
                >
                  {item.label}
                </span>
                {item.aide && (
                  <span className="block text-xs leading-tight text-gray-400">{item.aide}</span>
                )}
              </span>
            </NavLink>
          );
        };

        if (entree.path) return lien({ ...entree, path: entree.path }, false);

        return (
          <div key={entree.label} className="mt-2 first:mt-0">
            <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <Icon name={entree.icon} size={13} />
              {entree.label}
            </p>
            {(entree.enfants ?? []).map((enfant) => lien(enfant, true))}
          </div>
        );
      })}
    </nav>
  );

  /* ── Colonne (≥ md) : entrées de premier niveau et panneaux flottants ─── */
  const contenuColonne = (
    <nav
      aria-label="Menu principal"
      className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-3"
    >
      {NAV.map((entree) => {
        const actif = entreeActive(entree, pathname, search);

        if (entree.path) {
          return (
            <NavLink
              key={entree.label}
              to={entree.path}
              onMouseEnter={montrerInfobulle(entree.label)}
              onMouseLeave={cacherInfobulle}
              onFocus={montrerInfobulle(entree.label)}
              onBlur={cacherInfobulle}
              onClick={() => {
                cacherInfobulle();
                fermerPanneau();
              }}
              aria-current={actif ? 'page' : undefined}
              className={classeEntree(actif)}
            >
              {actif && LISERE}
              <Icon name={entree.icon} size={18} className="shrink-0" />
              <span className={`truncate ${libelleMasque}`}>{entree.label}</span>
            </NavLink>
          );
        }

        const id = idDuLabel(entree.label);
        const ouvert = panneau?.id === id;

        return (
          <div
            key={entree.label}
            onMouseEnter={() => {
              const bouton = refsBoutons.current[id];
              // Le panneau porte déjà le libellé du groupe : pas d'infobulle
              // en plus quand la barre est en bandeau.
              if (bouton) ouvrirPanneau(id, bouton);
            }}
            onMouseLeave={programmerFermeture}
          >
            <button
              type="button"
              ref={(el) => {
                refsBoutons.current[id] = el;
              }}
              aria-haspopup="true"
              aria-expanded={ouvert}
              aria-controls={ouvert ? `sous-menu-${id}` : undefined}
              onClick={surClicGroupe(id)}
              onKeyDown={surToucheGroupe(id)}
              className={classeEntree(actif)}
            >
              {actif && LISERE}
              <Icon name={entree.icon} size={18} className="shrink-0" />
              <span className={`truncate ${libelleMasque}`}>{entree.label}</span>
              <Icon
                name="chevron-right"
                size={13}
                className={`nav-transition ml-auto shrink-0 text-gray-300 transition-transform ${libelleMasque} ${
                  ouvert ? 'translate-x-0.5 text-gray-400' : ''
                }`}
              />
            </button>
          </div>
        );
      })}
    </nav>
  );

  // Tiroir fermé : rien n'est monté, sinon des liens hors écran resteraient
  // atteignables au clavier et annoncés par les lecteurs d'écran.
  if (!ecranMd && !tiroirOuvert) return null;

  return (
    <>
      {/* Voile derrière le tiroir (écran étroit uniquement). */}
      {tiroirOuvert && !ecranMd && (
        <div
          className="fixed inset-0 z-[55] bg-gray-900/50"
          onClick={onFermerTiroir}
          aria-hidden="true"
        />
      )}

      <aside
        id="menu-principal"
        className={`
          nav-transition z-[60] flex h-screen shrink-0 flex-col border-r border-gray-100 bg-white
          transition-[width] duration-200
          ${
            ecranMd
              ? `static ${compact ? 'w-[72px]' : 'w-[15.5rem]'} shadow-none`
              : 'fixed inset-y-0 left-0 w-[86vw] max-w-sm shadow-2xl'
          }
        `}
      >
        <div
          className={`flex h-16 shrink-0 items-center gap-2 border-b border-gray-100 px-3 xl:h-[4.5rem] ${
            compact ? 'justify-center px-2' : ''
          }`}
        >
          <NavLink
            to="/boutique/dashboard"
            title="Yobante Boutique"
            onClick={onFermerTiroir}
            className="flex min-w-0 items-center gap-2"
          >
            <img src={PICTO} alt="Yobante Boutique" className="h-10 w-auto shrink-0" />
            <span
              className={`truncate text-[15px] font-bold leading-tight text-gray-900 ${libelleMasque}`}
            >
              Yobante <span className="text-yellow-500">Boutique</span>
            </span>
          </NavLink>

          {/* Écran étroit : fermeture du tiroir. */}
          {!ecranMd && (
            <button
              type="button"
              onClick={onFermerTiroir}
              aria-label="Fermer le menu"
              className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            >
              <Icon name="x" size={18} />
            </button>
          )}

          {/* ≥ lg : repli en bandeau d'icônes. En tablette le bandeau est
              imposé, il n'y a donc pas de bascule à proposer. */}
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

        {ecranMd ? contenuColonne : contenuTiroir}
      </aside>

      {/* Panneau flottant du groupe survolé ou cliqué (barre en colonne). */}
      {ecranMd &&
        panneau &&
        (() => {
          const groupe = NAV.find((e) => !e.path && idDuLabel(e.label) === panneau.id);
          if (!groupe) return null;
          return (
            <SousMenuFlottant
              groupe={groupe}
              idGroupe={panneau.id}
              ancre={panneau.ancre}
              pathname={pathname}
              search={search}
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
            className="pointer-events-none fixed z-[70] -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
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
