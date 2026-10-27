import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError } from '@/shared/utils/alert';
import Icon from '@/shared/components/dashboard/Icon';
import Modal, { BoutonPrincipal, BoutonSecondaire } from '@/pages/shop/accueil/components/Modal';
import { dateHeure } from '@/shared/utils/format';
import {
  COULEUR_TYPE,
  MOTIFS_AJUSTEMENT,
  MOTIF_AUTRE,
  couleurEcart,
  ecart,
  libelleMotif,
  libelleSource,
  libelleType,
  nomUtilisateur,
  type CodeMotif,
} from '../stock.labels';

/** Ce que la modale a besoin de connaître du produit ajusté. */
export interface ProduitStock {
  id: string;
  nom: string;
  stock?: number | null;
}

interface Mouvement {
  id: string;
  type: string;
  source: string;
  ancienneQuantite: number;
  nouvelleQuantite: number;
  difference: number;
  motif?: string | null;
  commentaire?: string | null;
  createdAt: string;
  auteur?: { nom?: string; prenom?: string; email?: string } | null;
}

interface Props {
  produit: ProduitStock;
  onFermer: () => void;
}

const PRECISION_MIN = 3;
const PRECISION_MAX = 1000;

/**
 * Erreurs de saisie, recalculées à chaque frappe : le message disparaît dès
 * que la valeur redevient acceptable, sans attendre une nouvelle soumission.
 * Les règles reprennent celles du schéma Joi côté serveur — qui reste seul
 * juge : l'API refuse la requête même si ce contrôle est contourné.
 */
function verifier(quantite: string, motif: string, commentaire: string) {
  const erreurs: { quantite?: string; motif?: string; commentaire?: string } = {};

  const saisie = quantite.trim();
  if (!saisie) {
    erreurs.quantite = 'La quantité est obligatoire';
  } else if (!/^\d+$/.test(saisie)) {
    // Décimales et signe « − » écartés ici : un stock est un nombre entier
    // d'unités, jamais négatif.
    erreurs.quantite = 'Saisissez un nombre entier supérieur ou égal à 0';
  }

  if (!motif) {
    erreurs.motif = 'Le motif est obligatoire';
  } else if (!(motif in MOTIFS_AJUSTEMENT)) {
    erreurs.motif = 'Choisissez un motif dans la liste proposée';
  }

  const precision = commentaire.trim();
  if (motif === MOTIF_AUTRE && precision.length < PRECISION_MIN) {
    erreurs.commentaire = `Précisez le motif (au moins ${PRECISION_MIN} caractères)`;
  } else if (precision.length > PRECISION_MAX) {
    erreurs.commentaire = `Le commentaire ne doit pas dépasser ${PRECISION_MAX} caractères`;
  }

  return erreurs;
}

/**
 * Ajustement de la quantité en stock d'un produit, motif obligatoire.
 *
 * La quantité saisie est la quantité ABSOLUE visée : c'est la convention de
 * `PATCH /admin/produits/:id/stock`, et c'est aussi ce qu'un inventaire
 * donne — on compte ce qu'il reste, pas l'écart. L'écart est calculé et
 * conservé par le backend dans le journal des mouvements.
 *
 * Les cinq derniers mouvements sont rappelés ici pour situer l'ajustement ;
 * l'historique complet, filtrable, vit sur la fiche du produit.
 */
