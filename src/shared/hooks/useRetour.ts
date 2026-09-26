import { useLocation, useNavigate, type Location } from 'react-router-dom';

/**
 * Navigation « Retour » contextuelle du dashboard.
 *
 * Une page qui en ouvre une autre (liste → détail, liste → création…) lui
 * transmet son adresse complète (chemin + filtres de l'URL) dans l'état de
 * navigation via `etatRetour()`. La page ouverte sait alors d'où l'on vient :
 *
 *  - origine connue et entrée d'historique précédente disponible
 *      → `navigate(-1)` : retour exact, filtres, pagination et défilement
 *        compris, sans créer d'entrée en double dans l'historique ;
 *  - origine connue mais historique perdu (cas limite)
 *      → navigation vers cette origine ;
 *  - aucune origine (URL saisie, favori, nouvel onglet, lien externe)
 *      → page parente logique du module (`parent`).
 *
 * Toutes les destinations restent des routes internes : les gardes
 * (`PrivateRoute`) s'appliquent normalement.
 */

export interface EtatRetour {
  retour?: string;
}

/** État à passer à `navigate(…, { state })` ou `<Link state>` depuis la page d'origine. */
export const etatRetour = (location: Pick<Location, 'pathname' | 'search'>): EtatRetour => ({
  retour: `${location.pathname}${location.search}`,
});

/** Seules les adresses internes de l'application sont acceptées comme origine. */
const origineValide = (valeur: unknown): valeur is string =>
  typeof valeur === 'string' && valeur.startsWith('/') && !valeur.startsWith('//');

/** Adresse d'origine transmise par la page précédente, s'il y en a une. */
export const lireOrigine = (state: unknown): string | null => {
  const retour = (state as EtatRetour | null)?.retour;
  return origineValide(retour) ? retour : null;
};

/** Renvoie la fonction de retour de la page courante. `parent` sert de repli. */
export function useRetour(parent: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const origine = lireOrigine(location.state);

  return () => {
    // `key === 'default'` : première entrée de la session (ouverture directe),
    // il n'y a rien de pertinent à dépiler.
    if (origine && location.key !== 'default') navigate(-1);
    else navigate(origine ?? parent);
  };
}
