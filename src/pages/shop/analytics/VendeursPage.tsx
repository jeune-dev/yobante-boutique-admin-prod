import { useMemo, useState } from 'react';
import Icon from '@/shared/components/dashboard/Icon';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import SelecteurPeriode from '@/shared/components/dashboard/SelecteurPeriode';
import {
  Bloc,
  BoutonActualiser,
  Chiffre,
  EntetePage,
  Squelette,
  Vide,
} from '@/shared/components/dashboard/Blocs';
import { useTableauVendeurs } from '@/domains/shop/hooks/useAnalytique';
import { useComptesVendeurs } from '@/domains/shop/hooks/useFinance';
import { useFiabiliteVendeurs } from '@/domains/shop/hooks/useIndicateurs';
import { bornesDepuisPeriode, decimal, fcfa, libelleBornes, nombre, pourcent } from '@/shared/utils/format';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';
import type { VendeurAnalytique } from '@/domains/shop/types/analytique';

type Tri = 'ca' | 'commandes' | 'annulation' | 'retour' | 'note' | 'score';

/** Une ligne du tableau : analytique + finance + fiabilité réunies. */
interface LigneVendeur extends VendeurAnalytique {
  commission: number;
  montantVendeur: number;
  resteDu: number;
  tauxCommission: number | null;
  tauxParDefaut: boolean;
  scoreFiabilite: number | null;
}

/**
 * Tableau de bord des vendeurs marketplace.
 *
 * Trois sources assemblées sur l'identifiant du vendeur : l'analytique
 * (volumes, taux, note), la finance (commission, montant dû) et la fiabilité
 * (incidents imputables). Les joindre côté serveur aurait demandé une requête
 * à six CTE dont la moindre évolution casse tout le reste.
 */