export default function StockModal({ produit, onFermer }: Props) {
  const qc = useQueryClient();
  const stockActuel = Number(produit.stock ?? 0);
  const [quantite, setQuantite] = useState(String(stockActuel));
  const [motif, setMotif] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [soumissionTentee, setSoumissionTentee] = useState(false);

  const erreurs = verifier(quantite, motif, commentaire);
  const invalide = Boolean(erreurs.quantite || erreurs.motif || erreurs.commentaire);
  // Tant que l'administrateur n'a rien validé, on ne barbouille pas le
  // formulaire de rouge : les messages n'apparaissent qu'après une tentative.
  const afficher = (champ: 'quantite' | 'motif' | 'commentaire') =>
    soumissionTentee ? erreurs[champ] : undefined;

  const historique = useQuery({
    queryKey: ['produit-mouvements-stock', produit.id, 'apercu'],
    queryFn: () =>
      shopClient.get<{ mouvements: Mouvement[] }>(
        `/admin/produits/${produit.id}/mouvements-stock`,
        { params: { limit: 5 } }
      ),
  });

  const ajuster = useMutation({
    mutationFn: () =>
      shopClient.patch(`/admin/produits/${produit.id}/stock`, {
        quantite: Number(quantite.trim()),
        motif,
        commentaire: commentaire.trim() || undefined,
      }),
    onSuccess: (donnees) => {
      // Les listes se rafraîchissent d'elles-mêmes : pas de rechargement de
      // page, la quantité affichée change sous les yeux de l'utilisateur.
      qc.invalidateQueries({ queryKey: ['admin-produits'] });
      qc.invalidateQueries({ queryKey: ['admin-produit', produit.id] });
      qc.invalidateQueries({ queryKey: ['produit-mouvements-stock', produit.id] });
      showSuccess(donnees, 'Stock mis à jour');
      onFermer();
    },
    // Message du backend (403, 422, 500) ou texte de repli du client HTTP
    // quand le serveur est injoignable — toujours en français.
    onError: (e: unknown) => showError(e),
  });

  const valider = () => {
    setSoumissionTentee(true);
    if (invalide) return;
    ajuster.mutate();
  };

  const nouvelleQuantite = /^\d+$/.test(quantite.trim()) ? Number(quantite.trim()) : null;
  const difference = nouvelleQuantite === null ? null : nouvelleQuantite - stockActuel;

  const mouvements = historique.data?.mouvements ?? [];

  const classesChamp = (enErreur?: string) =>
    `champ w-full ${enErreur ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20' : ''}`;

  return (
    <Modal
      titre="Modifier le stock"
      sousTitre={produit.nom}
      onFermer={onFermer}
      largeur="md"
      actions={
        <>
          <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
          <BoutonPrincipal onClick={valider} disabled={ajuster.isPending} ton="or">
            {ajuster.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </BoutonPrincipal>
        </>
      }
    >
      <div className="space-y-5">
        {/* ── Quantité actuelle et écart projeté ───────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-3 py-2.5 rounded-lg bg-gray-50">
          <div>
            <p className="text-xs text-gray-400">Quantité actuelle</p>
            <p className="font-semibold text-gray-900 tabular-nums">{stockActuel}</p>
          </div>
          {difference !== null && difference !== 0 && (
            <div>
              <p className="text-xs text-gray-400">Écart</p>
              <p className={`font-semibold tabular-nums ${couleurEcart(difference)}`}>
                {ecart(difference)}
              </p>
            </div>
          )}
        </div>

        {/* ── Saisie ───────────────────────────────────────────────────── */}
        <div className="xs:max-w-[12rem]">
          <label htmlFor="stock-quantite" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nouvelle quantité *
          </label>
          <input
            id="stock-quantite"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            aria-invalid={Boolean(afficher('quantite'))}
            aria-describedby={afficher('quantite') ? 'stock-quantite-erreur' : undefined}
            className={classesChamp(afficher('quantite'))}
          />
          {afficher('quantite') && (
            <p id="stock-quantite-erreur" role="alert" className="text-xs text-red-600 mt-1">
              {erreurs.quantite}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="stock-motif" className="block text-sm font-medium text-gray-700 mb-1.5">
            Motif de modification *
          </label>
          <select
            id="stock-motif"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            aria-invalid={Boolean(afficher('motif'))}
            aria-describedby={afficher('motif') ? 'stock-motif-erreur' : undefined}
            className={classesChamp(afficher('motif'))}
          >
            <option value="">— Choisir un motif —</option>
            {(Object.keys(MOTIFS_AJUSTEMENT) as CodeMotif[]).map((code) => (
              <option key={code} value={code}>
                {MOTIFS_AJUSTEMENT[code]}
              </option>
            ))}
          </select>
          {afficher('motif') && (
            <p id="stock-motif-erreur" role="alert" className="text-xs text-red-600 mt-1">
              {erreurs.motif}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="stock-commentaire"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {motif === MOTIF_AUTRE ? 'Précisez le motif *' : 'Commentaire (facultatif)'}
          </label>
          <textarea
            id="stock-commentaire"
            rows={3}
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Ex : inventaire du 23/10, palette abîmée à la livraison…"
            aria-invalid={Boolean(afficher('commentaire'))}
            aria-describedby={afficher('commentaire') ? 'stock-commentaire-erreur' : undefined}
            className={classesChamp(afficher('commentaire'))}
          />
          {afficher('commentaire') ? (
            <p id="stock-commentaire-erreur" role="alert" className="text-xs text-red-600 mt-1">
              {erreurs.commentaire}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Conservé dans l’historique, qui n’est jamais effacé.
            </p>
          )}
        </div>

        {/* ── Derniers mouvements ──────────────────────────────────────── */}
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Derniers mouvements
          </h4>

          {historique.isLoading ? (
            <p className="text-sm text-gray-400 py-3">Chargement…</p>
          ) : historique.isError ? (
            <p className="text-sm text-gray-500 py-3">Historique indisponible pour le moment.</p>
          ) : mouvements.length === 0 ? (
            <p className="text-sm text-gray-400 py-3">Aucun mouvement enregistré.</p>
          ) : (
            <ul className="space-y-2">
              {mouvements.map((m) => (
                <li
                  key={m.id}
                  className="carte px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`badge border ${
                        COULEUR_TYPE[m.type] ?? 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {libelleType(m.type)}
                    </span>
                    <span className="text-sm text-gray-900 font-medium tabular-nums">
                      {m.ancienneQuantite} → {m.nouvelleQuantite} ({ecart(m.difference)})
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">{dateHeure(m.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 break-words">
                    {m.motif ? libelleMotif(m.motif, m.source) : libelleSource(m.source)}
                    {m.commentaire ? ` — ${m.commentaire}` : ''}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Icon name="user" size={12} />
                    {nomUtilisateur(m.auteur, 'Auteur inconnu')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
