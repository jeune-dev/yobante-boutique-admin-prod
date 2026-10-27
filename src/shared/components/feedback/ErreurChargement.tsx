import Icon from '@/shared/components/dashboard/Icon';

interface Props {
  /** Erreur rejetée par le client HTTP ({ status, message }) ou texte. */
  erreur?: unknown;
  /** Relance la requête (bouton « Réessayer »). */
  onReessayer?: () => void;
  /** Texte de repli si l'erreur n'apporte aucun message. */
  defaut?: string;
  className?: string;
}

const messageDe = (erreur: unknown, defaut: string) => {
  if (typeof erreur === 'string' && erreur.trim()) return erreur;
  const m = (erreur as { message?: unknown } | null)?.message;
  return typeof m === 'string' && m.trim() ? m : defaut;
};

/**
 * État d'erreur d'une liste ou d'une page : le message renvoyé par le
 * backend (jamais le détail technique), et une action pour réessayer.
 * Une requête en échec affichait auparavant « Aucun résultat », ce qui
 * laissait croire à une liste vide.
 */
export default function ErreurChargement({
  erreur,
  onReessayer,
  defaut = 'Impossible de charger les données.',
  className = '',
}: Props) {
  return (
    <div className={`etat-vide ${className}`} role="alert">
      <span className="etat-vide-icone bg-red-50 text-red-500">
        <Icon name="alert-triangle" size={20} />
      </span>
      <p className="text-sm font-semibold text-gray-900">{messageDe(erreur, defaut)}</p>
      {onReessayer && (
        <button type="button" onClick={onReessayer} className="btn-sombre mt-4">
          <Icon name="refresh-cw" size={14} /> Réessayer
        </button>
      )}
    </div>
  );
}
