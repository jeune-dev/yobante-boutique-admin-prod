/**
 * Règles d'un mot de passe choisi par l'administrateur — les mêmes que le
 * backend (au moins 8 caractères, une majuscule, un chiffre). Renvoie le
 * message à afficher, ou null si le mot de passe est acceptable.
 */
export const erreurMotDePasse = (nouveau: string, confirmation: string, temporaire: string) => {
  if (nouveau.length < 8) return 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
  if (!/[A-Z]/.test(nouveau) || !/\d/.test(nouveau)) {
    return 'Le nouveau mot de passe doit contenir au moins une majuscule et un chiffre.';
  }
  if (nouveau === temporaire) {
    return 'Le nouveau mot de passe doit être différent du mot de passe temporaire.';
  }
  if (nouveau !== confirmation) return 'La confirmation ne correspond pas au nouveau mot de passe.';
  return null;
};
