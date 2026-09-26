import { useLocation, useSearchParams } from 'react-router-dom';

/**
 * État d'une liste (recherche, filtres, page, onglet…) conservé dans l'URL.
 *
 * Revenir d'un détail, recharger la page ou partager le lien restitue donc la
 * liste telle qu'on l'avait laissée. Les valeurs par défaut n'apparaissent pas
 * dans l'URL. Les mises à jour remplacent l'entrée d'historique courante :
 * saisir une recherche n'empile pas une entrée par caractère.
 */
export function useParametresUrl<T extends Record<string, string>>(defauts: T) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();

  const valeurs = Object.fromEntries(
    Object.entries(defauts).map(([cle, defaut]) => [cle, params.get(cle) ?? defaut])
  ) as T;

  const modifier = (maj: Partial<T>) =>
    setParams(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        for (const [cle, valeur] of Object.entries(maj)) {
          if (valeur === undefined || valeur === '' || valeur === defauts[cle]) suivants.delete(cle);
          else suivants.set(cle, valeur);
        }
        return suivants;
      },
      // L'état de navigation (origine du « Retour ») survit aux changements de filtre.
      { replace: true, state: location.state }
    );

  return [valeurs, modifier] as const;
}

/** Numéro de page lu dans l'URL : entier ≥ 1, sinon 1. */
export const lirePage = (valeur: string) => {
  const page = Number.parseInt(valeur, 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
};
