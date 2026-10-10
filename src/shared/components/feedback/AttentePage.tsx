/**
 * Attente affichée pendant le chargement du module d'une page (code splitting).
 *
 * `role="status"` + `aria-live="polite"` : un lecteur d'écran annonce le
 * chargement, sans interrompre ce qui est en cours de lecture. Pas
 * d'animation : rien ne justifie du mouvement pour une attente de quelques
 * centaines de millisecondes, et `prefers-reduced-motion` n'a donc rien à
 * neutraliser ici.
 */
export const AttentePage = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex items-center justify-center py-16 text-sm text-gray-500"
  >
    Chargement…
  </div>
);

export default AttentePage;
