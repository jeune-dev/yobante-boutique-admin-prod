import { useNavigate } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';

interface AdminBackButtonProps {
  label?: string;
  className?: string;
}

/**
 * Bouton de navigation "Retour" réutilisable pour l'administration.
 * Tente de revenir à la page précédente dans l'historique,
 * sinon fallback vers la navigation.
 */
export default function AdminBackButton({
  label = 'Retour',
  className = '',
}: AdminBackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    // Si l'historique permet de reculer, on le fait.
    // Sinon, on pourrait ici implémenter une logique de fallback
    // plus complexe si besoin, mais `navigate(-1)` est le comportement standard.
    navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors ${className}`}
      aria-label={label}
    >
      <Icon name="chevron-left" size={18} />
      {label}
    </button>
  );
}