export default function VendeursAnalyticsPage() {
  const [periode, setPeriode] = useState<FiltrePeriode>({ periode: 'mois' });
  const [tri, setTri] = useState<Tri>('ca');
  const [actifsSeulement, setActifsSeulement] = useState(true);

  const bornes = bornesDepuisPeriode(periode);
  const vendeursQ = useTableauVendeurs(bornes);
  const comptesQ = useComptesVendeurs(bornes);
  const fiabiliteQ = useFiabiliteVendeurs({ limit: 200 });

  const lignes = useMemo<LigneVendeur[]>(() => {
    const vendeurs = vendeursQ.data?.vendeurs ?? [];
    const comptes = new Map((comptesQ.data?.comptes ?? []).map((c) => [c.vendeurId, c]));
    const scores = new Map(
      (fiabiliteQ.data?.vendeurs ?? []).map((f) => [f.id, f.scoreFiabilite])
    );

    const assemblees = vendeurs.map((v) => {
      const compte = comptes.get(v.id);
      return {
        ...v,
        commission: compte?.commission ?? 0,
        montantVendeur: compte?.montantVendeur ?? 0,
        resteDu: compte?.resteDu ?? 0,
        tauxCommission: compte?.tauxCommission ?? null,
        tauxParDefaut: compte?.tauxParDefaut ?? true,
        scoreFiabilite: scores.get(v.id) ?? null,
      };
    });

    // Un vendeur sans commande sur la période n'a aucun taux mesurable : le
    // garder en tête de liste avec des 0 % partout noierait les vrais écarts.
    const filtrees = actifsSeulement ? assemblees.filter((v) => v.commandes > 0) : assemblees;

    const CLES: Record<Tri, (v: LigneVendeur) => number> = {
      ca: (v) => v.chiffreAffaires,
      commandes: (v) => v.commandes,
      annulation: (v) => v.tauxAnnulation,
      retour: (v) => v.tauxRetour,
      note: (v) => v.noteClient ?? -1,
      score: (v) => v.scoreFiabilite ?? -1,
    };
    return [...filtrees].sort((a, b) => CLES[tri](b) - CLES[tri](a));
  }, [vendeursQ.data, comptesQ.data, fiabiliteQ.data, tri, actifsSeulement]);

  if (vendeursQ.isLoading) return <Squelette tuiles={4} />;

  if (vendeursQ.isError) {
    return (
      <Bloc>
        <ErreurChargement
          erreur={vendeursQ.error}
          onReessayer={vendeursQ.refetch}
          defaut="Impossible de charger le tableau des vendeurs."
        />
      </Bloc>
    );
  }

  const totaux = lignes.reduce(
    (s, v) => ({
      ca: s.ca + v.chiffreAffaires,
      commission: s.commission + v.commission,
      resteDu: s.resteDu + v.resteDu,
      commandes: s.commandes + v.commandes,
    }),
    { ca: 0, commission: 0, resteDu: 0, commandes: 0 }
  );

  const rafraichir = () => {
    vendeursQ.refetch();
    comptesQ.refetch();
    fiabiliteQ.refetch();
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Tableau de bord des vendeurs"
        soustitre={`${nombre(lignes.length)} vendeur(s) · ${libelleBornes(vendeursQ.data!.periode)}`}
      >
        <SelecteurPeriode valeur={periode} onChange={setPeriode} />
        <BoutonActualiser
          onClick={rafraichir}
          enCours={vendeursQ.isFetching || comptesQ.isFetching}
        />
      </EntetePage>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <Chiffre libelle="CA marketplace" valeur={fcfa(totaux.ca)} aide="Somme des vendeurs affichés" />
        <Chiffre libelle="Commission générée" valeur={fcfa(totaux.commission)} ton="bon" />
        <Chiffre
          libelle="Reste à reverser"
          valeur={fcfa(totaux.resteDu)}
          ton={totaux.resteDu > 0 ? 'attention' : 'neutre'}
          aide="Dû − déjà versé − versements en attente"
        />
        <Chiffre libelle="Commandes" valeur={nombre(totaux.commandes)} />
      </div>

      <Bloc className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Trier par</span>
          <div className="inline-flex flex-wrap rounded-lg border border-gray-200 overflow-hidden">
            {(
              [
                ['ca', 'CA'],
                ['commandes', 'Commandes'],
                ['annulation', 'Annulation'],
                ['retour', 'Retour'],
                ['note', 'Note'],
                ['score', 'Score'],
              ] as Array<[Tri, string]>
            ).map(([cle, libelle]) => (
              <button
                key={cle}
                type="button"
                onClick={() => setTri(cle)}
                aria-pressed={tri === cle}
                className={`px-2.5 py-1.5 text-xs font-medium border-r border-gray-200 last:border-r-0 transition-colors ${
                  tri === cle ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {libelle}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={actifsSeulement}
              onChange={(e) => setActifsSeulement(e.target.checked)}
              className="rounded border-gray-300"
            />
            Masquer les vendeurs sans commande
          </label>
        </div>
      </Bloc>

      <Bloc>
        {lignes.length === 0 ? (
          <Vide
            texte={
              actifsSeulement
                ? 'Aucun vendeur n’a reçu de commande sur cette période.'
                : 'Aucun vendeur enregistré.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="px-3 sm:px-4 py-2.5 font-medium">Vendeur</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">CA</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Cdes</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Panier</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Produits</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Accept.</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Annul.</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Retour</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Note</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Score</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Commission</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">À reverser</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lignes.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50/60">
                    <td className="px-3 sm:px-4 py-2.5 min-w-[160px]">
                      <p className="font-medium text-gray-900 truncate">
                        {v.nomBoutique || `${v.prenom} ${v.nom}`}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{v.email}</p>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                      {fcfa(v.chiffreAffaires)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right text-gray-700 tabular-nums">
                      {nombre(v.commandes)}
                      <span className="block text-[11px] text-gray-400">
                        {nombre(v.commandesLivrees)} livrée(s)
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right text-gray-600 whitespace-nowrap tabular-nums">
                      {fcfa(v.panierMoyen)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right text-gray-600 tabular-nums">
                      {nombre(v.produitsActifs)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums">
                      <Taux valeur={v.tauxAcceptation} sensInverse />
                      {v.commandesSansReponse > 0 && (
                        <span
                          className="block text-[11px] text-orange-600"
                          title="Commandes soumises sans réponse du vendeur : elles pèsent dans le dénominateur"
                        >
                          {nombre(v.commandesSansReponse)} sans réponse
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums">
                      <Taux valeur={v.tauxAnnulation} seuilAttention={5} seuilCritique={10} />
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums">
                      <Taux valeur={v.tauxRetour} seuilAttention={5} seuilCritique={10} />
                      <span className="block text-[11px] text-gray-400">
                        {nombre(v.articlesRetournes)} art.
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums">
                      {v.noteClient === null ? (
                        <span className="text-gray-300" title="Aucun avis reçu">
                          —
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-800">
                          <Icon name="star" size={12} className="text-yellow-500" />
                          {decimal(v.noteClient, 1)}
                          <span className="text-[11px] text-gray-400">({v.nombreAvis})</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right tabular-nums">
                      {v.scoreFiabilite === null ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <Taux valeur={v.scoreFiabilite} sensInverse unite="" />
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right text-gray-700 whitespace-nowrap tabular-nums">
                      {fcfa(v.commission)}
                      <span className="block text-[11px] text-gray-400">
                        {v.tauxCommission === null ? '—' : pourcent(v.tauxCommission, 2)}
                        {v.tauxParDefaut && ' (défaut)'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap tabular-nums">
                      <span
                        className={
                          v.resteDu > 0
                            ? 'font-semibold text-orange-700'
                            : v.resteDu < 0
                              ? 'text-blue-700'
                              : 'text-gray-400'
                        }
                        title={
                          v.resteDu < 0
                            ? 'Négatif : un versement a couvert une autre période'
                            : undefined
                        }
                      >
                        {fcfa(v.resteDu)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bloc>
    </div>
  );
}

/**
 * Taux coloré selon sa gravité. `sensInverse` pour les taux où élevé est bon
 * (acceptation, score) : sans lui, un vendeur exemplaire s'afficherait en rouge.
 */
function Taux({
  valeur,
  seuilAttention = 70,
  seuilCritique = 50,
  sensInverse = false,
  unite = ' %',
}: {
  valeur: number;
  seuilAttention?: number;
  seuilCritique?: number;
  sensInverse?: boolean;
  unite?: string;
}) {
  const mauvais = sensInverse ? valeur < seuilCritique : valeur >= seuilCritique;
  const moyen = sensInverse ? valeur < seuilAttention : valeur >= seuilAttention;
  const couleur = mauvais ? 'text-red-700 font-semibold' : moyen ? 'text-orange-700' : 'text-gray-700';
  return <span className={couleur}>{`${decimal(valeur, 1)}${unite}`}</span>;
}
