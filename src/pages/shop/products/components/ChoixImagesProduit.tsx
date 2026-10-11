import { useEffect, useMemo, useRef, useState } from 'react';
import { showError } from '@/shared/utils/alert';

/** Limites du backend (config/security.js et route admin/produits). */
export const MAX_IMAGES_PRODUIT = 5;
const TAILLE_MAX = 5 * 1024 * 1024;
const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp'];

interface Props {
  fichiers: File[];
  onChange: (fichiers: File[]) => void;
  /** Photos déjà enregistrées (modification) : remplacées si on en choisit de nouvelles. */
  imagesActuelles?: string[];
}

/**
 * Choix des photos d'un produit : aperçus, ajout en plusieurs fois (le champ
 * fichier natif remplaçait la sélection précédente), retrait d'une photo,
 * choix de la photo principale (la première, affichée sur la carte produit)
 * et glisser-déposer.
 */
export default function ChoixImagesProduit({ fichiers, onChange, imagesActuelles = [] }: Props) {
  const champ = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);

  // Aperçus locaux, libérés quand la sélection change ou que l'écran se ferme.
  const apercus = useMemo(() => fichiers.map((f) => URL.createObjectURL(f)), [fichiers]);
  useEffect(() => () => apercus.forEach((u) => URL.revokeObjectURL(u)), [apercus]);

  const ajouter = (liste: FileList | File[] | null) => {
    if (!liste) return;
    const refuses: string[] = [];
    const valides = Array.from(liste).filter((f) => {
      if (!TYPES_ACCEPTES.includes(f.type)) {
        refuses.push(`${f.name} : format non accepté (JPEG, PNG ou WEBP)`);
        return false;
      }
      if (f.size > TAILLE_MAX) {
        refuses.push(`${f.name} : plus de 5 Mo`);
        return false;
      }
      return true;
    });
    const place = MAX_IMAGES_PRODUIT - fichiers.length;
    if (valides.length > place) {
      refuses.push(`${MAX_IMAGES_PRODUIT} photos maximum par produit`);
    }
    if (refuses.length) showError(refuses.join('\n'));
    if (place > 0 && valides.length) onChange([...fichiers, ...valides.slice(0, place)]);
  };

  const retirer = (i: number) => onChange(fichiers.filter((_, j) => j !== i));
  const rendrePrincipale = (i: number) =>
    onChange([fichiers[i], ...fichiers.filter((_, j) => j !== i)]);

  const complet = fichiers.length >= MAX_IMAGES_PRODUIT;

  return (
    <div>
      {imagesActuelles.length > 0 && (
        <div className="mt-1 mb-3">
          <p className="text-xs text-gray-500 mb-1.5">
            {fichiers.length
              ? 'Photos actuelles — elles seront remplacées par celles ci-dessous :'
              : 'Photos actuelles (gardées si vous n’en ajoutez pas) :'}
          </p>
          <div className={`flex flex-wrap gap-2 ${fichiers.length ? 'opacity-40' : ''}`}>
            {imagesActuelles.map((url, i) => (
              <img
                key={url + i}
                src={url}
                alt=""
                className="w-16 h-16 rounded-lg object-contain bg-white border border-gray-100"
              />
            ))}
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!complet) setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          ajouter(e.dataTransfer.files);
        }}
        className={`mt-1 grid grid-cols-3 sm:grid-cols-5 gap-3 rounded-xl border-2 border-dashed p-3 transition-colors ${
          survol ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
        }`}
      >
        {fichiers.map((f, i) => (
          <div
            key={`${f.name}-${f.size}-${f.lastModified}`}
            className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 bg-white group"
          >
            <img src={apercus[i]} alt={f.name} className="w-full h-full object-contain p-1.5" />
            {i === 0 ? (
              <span className="absolute bottom-1 left-1 text-[10px] font-semibold bg-yellow-500 text-white rounded px-1.5 py-0.5">
                Principale
              </span>
            ) : (
              <button
                type="button"
                onClick={() => rendrePrincipale(i)}
                className="absolute bottom-1 left-1 text-[10px] font-medium bg-white/90 text-gray-700 rounded px-1.5 py-0.5 hover:bg-white"
                title="Afficher cette photo en premier"
              >
                Principale ?
              </button>
            )}
            <button
              type="button"
              onClick={() => retirer(i)}
              aria-label={`Retirer ${f.name}`}
              title="Retirer cette photo"
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-gray-900/70 text-white text-sm leading-none flex items-center justify-center hover:bg-red-600"
            >
              ×
            </button>
          </div>
        ))}

        {!complet && (
          <button
            type="button"
            onClick={() => champ.current?.click()}
            className="aspect-square rounded-lg border border-gray-200 bg-white hover:bg-yellow-50 hover:border-yellow-300 flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-[11px] font-medium text-center px-1">
              {fichiers.length ? 'Ajouter' : 'Ajouter des photos'}
            </span>
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-1.5">
        {fichiers.length}/{MAX_IMAGES_PRODUIT} photo{fichiers.length > 1 ? 's' : ''} · JPEG, PNG ou
        WEBP, 5 Mo max · glissez-déposez ou cliquez sur « Ajouter ». La photo principale est celle
        affichée dans l’application.
      </p>

      <input
        ref={champ}
        type="file"
        accept={TYPES_ACCEPTES.join(',')}
        multiple
        className="hidden"
        onChange={(e) => {
          ajouter(e.target.files);
          // Permet de rechoisir le même fichier après l'avoir retiré.
          e.target.value = '';
        }}
      />
    </div>
  );
}
