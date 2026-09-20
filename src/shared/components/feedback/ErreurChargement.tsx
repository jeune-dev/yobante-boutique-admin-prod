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
    <div className={`p-8 text-center ${className}`} role="alert">
      <Icon name="alert-triangle" size={26} className="mx-auto text-red-400" />
      <p className="mt-3 text-sm font-semibold text-gray-900">{messageDe(erreur, defaut)}</p>
      {onReessayer && (
        <button
          type="button"
          onClick={onReessayer}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800"
        >
          <Icon name="refresh-cw" size={14} /> Réessayer
        </button>
      )}
    </div>
  );
}
