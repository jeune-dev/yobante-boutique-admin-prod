import { useState, type ReactNode } from 'react';
import { exporterExcel, type ColonneExport } from '@/shared/utils/exportExcel';
import type { ToutesLesLignes } from '@/shared/hooks/useListeFiltree';
import { LIMITE_LIGNES } from '@/shared/hooks/useListeFiltree';
import { showError, showSuccess, showWarning } from '@/shared/utils/alert';

const CHAMP = 'champ w-full';

/**
 * En-tête de liste : recherche, bouton « Filtres » (avec le nombre de filtres
 * actifs), export Excel, puis le panneau des filtres avancés, replié par
 * défaut sauf si un filtre est déjà actif (lien partagé, retour de fiche).
 */
export function BarreFiltres({
  recherche,
  actions,
  nbActifs,
  onReinitialiser,
  children,
}: {
  recherche?: ReactNode;
  actions?: ReactNode;
  nbActifs: number;
  onReinitialiser: () => void;
  children: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(nbActifs > 0);

  return (
    <div className="border-b border-gray-100">
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
        {recherche}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={() => setOuvert((o) => !o)}
            aria-expanded={ouvert}
            className={
              nbActifs > 0
                ? 'btn border-yellow-300 bg-yellow-50 text-yellow-900 shadow-xs hover:bg-yellow-100 focus-visible:ring-yellow-300'
                : `btn-secondaire ${ouvert ? 'bg-gray-50' : ''}`
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4z" />
            </svg>
            Filtres
            {nbActifs > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-yellow-400 px-1 text-xs font-bold text-gray-900">
                {nbActifs}
              </span>
            )}
          </button>
          {nbActifs > 0 && (
            <button
              type="button"
              onClick={onReinitialiser}
              className="btn-fantome"
            >
              Réinitialiser
            </button>
          )}
          {actions}
        </div>
      </div>
      {ouvert && (
        <div className="grid animate-apparition grid-cols-1 gap-x-4 gap-y-3 border-t border-gray-100 bg-gray-50/60 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
          {children}
        </div>
      )}
    </div>
  );
}

export function ChampFiltre({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-600">{libelle}</span>
      {children}
    </label>
  );
}

export function FiltreSelect({
  libelle,
  valeur,
  onChange,
  options,
  tous = 'Tous',
}: {
  libelle: string;
  valeur: string;
  onChange: (v: string) => void;
  options: readonly { valeur: string; libelle: string }[];
  tous?: string;
}) {
  return (
    <ChampFiltre libelle={libelle}>
      <select value={valeur} onChange={(e) => onChange(e.target.value)} className={CHAMP}>
        <option value="">{tous}</option>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
    </ChampFiltre>
  );
}

/** Deux dates (AAAA-MM-JJ), bornes incluses. */
export function FiltrePeriode({
  libelle,
  du,
  au,
  onChange,
}: {
  libelle: string;
  du: string;
  au: string;
  onChange: (du: string, au: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-medium text-gray-600">{libelle}</legend>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={du}
          max={au || undefined}
          onChange={(e) => onChange(e.target.value, au)}
          aria-label={`${libelle} : du`}
          className={CHAMP}
        />
        <span className="text-xs text-gray-400">au</span>
        <input
          type="date"
          value={au}
          min={du || undefined}
          onChange={(e) => onChange(du, e.target.value)}
          aria-label={`${libelle} : au`}
          className={CHAMP}
        />
      </div>
    </fieldset>
  );
}

/** Bornes numériques min / max, incluses. */
export function FiltreIntervalle({
  libelle,
  min,
  max,
  onChange,
}: {
  libelle: string;
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-medium text-gray-600">{libelle}</legend>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={min}
          onChange={(e) => onChange(e.target.value, max)}
          placeholder="Min"
          aria-label={`${libelle} : minimum`}
          className={CHAMP}
        />
        <span className="text-xs text-gray-400">à</span>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={max}
          onChange={(e) => onChange(min, e.target.value)}
          placeholder="Max"
          aria-label={`${libelle} : maximum`}
          className={CHAMP}
        />
      </div>
    </fieldset>
  );
}

/**
 * Export Excel de la liste filtrée.
 *
 * Exporte toutes les lignes répondant aux filtres (toutes les pages, pas
 * seulement celle affichée), dans un fichier `<nom>_AAAA-MM-JJ_HHhMM.xlsx`.
 * Bouton inactif pendant la génération ; aucun fichier vide n'est produit.
 */
export function BoutonExportExcel<T>({
  charger,
  nomFichier,
  colonnes,
  filtres,
}: {
  charger: () => Promise<ToutesLesLignes<T>>;
  nomFichier: string;
  colonnes: ColonneExport<T>[];
  filtres: Record<string, string | undefined>;
}) {
  const [enCours, setEnCours] = useState(false);

  const exporter = async () => {
    setEnCours(true);
    try {
      const { lignes, tronque } = await charger();
      if (!lignes.length) {
        showWarning('Aucune donnée ne correspond aux filtres : rien à exporter.');
        return;
      }
      await exporterExcel({ nomFichier, lignes, colonnes, filtres });
      if (tronque) {
        showWarning(
          `Export limité aux ${LIMITE_LIGNES.toLocaleString('fr-FR')} premières lignes. Affinez les filtres pour tout exporter.`
        );
      } else {
        showSuccess(`${lignes.length.toLocaleString('fr-FR')} ligne(s) exportée(s).`);
      }
    } catch (e) {
      showError(e, "L'export Excel a échoué. Réessayez.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <button
      type="button"
      onClick={exporter}
      disabled={enCours}
      className="btn-succes"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v11m0 0-4-4m4 4 4-4M4 19h16" />
      </svg>
      {enCours ? 'Export…' : 'Exporter Excel'}
    </button>
  );
}
