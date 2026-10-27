import { useState } from 'react';
import { LIBELLE_PERIODE, type FiltrePeriode, type TypePeriode } from '@/domains/shop/types/indicateurs';

interface Props {
  valeur: FiltrePeriode;
  onChange: (valeur: FiltrePeriode) => void;
  /** Masque l'option « Tout » là où un total historique n'a pas de sens. */
  sansTout?: boolean;
}

const RACCOURCIS: TypePeriode[] = ['jour', 'semaine', 'mois', 'annee', 'tout'];

/**
 * Filtre de période des indicateurs : raccourcis courants, plus deux dates
 * libres. La borne de fin est inclusive côté backend — saisir le 31/03 compte
 * bien les commandes du 31/03 au soir.
 */
export default function SelecteurPeriode({ valeur, onChange, sansTout = false }: Props) {
  const [ouvertPerso, setOuvertPerso] = useState(valeur.periode === 'personnalise');
  const actuelle = valeur.periode ?? 'mois';

  const choisir = (periode: TypePeriode) => {
    setOuvertPerso(false);
    onChange({ periode });
  };

  const majDate = (champ: 'debut' | 'fin', date: string) =>
    onChange({ ...valeur, periode: 'personnalise', [champ]: date || undefined });

  return (
    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0">
      {/* Sur mobile, les raccourcis passent sur deux lignes de trois au lieu
          de déborder de l'écran. */}
      <div className="segments grid w-full grid-cols-3 sm:inline-flex sm:w-auto">
        {RACCOURCIS.filter((p) => !(sansTout && p === 'tout')).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => choisir(p)}
            aria-pressed={actuelle === p}
            className="segment text-center"
          >
            {LIBELLE_PERIODE[p as Exclude<TypePeriode, 'personnalise'>]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOuvertPerso((o) => !o)}
          aria-pressed={actuelle === 'personnalise'}
          className="segment text-center"
        >
          Dates…
        </button>
      </div>

      {ouvertPerso && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm min-w-0">
          <input
            type="date"
            value={valeur.debut ?? ''}
            onChange={(e) => majDate('debut', e.target.value)}
            aria-label="Date de début"
            className="champ py-1.5"
          />
          <span className="text-gray-400">au</span>
          <input
            type="date"
            value={valeur.fin ?? ''}
            onChange={(e) => majDate('fin', e.target.value)}
            aria-label="Date de fin"
            className="champ py-1.5"
          />
        </div>
      )}
    </div>
  );
}
