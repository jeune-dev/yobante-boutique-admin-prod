import type { KeyboardEvent, MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { etatRetour } from '@/shared/hooks/useRetour';

/** Éléments qui gardent leur propre action dans une ligne cliquable. */
const INTERACTIFS = 'a, button, input, select, textarea, label, [data-sans-ouverture]';

/**
 * Rend une ligne (de tableau ou de liste) cliquable dans son ensemble : un
 * clic n'importe où sur la ligne ouvre la fiche, sans chercher un bouton.
 * Les boutons, liens et champs de la ligne gardent leur propre action.
 * Accessible au clavier (Entrée). Le « Retour » de la fiche ramène ici.
 *
 * Usage : `const ouvrir = useOuvrirLigne();` puis `<tr {...ouvrir(chemin)}>`.
 */
export function useOuvrirLigne() {
  const navigate = useNavigate();
  const location = useLocation();

  return (chemin?: string | null) => {
    if (!chemin) return {};
    const aller = () => navigate(chemin, { state: etatRetour(location) });
    return {
      role: 'link',
      tabIndex: 0,
      'data-ligne-cliquable': '',
      onClick: (e: MouseEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).closest(INTERACTIFS)) return;
        // Une sélection de texte n'est pas un clic d'ouverture.
        if (window.getSelection()?.toString()) return;
        aller();
      },
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) aller();
      },
    };
  };
}
