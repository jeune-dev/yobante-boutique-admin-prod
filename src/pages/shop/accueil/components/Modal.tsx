import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/shared/components/dashboard/Icon';

interface Props {
  titre: string;
  sousTitre?: string;
  onFermer: () => void;
  children: React.ReactNode;
  /** Pied de fenêtre : boutons d'action. */
  actions?: React.ReactNode;
  largeur?: 'sm' | 'md' | 'lg';
}

const LARGEURS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

/**
 * Fenêtre modale du dashboard.
 *
 * Rendue dans un portail : une modale imbriquée dans une carte héritait de son
 * `overflow` et se retrouvait rognée. Le contenu défile de lui-même quand il
 * dépasse, tandis que l'en-tête et le pied restent visibles — sans quoi les
 * boutons d'action sortaient de l'écran sur les formulaires longs.
 */
export default function Modal({
  titre,
  sousTitre,
  onFermer,
  children,
  actions,
  largeur = 'sm',
}: Props) {
  // Échap ferme la fenêtre, et le fond ne défile pas derrière elle.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer();
    };
    document.addEventListener('keydown', surTouche);
    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = overflowInitial;
    };
  }, [onFermer]);

  return createPortal(
    <div
      className="modal-overlay"
      // Le clic sur le fond ferme, mais pas celui sur la fenêtre elle-même.
      onClick={(e) => e.target === e.currentTarget && onFermer()}
      role="dialog"
      aria-modal="true"
      aria-label={titre}
    >
      <div
        className={`modal-box flex max-h-[90vh] flex-col overflow-hidden ${LARGEURS[largeur]}`}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-gray-900">{titre}</h3>
            {sousTitre && <p className="text-xs text-gray-500 mt-0.5">{sousTitre}</p>}
          </div>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="btn-icon -m-1.5 shrink-0 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>

        {actions && (
          <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/** Boutons réutilisés dans les pieds de modale. */
export function BoutonSecondaire({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
    >
      {children}
    </button>
  );
}

export function BoutonPrincipal({
  children,
  onClick,
  disabled,
  ton = 'sombre',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ton?: 'sombre' | 'or';
}) {
  const couleurs =
    ton === 'or'
      ? 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'
      : 'bg-gray-900 hover:bg-gray-800 text-white';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${couleurs}`}
    >
      {children}
    </button>
  );
}

/** Champ de formulaire, mis en forme de façon homogène. */
export function Champ({
  label,
  valeur,
  onChange,
  placeholder,
  type = 'text',
  aide,
  lignes,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  aide?: string;
  lignes?: number;
}) {
  const classes = 'champ w-full';

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {lignes ? (
        <textarea
          rows={lignes}
          value={valeur}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={classes}
        />
      ) : (
        <input
          type={type}
          value={valeur}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={classes}
        />
      )}
      {aide && <p className="text-xs text-gray-400 mt-1">{aide}</p>}
    </div>
  );
}
