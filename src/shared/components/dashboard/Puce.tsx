/**
 * Pastille de couleur dessinée en CSS.
 *
 * Les couleurs des pastilles (🟢 🟠 🔴 ⚫ 🟡) ont été demandées par la
 * boutique et restent la référence dans les constantes ; seul leur rendu
 * change. Un emoji se dessine différemment sous Windows, macOS et Android
 * (taille, relief, parfois un carré vide) : une pastille CSS est identique
 * partout et s'aligne sur le texte.
 */
const COULEURS: Record<string, string> = {
  '🟢': 'bg-green-500',
  '🟠': 'bg-orange-500',
  '🔴': 'bg-red-500',
  '🟡': 'bg-yellow-400',
  // Liseré clair : la pastille noire reste visible sur un badge sombre.
  '⚫': 'bg-gray-900 ring-1 ring-white/70',
};

export default function Puce({ valeur, className = '' }: { valeur?: string; className?: string }) {
  if (!valeur) return null;
  const couleur = COULEURS[valeur];
  if (!couleur) return <span aria-hidden="true">{valeur}</span>;
  return <span aria-hidden="true" className={`puce ${couleur} ${className}`} />;
}
