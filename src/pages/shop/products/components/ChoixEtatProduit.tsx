import { ETATS_PRODUIT, LIBELLE_ETAT_PRODUIT, type EtatProduit } from '@/domains/shop/etatProduit';

/**
 * État du produit (création et modification) : case à cocher puis liste.
 * Case décochée : état non précisé, aucun badge dans l'application.
 */
export default function ChoixEtatProduit({
  avecEtat,
  onAvecEtat,
  etat,
  onEtat,
}: {
  avecEtat: boolean;
  onAvecEtat: (v: boolean) => void;
  etat: EtatProduit;
  onEtat: (v: EtatProduit) => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={avecEtat}
          onChange={(e) => onAvecEtat(e.target.checked)}
          className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-300"
        />
        Préciser l'état du produit (neuf / reconditionné / en l'état)
      </label>
      {avecEtat && (
        <>
          <select
            value={etat}
            onChange={(e) => onEtat(e.target.value as EtatProduit)}
            aria-label="État du produit"
            className="champ mt-2 w-full"
          >
            {ETATS_PRODUIT.map((e) => (
              <option key={e} value={e}>
                {LIBELLE_ETAT_PRODUIT[e]}
              </option>
            ))}
          </select>
          {etat === 'en_etat' && (
            <p className="mt-1 text-xs text-gray-500">
              « En l'état » : produit d'occasion vendu tel quel, sans remise à neuf ni garantie de
              reconditionnement. Décrivez son état réel dans la description.
            </p>
          )}
        </>
      )}
    </div>
  );
}
