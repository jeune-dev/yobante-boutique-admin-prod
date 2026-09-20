import Icon from '@/shared/components/dashboard/Icon';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** Numéros affichés autour de la page courante (fenêtre glissante). */
function fenetre(page: number, total: number, taille = 5): number[] {
  const demi = Math.floor(taille / 2);
  let debut = Math.max(1, page - demi);
  const fin = Math.min(total, debut + taille - 1);
  debut = Math.max(1, fin - taille + 1);
  return Array.from({ length: fin - debut + 1 }, (_, i) => debut + i);
}

/**
 * Pagination compacte : précédent / suivant, une fenêtre de numéros et le
 * total. Une liste de toutes les pages débordait dès quelques dizaines de
 * pages, surtout sur téléphone.
 */
export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  const pages = fenetre(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-center gap-1.5 p-3 sm:p-4 border-t border-gray-100"
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Page précédente"
        className="pagination-btn"
      >
        <Icon name="chevron-left" size={16} />
      </button>

      {pages[0] > 1 && (
        <>
          <button type="button" onClick={() => onChange(1)} className="pagination-btn">
            1
          </button>
          {pages[0] > 2 && <span className="px-1 text-gray-400">…</span>}
        </>
      )}

      {pages.map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          aria-current={n === page ? 'page' : undefined}
          className={`pagination-btn${n === page ? ' active' : ''}`}
        >
          {n}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="px-1 text-gray-400">…</span>
          )}
          <button type="button" onClick={() => onChange(totalPages)} className="pagination-btn">
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Page suivante"
        className="pagination-btn"
      >
        <Icon name="chevron-right" size={16} />
      </button>

      <span className="basis-full sm:basis-auto text-center text-xs text-gray-400 sm:ml-2">
        Page {page} / {totalPages}
      </span>
    </nav>
  );
}
