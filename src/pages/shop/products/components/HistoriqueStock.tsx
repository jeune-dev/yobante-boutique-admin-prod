import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import { Bloc, Vide } from '@/shared/components/dashboard/Blocs';
import { dateHeure, nombre } from '@/shared/utils/format';
import {
  COULEUR_TYPE,
  MOTIFS_AJUSTEMENT,
  SOURCES_MOUVEMENT,
  TYPES_MOUVEMENT,
  couleurEcart,
  ecart,
  libelleMotif,
  libelleRole,
  libelleSource,
  libelleType,
  nomUtilisateur,
} from '../stock.labels';

export interface IndicateursStock {
  stockActuel: number;
  totalEntrees: number;
  totalSorties: number;
  totalAjustementsPositifs: number;
  totalAjustementsNegatifs: number;
  nombreCommandes: number;
}

export interface Mouvement {
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
  retour?: { id: string; statut?: string } | null;
}

interface Reponse {
  mouvements: Mouvement[];
  indicateurs: IndicateursStock;
  pagination: { total: number; totalPages: number; page: number; limit: number };
}

interface Props {
  produitId: string;
  /** Remonte les totaux à la fiche : ils suivent la période filtrée. */
  onIndicateurs?: (indicateurs: IndicateursStock | null) => void;
}

