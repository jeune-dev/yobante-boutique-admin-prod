import Icon from '@/shared/components/dashboard/Icon';
import { useRetour } from '@/shared/hooks/useRetour';

interface AdminBackButtonProps {
  /** Page parente logique, utilisée quand on n'arrive pas d'une page du dashboard. */
  parent: string;
  label?: string;
  className?: string;
}

/**
 * Bouton « Retour » du dashboard : ramène à la page d'origine (liste filtrée,
 * sous-rayon…) ou, à défaut, à la page parente du module. Voir `useRetour`.
 *
 * Un formulaire modifié et non enregistré reste protégé : la navigation est
 * interceptée par `useConfirmationSortie` sur la page concernée.
 */
export default function AdminBackButton({ parent, label = 'Retour', className = '' }: AdminBackButtonProps) {
  const retour = useRetour(parent);

  return (
    <button
      type="button"
      onClick={retour}
      className={`inline-flex items-center gap-1.5 min-h-[40px] -ml-1.5 px-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 transition-colors shrink-0 ${className}`}
    >
      <Icon name="chevron-left" size={18} />
      {label}
    </button>
  );
}
