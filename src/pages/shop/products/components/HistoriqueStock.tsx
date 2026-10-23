import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import {
  COULEUR_TYPE,
  MOTIFS_AJUSTEMENT,
  TYPES_MOUVEMENT,
  formaterDateHeure,
  formaterEcart,
  libelleMotif,
  libelleRole,
  libelleSource,
  libelleType,
  nomUtilisateur,
} from '../stock.labels';

export interface Indicateurs {
  stockActuel: number;
  totalEntrees: number;
  totalSorties: number;
  totalAjustementsPositifs: number;
  totalAjustementsNegatifs: number;
  nombreCommandes: number;
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
  auteur?: { nom?: string; prenom?: string; email?: string; role?: string } | null;
  client?: { id: string; nom?: string; prenom?: string; email?: string } | null;
  commande?: { id: string; reference?: string; statut?: string } | null;
}

interface Reponse {
  mouvements: Mouvement[];
  indicateurs: Indicateurs;
  pagination: { total: number; totalPages: number; page: number; limit: number };
}

interface Props {
  produitId: string;
  /** Remonte les indicateurs à la fiche : ils suivent la période filtrée. */
  onIndicateurs?: (indicateurs: Indicateurs | null) => void;
}

/** Filtres tels qu'ils sont saisis ; vides = non appliqués. */
const FILTRES_VIDES = {
  dateDebut: '',
  dateFin: '',
  type: '',
  motif: '',
  search: '',
};

type Filtres = typeof FILTRES_VIDES;

/** Ne transmet au backend que les filtres réellement renseignés. */
const enParametres = (filtres: Filtres, page: number) => {
  const params: Record<string, string | number> = { page, limit: 20 };
  for (const [cle, valeur] of Object.entries(filtres)) {
    if (valeur) params[cle] = valeur;
  }
  return params;
};

/**
 * Historique des mouvements de stock d'un produit.
 *
 * Tous les filtres sont appliqués CÔTÉ SERVEUR : la page affichée n'est
 * qu'une tranche de l'ensemble filtré, et les totaux remontés portent sur
 * tout cet ensemble. Les filtres saisis ne prennent effet qu'au clic sur
 * « Appliquer » — taper trois caractères ne déclenche pas trois requêtes.
 */
