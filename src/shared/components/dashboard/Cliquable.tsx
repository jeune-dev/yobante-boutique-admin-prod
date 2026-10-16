import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { etatRetour } from '@/shared/hooks/useRetour';

/**
 * Enveloppe un indicateur : avec `vers`, il devient un lien vers la page qui
 * détaille ce qu'il compte (liste filtrée, fiche…). Sans `vers`, rien ne change.
 */
export default function Cliquable({
  vers,
  className = '',
  titre,
  survol = 'hover:border-gray-300 hover:bg-white hover:shadow-sm',
  children,
}: {
  vers?: string;
  /** Classes de survol ; à remplacer pour les cartes colorées. */
  survol?: string;
  className?: string;
  titre?: string;
  children: ReactNode;
}) {
  const location = useLocation();
  if (!vers) {
    return (
      <div className={className} title={titre}>
        {children}
      </div>
    );
  }
  return (
    <Link
      to={vers}
      state={etatRetour(location)}
      title={titre ? `${titre} — voir le détail` : 'Voir le détail'}
      className={`${className} block group transition ${survol} focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300`}
    >
      {children}
    </Link>
  );
}
