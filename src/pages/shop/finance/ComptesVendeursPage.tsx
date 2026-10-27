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
import { showError, showSuccess } from '@/shared/utils/alert';
import {
  useComptesVendeurs,
  useCreerReversement,
  useDefinirTauxCommission,
} from '@/domains/shop/hooks/useFinance';
import { bornesDepuisPeriode, fcfa, libelleBornes, nombre, pourcent } from '@/shared/utils/format';
import { METHODES_REVERSEMENT, type CompteVendeur } from '@/domains/shop/types/finance';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';

/**
 * Comptes vendeurs : commission prélevée et montant restant dû.
 *
 * Le compte de chaque vendeur est généré automatiquement — il n'y a rien à
 * créer. Le solde se recalcule à la lecture depuis les ventes livrées, moins
 * la commission, moins ce qui a déjà été reversé.
 *
 * Attention à l'asymétrie voulue : les ventes sont bornées par la période
 * choisie, les versements déjà payés sont déduits **sans borne**. Un versement
 * de janvier solde des ventes de décembre ; le filtrer ferait réapparaître une
 * dette déjà payée.
 */
export default function ComptesVendeursPage() {
  const [periode, setPeriode] = useState<FiltrePeriode>({ periode: 'mois' });
  const [duSeulement, setDuSeulement] = useState(false);
  const [edition, setEdition] = useState<CompteVendeur | null>(null);
  const [versement, setVersement] = useState<CompteVendeur | null>(null);

  const bornes = bornesDepuisPeriode(periode);
  const { data, isLoading, isError, error, refetch, isFetching } = useComptesVendeurs(bornes);

  const comptes = useMemo(() => {
    const liste = data?.comptes ?? [];
    return duSeulement ? liste.filter((c) => c.resteDu > 0) : liste;
  }, [data, duSeulement]);

  if (isLoading) return <Squelette tuiles={4} />;

  if (isError) {
    return (
      <Bloc>
        <ErreurChargement
          erreur={error}
          onReessayer={refetch}
          defaut="Impossible de charger les comptes vendeurs."
        />
      </Bloc>
    );
  }

  const totaux = comptes.reduce(
    (s, c) => ({
      ca: s.ca + c.chiffreAffaires,
      commission: s.commission + c.commission,
      du: s.du + c.montantVendeur,
      reste: s.reste + c.resteDu,
    }),
    { ca: 0, commission: 0, du: 0, reste: 0 }
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Commissions et comptes vendeurs"
        soustitre={`${nombre(comptes.length)} compte(s) · ventes sur ${libelleBornes(data!.periode)}`}
      >
        <SelecteurPeriode valeur={periode} onChange={setPeriode} />
        <BoutonActualiser onClick={() => refetch()} enCours={isFetching} />
      </EntetePage>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <Chiffre libelle="CA marketplace" valeur={fcfa(totaux.ca)} />
        <Chiffre libelle="Commission" valeur={fcfa(totaux.commission)} ton="bon" />
        <Chiffre libelle="Dû aux vendeurs" valeur={fcfa(totaux.du)} aide="Sur la période choisie" />
        <Chiffre
          libelle="Reste à reverser"
          valeur={fcfa(totaux.reste)}
          ton={totaux.reste > 0 ? 'attention' : 'neutre'}
          aide="Déduction faite de tous les versements, toutes périodes"
        />
      </div>

      <Bloc className="p-3 sm:p-4">
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={duSeulement}
            onChange={(e) => setDuSeulement(e.target.checked)}
            className="rounded border-gray-300"
          />
          N'afficher que les vendeurs à payer
        </label>
      </Bloc>

      <Bloc>
        {comptes.length === 0 ? (
          <Vide
            texte={
              duSeulement
                ? 'Aucun vendeur n’attend de versement.'
                : 'Aucune vente marketplace sur cette période.'
            }
          />
        ) : (
          <div className="tbl-wrap">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="px-3 sm:px-4 py-2.5 font-medium">Vendeur</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">CA</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Taux</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Commission</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Dû</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Versé</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Reste</th>
                  <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comptes.map((c) => (
                  <tr key={c.vendeurId} className="hover:bg-gray-50/60">
                    <td data-label="Vendeur" className="px-3 sm:px-4 py-2.5 min-w-[160px]">
                      <p className="font-medium text-gray-900 truncate">
                        {c.nomBoutique || `${c.prenom} ${c.nom}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {nombre(c.commandes)} commande(s) · {c.email}
                      </p>
                    </td>
                    <td data-label="CA" className="px-3 sm:px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                      {fcfa(c.chiffreAffaires)}
                    </td>
                    <td data-label="Taux" className="px-3 sm:px-4 py-2.5 text-right tabular-nums">
                      <span className="text-gray-700">{pourcent(c.tauxCommission, 2)}</span>
                      {c.tauxParDefaut && (
                        <span className="block text-xs text-gray-400" title="Aucun taux négocié enregistré">
                          par défaut
                        </span>
                      )}
                    </td>
                    <td data-label="Commission" className="px-3 sm:px-4 py-2.5 text-right text-green-700 whitespace-nowrap tabular-nums">
                      {fcfa(c.commission)}
                    </td>
                    <td data-label="Dû" className="px-3 sm:px-4 py-2.5 text-right text-gray-700 whitespace-nowrap tabular-nums">
                      {fcfa(c.montantVendeur)}
                    </td>
                    <td data-label="Versé" className="px-3 sm:px-4 py-2.5 text-right text-gray-500 whitespace-nowrap tabular-nums">
                      {fcfa(c.dejaReverse)}
                      {c.reversementsEnAttente > 0 && (
                        <span className="block text-xs text-orange-600">
                          + {fcfa(c.reversementsEnAttente)} en attente
                        </span>
                      )}
                    </td>
                    <td data-label="Reste" className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap tabular-nums">
                      <span
                        className={
                          c.resteDu > 0
                            ? 'font-semibold text-orange-700'
                            : c.resteDu < 0
                              ? 'text-blue-700'
                              : 'text-gray-400'
                        }
                        title={
                          c.resteDu < 0
                            ? 'Négatif : les versements dépassent les ventes de la période — un versement couvre une autre période'
                            : undefined
                        }
                      >
                        {fcfa(c.resteDu)}
                      </span>
                    </td>
                    <td data-label="Actions" className="px-3 sm:px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEdition(c)}
                          title="Modifier le taux de commission"
                          aria-label={`Modifier le taux de ${c.nomBoutique || c.nom}`}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                        >
                          <Icon name="percent" size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setVersement(c)}
                          title="Enregistrer un reversement"
                          aria-label={`Reverser à ${c.nomBoutique || c.nom}`}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                        >
                          <Icon name="banknote" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Bloc>

      <p className="text-xs text-gray-500">
        Le compte d'un vendeur est généré automatiquement dès sa première vente : il n'y a rien à
        créer. Aucun solde n'est stocké, tout se recalcule depuis les ventes livrées.
      </p>

      {edition && <ModaleTaux compte={edition} onFermer={() => setEdition(null)} />}
      {versement && <ModaleReversement compte={versement} onFermer={() => setVersement(null)} />}
    </div>
  );
}

/* ── Modales ─────────────────────────────────────────────────────────────── */

function ModaleTaux({ compte, onFermer }: { compte: CompteVendeur; onFermer: () => void }) {
  const [taux, setTaux] = useState(compte.tauxParDefaut ? '' : String(compte.tauxCommission));
  const definir = useDefinirTauxCommission();

  const valider = (e: React.FormEvent) => {
    e.preventDefault();
    const valeur = taux.trim() === '' ? null : Number(taux);
    if (valeur !== null && (!Number.isFinite(valeur) || valeur < 0 || valeur > 100)) {
      return showError('Le taux doit être compris entre 0 et 100.');
    }
    definir.mutate(
      { vendeurId: compte.vendeurId, taux: valeur },
      {
        onSuccess: (r) => {
          showSuccess(r);
          onFermer();
        },
        onError: (err) => showError(err),
      }
    );
  };

  return (
    <Modale titre="Taux de commission" onFermer={onFermer}>
      <form onSubmit={valider} className="space-y-3">
        <p className="text-sm text-gray-600">
          {compte.nomBoutique || `${compte.prenom} ${compte.nom}`}
        </p>

        <label className="block">
          <span className="text-xs font-medium text-gray-700">Taux négocié (%)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={taux}
            onChange={(e) => setTaux(e.target.value)}
            placeholder="Laisser vide pour le taux par défaut"
            autoFocus
            className="champ mt-1 w-full"
          />
        </label>

        {/* Un taux s'applique ligne à ligne, y compris au passé : le dire ici
            évite la surprise d'un montant dû qui change après la saisie. */}
        <p className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-2">
          Ce taux s'applique à <strong>toutes</strong> les ventes du vendeur, passées comprises :
          les commissions et montants dus seront recalculés.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
          <BoutonPrincipal enCours={definir.isPending}>Enregistrer</BoutonPrincipal>
        </div>
      </form>
    </Modale>
  );
}

function ModaleReversement({ compte, onFermer }: { compte: CompteVendeur; onFermer: () => void }) {
  // Pré-rempli au reste dû : c'est le versement attendu dans la quasi-totalité
  // des cas, et le montant reste modifiable pour un acompte.
  const [montant, setMontant] = useState(compte.resteDu > 0 ? String(Math.round(compte.resteDu)) : '');
  const [methode, setMethode] = useState<string>(METHODES_REVERSEMENT[0]);
  const [note, setNote] = useState('');
  const creer = useCreerReversement();

  const valider = (e: React.FormEvent) => {
    e.preventDefault();
    const valeur = Number(montant);
    if (!Number.isFinite(valeur) || valeur <= 0) {
      return showError('Le montant doit être supérieur à zéro.');
    }
    creer.mutate(
      {
        vendeurId: compte.vendeurId,
        montant: valeur,
        methode,
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: (r) => {
          showSuccess(r);
          onFermer();
        },
        onError: (err) => showError(err),
      }
    );
  };

  return (
    <Modale titre="Enregistrer un reversement" onFermer={onFermer}>
      <form onSubmit={valider} className="space-y-3">
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-sm">
          <p className="font-medium text-gray-900">
            {compte.nomBoutique || `${compte.prenom} ${compte.nom}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Reste dû {fcfa(compte.resteDu)} · déjà versé {fcfa(compte.dejaReverse)}
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-gray-700">Montant (FCFA)</span>
          <input
            type="number"
            min="1"
            step="1"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            autoFocus
            required
            className="champ mt-1 w-full tabular-nums"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-700">Moyen de paiement</span>
          <select
            value={methode}
            onChange={(e) => setMethode(e.target.value)}
            className="champ mt-1 w-full"
          >
            {METHODES_REVERSEMENT.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-gray-700">Note (facultatif)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Référence du virement, période couverte…"
            className="champ mt-1 w-full"
          />
        </label>

        <p className="text-xs text-gray-500">
          Le versement est créé « en attente ». Il ne sera déduit comme payé qu'après confirmation
          depuis l'écran Reversements.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
          <BoutonPrincipal enCours={creer.isPending}>Enregistrer</BoutonPrincipal>
        </div>
      </form>
    </Modale>
  );
}

/* ── Primitives de modale ────────────────────────────────────────────────── */

function Modale({
  titre,
  onFermer,
  children,
}: {
  titre: string;
  onFermer: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      onClick={onFermer}
    >
      <div
        className="modal-box sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function BoutonPrincipal({ children, enCours }: { children: React.ReactNode; enCours?: boolean }) {
  return (
    <button
      type="submit"
      disabled={enCours}
      className="btn-sombre"
    >
      {enCours ? 'Enregistrement…' : children}
    </button>
  );
}

function BoutonSecondaire({
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
      className="btn-secondaire"
    >
      {children}
    </button>
  );
}
