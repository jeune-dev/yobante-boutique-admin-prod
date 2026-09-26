import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { useAuthStore } from '@/auth/store/auth.store';
import { showConfirm } from '@/shared/utils/alert';

/**
 * Protège un formulaire contre la perte silencieuse de sa saisie.
 *
 * Tant que `modifie` est vrai, toute sortie de la page — bouton Retour,
 * Annuler, menu, bouton Précédent du navigateur — demande confirmation.
 * Recharger ou fermer l'onglet déclenche l'avertissement natif du navigateur.
 *
 * Exceptions volontaires :
 *  - après un enregistrement réussi, appeler `autoriserSortie()` avant de
 *    naviguer ;
 *  - une session fermée (déconnexion, session expirée) n'est jamais retenue :
 *    la redirection vers la connexion doit toujours aboutir.
 */
export function useConfirmationSortie(modifie: boolean) {
  const sortieAutorisee = useRef(false);
  const dialogueOuvert = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      modifie &&
      !sortieAutorisee.current &&
      useAuthStore.getState().isAuthenticated &&
      currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state !== 'blocked' || dialogueOuvert.current) return;
    dialogueOuvert.current = true;
    showConfirm({
      titre: 'Modifications non enregistrées',
      message: 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter cette page ?',
      confirmText: 'Quitter sans enregistrer',
      cancelText: "Continuer l'édition",
      danger: true,
    }).then((quitter) => {
      dialogueOuvert.current = false;
      if (quitter) blocker.proceed();
      else blocker.reset();
    });
  }, [blocker]);

  useEffect(() => {
    if (!modifie) return;
    const avertir = (e: BeforeUnloadEvent) => {
      if (sortieAutorisee.current || !useAuthStore.getState().isAuthenticated) return;
      e.preventDefault();
      // Requis par les navigateurs basés sur Chromium pour afficher l'alerte.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, [modifie]);

  return {
    /** À appeler juste avant une navigation voulue (enregistrement réussi). */
    autoriserSortie: () => {
      sortieAutorisee.current = true;
    },
  };
}