/** Filtres tels qu'ils sont saisis ; vides = non appliqués. */
const FILTRES_VIDES = {
  dateDebut: '',
  dateFin: '',
  type: '',
  source: '',
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
    queryKey: ['produit-mouvements-stock', produitId, 'journal', appliques, page],
    queryFn: () =>
      shopClient.get<Reponse>(`/admin/produits/${produitId}/mouvements-stock`, {
        params: enParametres(appliques, page),
      }),
  });

  // Les totaux de l'en-tête suivent la période filtrée : ils viennent de la
  // même réponse que le tableau, jamais d'un second calcul.
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
    'w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400';

  return (
    <Bloc>
      <div className="px-3 sm:px-4 py-3 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Historique du stock</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          La traçabilité démarre à la mise en service de cette fonctionnalité : les mouvements
          antérieurs n’ont pas été enregistrés et ne sont pas reconstitués.
        </p>
      </div>

      {/* ── Filtres, appliqués côté serveur ──────────────────────────── */}
      <div className="px-3 sm:px-4 py-3 border-b border-gray-100 space-y-2.5">
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div>
            <label htmlFor="filtre-debut" className="block text-[11px] text-gray-500 mb-1">
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
            <label htmlFor="filtre-fin" className="block text-[11px] text-gray-500 mb-1">
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
            <label htmlFor="filtre-type" className="block text-[11px] text-gray-500 mb-1">
              Type de mouvement
            </label>
            <select
              id="filtre-type"
              value={saisie.type}
              onChange={(e) => modifier('type')(e.target.value)}
              className={champ}
            >
              <option value="">Tous</option>
              {Object.entries(TYPES_MOUVEMENT).map(([code, texte]) => (
                <option key={code} value={code}>
                  {texte}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtre-source" className="block text-[11px] text-gray-500 mb-1">
              Origine
            </label>
            <select
              id="filtre-source"
              value={saisie.source}
              onChange={(e) => modifier('source')(e.target.value)}
              className={champ}
            >
              <option value="">Toutes</option>
              {Object.entries(SOURCES_MOUVEMENT).map(([code, texte]) => (
                <option key={code} value={code}>
                  {texte}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtre-motif" className="block text-[11px] text-gray-500 mb-1">
              Motif
            </label>
            <select
              id="filtre-motif"
              value={saisie.motif}
              onChange={(e) => modifier('motif')(e.target.value)}
              className={champ}
            >
              <option value="">Tous</option>
              {Object.entries(MOTIFS_AJUSTEMENT).map(([code, texte]) => (
                <option key={code} value={code}>
                  {texte}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
          <div className="flex-1">
            <label htmlFor="filtre-recherche" className="block text-[11px] text-gray-500 mb-1">
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
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800"
            >
              Appliquer les filtres
            </button>
            <button
              type="button"
              onClick={reinitialiser}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 hover:bg-gray-100"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Période retenue et volume : l'utilisateur sait sur quoi il lit. */}
        <p className="text-[11px] text-gray-500">
          {filtreActif ? 'Période retenue : ' : 'Période : '}
          <span className="font-medium text-gray-700">
            {appliques.dateDebut || appliques.dateFin
              ? `${appliques.dateDebut || 'origine'} → ${appliques.dateFin || "aujourd'hui"}`
              : 'depuis la mise en service'}
          </span>
          {' · '}
          <span className="font-medium text-gray-700">
            {pagination
              ? `${nombre(pagination.total)} mouvement${pagination.total > 1 ? 's' : ''}`
              : '…'}
          </span>
        </p>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-400">Chargement…</div>
      ) : isError ? (
        <ErreurChargement
          erreur={error}
          onReessayer={() => refetch()}
          defaut="Impossible de charger l'historique du stock."
        />
      ) : mouvements.length === 0 ? (
        <Vide
          texte={
            filtreActif
              ? 'Aucun mouvement ne correspond à ces filtres.'
              : 'Aucun mouvement enregistré pour ce produit.'
          }
        />
      ) : (
        <div className="tbl-wrap">
          <table className="w-full text-sm tbl-cards">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="px-3 sm:px-4 py-2.5 font-medium">Date</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium">Type</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Quantité</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium text-right">Avant / après</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium">Motif</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium">Commande</th>
                <th className="px-3 sm:px-4 py-2.5 font-medium">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mouvements.map((m) => (
                <tr key={m.id} className="align-top">
                  <td
                    data-label="Date"
                    className="px-3 sm:px-4 py-2.5 whitespace-nowrap tbl-primary"
                  >
                    {dateHeure(m.createdAt)}
                  </td>
                  <td data-label="Type" className="px-3 sm:px-4 py-2.5">
                    <span
                      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                        COULEUR_TYPE[m.type] ?? 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {libelleType(m.type)}
                    </span>
                    <span className="block text-[11px] text-gray-400 mt-1">
                      {libelleSource(m.source)}
                    </span>
                  </td>
                  <td
                    data-label="Quantité"
                    className={`px-3 sm:px-4 py-2.5 text-right font-semibold tabular-nums ${couleurEcart(m.difference)}`}
                  >
                    {ecart(m.difference)}
                  </td>
                  <td
                    data-label="Avant / après"
                    className="px-3 sm:px-4 py-2.5 text-right text-gray-600 whitespace-nowrap tabular-nums"
                  >
                    {m.ancienneQuantite} → {m.nouvelleQuantite}
                  </td>
                  <td data-label="Motif" className="px-3 sm:px-4 py-2.5 text-gray-600">
                    {libelleMotif(m.motif, m.source)}
                    {m.commentaire && (
                      <span className="block text-[11px] text-gray-400 mt-0.5 break-words">
                        {m.commentaire}
                      </span>
                    )}
                  </td>
                  <td data-label="Commande" className="px-3 sm:px-4 py-2.5">
                    {m.commande ? (
                      <Link
                        to={`/boutique/commandes/${m.commande.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {m.commande.reference ?? 'Commande'}
                      </Link>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                    {m.client && (
                      <span className="block text-[11px] text-gray-400 mt-0.5">
                        {nomUtilisateur(m.client)}
                      </span>
                    )}
                  </td>
                  <td data-label="Responsable" className="px-3 sm:px-4 py-2.5 text-gray-600">
                    {nomUtilisateur(m.auteur, 'Inconnu')}
                    {m.auteur?.role && (
                      <span className="block text-[11px] text-gray-400 mt-0.5">
                        {libelleRole(m.auteur.role)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={pagination?.totalPages ?? 1} onChange={setPage} />
    </Bloc>
  );
}