export default function HistoriqueStock({ produitId, onIndicateurs }: Props) {
  const [saisie, setSaisie] = useState<Filtres>(FILTRES_VIDES);
  const [appliques, setAppliques] = useState<Filtres>(FILTRES_VIDES);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['produit-mouvements-stock', produitId, appliques, page],
    queryFn: () =>
      shopClient.get<Reponse>(`/admin/produits/${produitId}/mouvements-stock`, {
        params: enParametres(appliques, page),
      }),
  });

  // Les indicateurs de l'en-tête suivent la période filtrée : ils viennent
  // de la même réponse que le tableau, jamais d'un second calcul.
  useEffect(() => {
    onIndicateurs?.(data?.indicateurs ?? null);
  }, [data, onIndicateurs]);

  const mouvements = data?.mouvements ?? [];
  const pagination = data?.pagination;
  const filtreActif = Object.values(appliques).some(Boolean);

  const appliquer = () => {
    setPage(1);
    setAppliques(saisie);
  };

  const reinitialiser = () => {
    setPage(1);
    setSaisie(FILTRES_VIDES);
    setAppliques(FILTRES_VIDES);
  };

  const modifier = (cle: keyof Filtres) => (valeur: string) =>
    setSaisie((precedent) => ({ ...precedent, [cle]: valeur }));

  const champ =
    'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-4 sm:px-5 py-4 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Historique du stock</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          La traçabilité démarre à la mise en service de cette fonctionnalité : les mouvements
          antérieurs n’ont pas été enregistrés et ne sont pas reconstitués.
        </p>
      </div>

      {/* ── Filtres, appliqués côté serveur ──────────────────────────── */}
      <div className="px-4 sm:px-5 py-4 border-b border-gray-100 space-y-3">
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="filtre-debut" className="block text-xs text-gray-500 mb-1">
              Date de début
            </label>
            <input
              id="filtre-debut"
              type="date"
              value={saisie.dateDebut}
              onChange={(e) => modifier('dateDebut')(e.target.value)}
              className={champ}
            />
          </div>
          <div>
            <label htmlFor="filtre-fin" className="block text-xs text-gray-500 mb-1">
              Date de fin
            </label>
            <input
              id="filtre-fin"
              type="date"
              value={saisie.dateFin}
              onChange={(e) => modifier('dateFin')(e.target.value)}
              className={champ}
            />
          </div>
          <div>
            <label htmlFor="filtre-type" className="block text-xs text-gray-500 mb-1">
              Type de mouvement
            </label>
            <select
              id="filtre-type"
              value={saisie.type}
              onChange={(e) => modifier('type')(e.target.value)}
              className={champ}
            >
              <option value="">Tous</option>
              {Object.entries(TYPES_MOUVEMENT).map(([code, libelle]) => (
                <option key={code} value={code}>
                  {libelle}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtre-motif" className="block text-xs text-gray-500 mb-1">
              Motif
            </label>
            <select
              id="filtre-motif"
              value={saisie.motif}
              onChange={(e) => modifier('motif')(e.target.value)}
              className={champ}
            >
              <option value="">Tous</option>
              {Object.entries(MOTIFS_AJUSTEMENT).map(([code, libelle]) => (
                <option key={code} value={code}>
                  {libelle}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label htmlFor="filtre-recherche" className="block text-xs text-gray-500 mb-1">
              Numéro de commande ou nom du client
            </label>
            <input
              id="filtre-recherche"
              value={saisie.search}
              onChange={(e) => modifier('search')(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && appliquer()}
              placeholder="Ex : CMD-1730… ou Diop"
              className={champ}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={appliquer}
              className="px-4 py-2.5 sm:py-2 text-sm font-semibold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600"
            >
              Appliquer les filtres
            </button>
            <button
              type="button"
              onClick={reinitialiser}
              className="px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Période retenue et volume : l'utilisateur sait sur quoi il lit. */}
        <p className="text-xs text-gray-500">
          {filtreActif ? 'Période retenue : ' : 'Période : '}
          <span className="font-medium text-gray-700">
            {appliques.dateDebut || appliques.dateFin
              ? `${appliques.dateDebut || 'origine'} → ${appliques.dateFin || "aujourd'hui"}`
              : 'depuis la mise en service'}
          </span>
          {' · '}
          <span className="font-medium text-gray-700">
            {pagination ? `${pagination.total} mouvement${pagination.total > 1 ? 's' : ''}` : '…'}
          </span>
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Chargement…</div>
      ) : isError ? (
        <ErreurChargement erreur={error} onReessayer={() => refetch()} />
      ) : (
        <div className="tbl-wrap">
          <table className="w-full text-sm tbl-cards">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="p-4 font-medium text-gray-500">Date</th>
                <th className="p-4 font-medium text-gray-500">Type</th>
                <th className="p-4 font-medium text-gray-500">Quantité</th>
                <th className="p-4 font-medium text-gray-500">Avant / après</th>
                <th className="p-4 font-medium text-gray-500">Motif</th>
                <th className="p-4 font-medium text-gray-500">Commande</th>
                <th className="p-4 font-medium text-gray-500">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {mouvements.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                  <td className="p-4 whitespace-nowrap tbl-primary" data-label="Date">
                    {formaterDateHeure(m.createdAt)}
                  </td>
                  <td className="p-4" data-label="Type">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        COULEUR_TYPE[m.type] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {libelleType(m.type)}
                    </span>
                    <span className="block text-xs text-gray-400 mt-1">
                      {libelleSource(m.source)}
                    </span>
                  </td>
                  <td
                    className={`p-4 font-semibold whitespace-nowrap ${
                      m.difference > 0
                        ? 'text-green-600'
                        : m.difference < 0
                          ? 'text-red-600'
                          : 'text-gray-500'
                    }`}
                    data-label="Quantité"
                  >
                    {formaterEcart(m.difference)}
                  </td>
                  <td className="p-4 whitespace-nowrap text-gray-600" data-label="Avant / après">
                    {m.ancienneQuantite} → {m.nouvelleQuantite}
                  </td>
                  <td className="p-4 text-gray-600" data-label="Motif">
                    {m.motif ? libelleMotif(m.motif) : '—'}
                    {m.commentaire && (
                      <span className="block text-xs text-gray-400 mt-0.5 break-words">
                        {m.commentaire}
                      </span>
                    )}
                  </td>
                  <td className="p-4" data-label="Commande">
                    {m.commande ? (
                      <Link
                        to={`/boutique/commandes/${m.commande.id}`}
                        className="text-yellow-700 hover:underline font-medium"
                      >
                        {m.commande.reference ?? 'Commande'}
                      </Link>
                    ) : (
                      '—'
                    )}
                    {m.client && (
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {nomUtilisateur(m.client)}
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-gray-600" data-label="Responsable">
                    {nomUtilisateur(m.auteur, 'Inconnu')}
                    {m.auteur?.role && (
                      <span className="block text-xs text-gray-400 mt-0.5">
                        {libelleRole(m.auteur.role)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {mouvements.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 tbl-empty">
                    {filtreActif
                      ? 'Aucun mouvement ne correspond à ces filtres.'
                      : 'Aucun mouvement enregistré pour ce produit.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={pagination?.totalPages ?? 1}
        onChange={(p) => setPage(p)}
      />
    </section>
  );
}
