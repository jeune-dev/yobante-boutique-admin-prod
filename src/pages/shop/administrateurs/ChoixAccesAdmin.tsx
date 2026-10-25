import { PAGES_ADMIN, accesComplet } from '@/shared/accesAdmin';

interface Props {
  /** Accès complet (toutes les pages, présentes et futures). */
  complet: boolean;
  pages: string[];
  onChange: (valeur: { complet: boolean; pages: string[] }) => void;
  /** Accès de l'administrateur connecté : on ne donne que ce qu'on a. */
  accesAuteur?: string[] | null;
  /** Lecture seule (ses propres accès). */
  desactive?: boolean;
}

const GROUPES = [...new Set(PAGES_ADMIN.map((p) => p.groupe))];

/**
 * Choix des pages du dashboard accessibles à un administrateur, regroupées
 * comme dans la barre de navigation. Les pages que l'auteur n'a pas lui-même
 * sont grisées : le backend refuserait de les attribuer.
 */
export default function ChoixAccesAdmin({ complet, pages, onChange, accesAuteur, desactive }: Props) {
  const auteurComplet = accesComplet(accesAuteur);
  const autorisee = (cle: string) => auteurComplet || (accesAuteur ?? []).includes(cle);
  const basculer = (cle: string) =>
    onChange({
      complet: false,
      pages: pages.includes(cle) ? pages.filter((p) => p !== cle) : [...pages, cle],
    });
  const basculerGroupe = (groupe: string) => {
    const cles = PAGES_ADMIN.filter((p) => p.groupe === groupe && autorisee(p.cle)).map((p) => p.cle);
    const toutes = cles.every((c) => pages.includes(c));
    onChange({
      complet: false,
      pages: toutes ? pages.filter((p) => !cles.includes(p)) : [...new Set([...pages, ...cles])],
    });
  };

  return (
    <fieldset disabled={desactive} className="space-y-3">
      <label
        className={`flex items-start gap-2.5 rounded-lg border p-3 ${
          complet ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
        } ${auteurComplet ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
      >
        <input
          type="checkbox"
          checked={complet}
          disabled={!auteurComplet || desactive}
          onChange={(e) => onChange({ complet: e.target.checked, pages })}
          className="mt-0.5 w-4 h-4 accent-yellow-500"
        />
        <span>
          <span className="block text-sm font-medium text-gray-900">Accès complet</span>
          <span className="block text-xs text-gray-500">
            Toutes les pages, y compris celles ajoutées plus tard, et la gestion des administrateurs.
            {!auteurComplet && ' Réservé aux administrateurs ayant eux-mêmes l’accès complet.'}
          </span>
        </span>
      </label>

      {!complet && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GROUPES.map((groupe) => {
            const liste = PAGES_ADMIN.filter((p) => p.groupe === groupe);
            return (
              <div key={groupe} className="rounded-lg border border-gray-100 p-3">
                <button
                  type="button"
                  onClick={() => basculerGroupe(groupe)}
                  className="text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-700 mb-1.5"
                  title="Tout cocher / décocher"
                >
                  {groupe}
                </button>
                <div className="space-y-1">
                  {liste.map((p) => {
                    const ok = autorisee(p.cle);
                    return (
                      <label
                        key={p.cle}
                        className={`flex items-center gap-2 text-sm ${
                          ok ? 'text-gray-800 cursor-pointer' : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={ok ? undefined : 'Vous n’avez pas accès à cette page'}
                      >
                        <input
                          type="checkbox"
                          checked={pages.includes(p.cle)}
                          disabled={!ok || desactive}
                          onChange={() => basculer(p.cle)}
                          className="w-4 h-4 accent-yellow-500"
                        />
                        {p.libelle}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
