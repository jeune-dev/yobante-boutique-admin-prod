import {
  LIBELLE_STATUT_COMMANDE,
  ORDRE_STATUTS_COMMANDE,
  libelleStatut,
} from '@/domains/shop/statutsCommande';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '@/shared/components/dashboard/Icon';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError } from '@/shared/utils/alert';
import Pagination from '@/shared/components/tables/Pagination';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import { etatRetour } from '@/shared/hooks/useRetour';
import { lirePage, useParametresUrl } from '@/shared/hooks/useParametresUrl';
import { useOuvrirLigne } from '@/shared/hooks/useOuvrirLigne';
import { useListeFiltree } from '@/shared/hooks/useListeFiltree';
import { vendeursApi } from '@/domains/shop/api/vendeurs.api';
import {
  BarreFiltres,
  BoutonExportExcel,
  FiltreIntervalle,
  FiltrePeriode,
  FiltreSelect,
} from '@/shared/components/filtres/BarreFiltres';
import { dansIntervalle, dansPeriode, libelleIntervalle, libellePeriode } from '@/shared/utils/filtres';
import { enDate, enNombre, type ColonneExport } from '@/shared/utils/exportExcel';
import { EntetePage } from '@/shared/components/dashboard/Blocs';
import { montant } from '@/shared/utils/format';

const api = {
  getCommandes: (p: any) =>
    shopClient.get('/admin/commandes', { params: p }),
  getKpi: () => shopClient.get('/admin/commandes/kpi'),
  valider: (id: string) => shopClient.patch(`/admin/commandes/${id}/valider`),
  rejeter: (id: string, motif?: string) =>
    shopClient.patch(`/admin/commandes/${id}/rejeter`, { motif }),
};

/** Réponse des vendeurs d'une commande (filtre « Réponse vendeurs »). */
const REPONSES_VENDEURS = [
  { valeur: 'refus', libelle: 'Au moins un refus (indisponible)' },
  { valeur: 'attente', libelle: 'Réponse vendeur en attente' },
  { valeur: 'acceptee', libelle: 'Tous les vendeurs ont accepté' },
] as const;

const reponseVendeursOk = (c: any, reponse: string) => {
  if (!reponse) return true;
  const vendeurs: any[] = c.vendeurs ?? [];
  if (reponse === 'refus') return c.refusVendeurs > 0 || vendeurs.some((v) => v.statut === 'refusee');
  if (reponse === 'attente') return vendeurs.some((v) => v.statut !== 'acceptee' && v.statut !== 'refusee');
  return vendeurs.length > 0 && vendeurs.every((v) => v.statut === 'acceptee');
};

const LIBELLE_REPONSE: Record<string, string> = {
  acceptee: 'disponible',
  refusee: 'refusée',
};

/** Colonnes du fichier Excel des commandes. */
const COLONNES_EXPORT: ColonneExport<any>[] = [
  { titre: 'Référence', valeur: (c) => c.reference, largeur: 20 },
  { titre: 'Date', valeur: (c) => enDate(c.createdAt), largeur: 17 },
  { titre: 'Statut', valeur: (c) => libelleStatut(c.statut), largeur: 16 },
  { titre: 'Client', valeur: (c) => [c.user?.prenom, c.user?.nom].filter(Boolean).join(' '), largeur: 24 },
  { titre: 'Email client', valeur: (c) => c.user?.email, largeur: 28 },
  { titre: 'Téléphone client', valeur: (c) => c.user?.telephone, largeur: 17 },
  { titre: 'Montant total (FCFA)', valeur: (c) => enNombre(c.montantTotal), montant: true, largeur: 18 },
  { titre: 'Nombre d’articles', valeur: (c) => enNombre(c.items?.length), largeur: 10 },
  {
    titre: 'Vendeurs',
    valeur: (c) => (c.vendeurs ?? []).map((v: any) => v.boutique || v.vendeur).filter(Boolean).join(', '),
    largeur: 30,
  },
  {
    titre: 'Réponses vendeurs',
    valeur: (c) =>
      (c.vendeurs ?? [])
        .map((v: any) => {
          const r = LIBELLE_REPONSE[v.statut] ?? 'en attente';
          const motif = v.statut === 'refusee' && v.motifRefus ? ` (${v.motifRefus})` : '';
          return `${v.boutique || v.vendeur || 'Vendeur'} : ${r}${motif}`;
        })
        .join(' ; '),
    largeur: 40,
  },
  { titre: 'Mode de paiement', valeur: (c) => c.methodePaiement || c.paiement?.methode, largeur: 16 },
  { titre: 'Statut paiement', valeur: (c) => c.paiement?.statut, largeur: 14 },
  { titre: 'Ville de livraison', valeur: (c) => c.adresse?.ville, largeur: 16 },
  { titre: 'Livraison souhaitée', valeur: (c) => enDate(c.dateLivraisonSouhaitee), dateSeule: true, largeur: 14 },
  { titre: 'Motif rejet / annulation', valeur: (c) => c.motifRejet || c.motifAnnulation, largeur: 30 },
];

const STATUT_COLORS: Record<string, string> = {
  en_attente: 'bg-yellow-100 text-yellow-700',
  en_modification: 'bg-orange-100 text-orange-700',
  validee: 'bg-blue-100 text-blue-700',
  en_preparation: 'bg-purple-100 text-purple-700',
  expediee: 'bg-indigo-100 text-indigo-700',
  livree: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
  rejetee: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const ouvrir = useOuvrirLigne();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  // Recherche, statut et page vivent dans l'URL : le retour depuis le détail
  // d'une commande restitue la liste telle qu'on l'avait laissée.
  // Recherche et statut sont filtrés par le serveur ; période, montant,
  // vendeur et réponse des vendeurs le sont dans le navigateur, sur toutes
  // les commandes correspondant aux premiers.
  const [filtres, setFiltres] = useParametresUrl({
    q: '',
    statut: '',
    page: '1',
    du: '',
    au: '',
    montantMin: '',
    montantMax: '',
    vendeur: '',
    reponse: '',
  });
  const search = filtres.q;
  const statut = filtres.statut;
  const page = lirePage(filtres.page);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectMotif, setRejectMotif] = useState('');

  const filtresLocaux = [filtres.du, filtres.au, filtres.montantMin, filtres.montantMax, filtres.vendeur, filtres.reponse];
  // Le statut reste visible à côté de la recherche ; le compteur ne porte que
  // sur les filtres du panneau.
  const nbActifs = filtresLocaux.filter(Boolean).length;

  const { data: vendeursData } = useQuery({
    queryKey: ['vendeurs', 'options-filtre'],
    queryFn: () => vendeursApi.lister({ limit: 100 }),
    staleTime: 5 * 60_000,
  });
  const optionsVendeurs = (vendeursData?.vendeurs ?? []).map((v) => ({
    valeur: v.id,
    libelle: v.nomBoutique || v.boutique?.nom || [v.prenom, v.nom].filter(Boolean).join(' ') || v.email || v.id,
  }));

  const liste = useListeFiltree<any>({
    cle: ['commandes', { search, statut }],
    chargerPage: async (p, limit) => {
      const r: any = await api.getCommandes({ search, statut, page: p, limit });
      return {
        lignes: r?.commandes ?? [],
        totalPages: r?.pagination?.totalPages ?? 1,
        total: r?.pagination?.total,
      };
    },
    page,
    parPage: 20,
    filtresLocauxActifs: filtresLocaux.some(Boolean),
    filtreLocal: (c) =>
      dansPeriode(c.createdAt, filtres.du, filtres.au) &&
      dansIntervalle(c.montantTotal, filtres.montantMin, filtres.montantMax) &&
      (!filtres.vendeur || (c.vendeurs ?? []).some((v: any) => v.vendeurId === filtres.vendeur)) &&
      reponseVendeursOk(c, filtres.reponse),
  });
  const { isLoading, isError, error, refetch } = liste;

  const { data: kpi } = useQuery({
    queryKey: ['commandes-kpi'],
    queryFn: api.getKpi,
  });

  const validerMutation = useMutation({
    mutationFn: (id: string) => api.valider(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['commandes'] });
      qc.invalidateQueries({ queryKey: ['commandes-kpi'] });
      showSuccess(data);
    },
    onError: (e: any) => showError(e),
  });

  const rejeterMutation = useMutation({
    mutationFn: ({ id, motif }: { id: string; motif: string }) =>
      api.rejeter(id, motif),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['commandes'] });
      qc.invalidateQueries({ queryKey: ['commandes-kpi'] });
      showSuccess(data);
      setShowRejectModal(null);
      setRejectMotif('');
    },
    onError: (e: any) => showError(e),
  });

  const commandes = liste.lignes;

  return (
    <div>
      <EntetePage
        className="mb-6"
        titre="Commandes"
        soustitre="Suivi, validation et livraison des commandes clients."
      >
        <button
          type="button"
          onClick={() => navigate('/boutique/commandes/nouveau', { state: etatRetour(location) })}
          className="btn-primaire w-full sm:w-auto"
        >
          <Icon name="plus" size={16} />
          Créer une commande
        </button>
      </EntetePage>

      {/* KPI Cards : 2 par ligne sur téléphone, 4 dès la tablette. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total', value: kpi?.total, icone: 'shopping-cart', teinte: 'bg-gray-100 text-gray-700' },
          { label: 'En attente', value: kpi?.enAttente, icone: 'clock', teinte: 'bg-amber-50 text-amber-600' },
          { label: 'Validées', value: kpi?.validees, icone: 'check-circle', teinte: 'bg-green-50 text-green-600' },
          // Un rejet admin passe la commande en « rejetee » (et non plus « annulee »).
          {
            label: 'Annulées / rejetées',
            value: kpi ? (kpi.annulees ?? 0) + (kpi.rejetees ?? 0) : undefined,
            icone: 'x-circle',
            teinte: 'bg-red-50 text-red-600',
          },
        ].map((k) => (
          <div key={k.label} className="carte flex items-center gap-3.5 p-4">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${k.teinte}`}>
              <Icon name={k.icone} size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-semibold tracking-tight leading-none text-gray-900 tabular-nums">{k.value ?? '…'}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="carte">
        <BarreFiltres
          nbActifs={nbActifs}
          onReinitialiser={() =>
            setFiltres({ du: '', au: '', montantMin: '', montantMax: '', vendeur: '', reponse: '', page: '1' })
          }
          recherche={
            <>
              <input
                value={search}
                onChange={(e) => {
                  setFiltres({ q: e.target.value, page: '1' });
                }}
                placeholder="Rechercher…"
                aria-label="Rechercher une commande"
                className="champ w-full sm:w-56"
              />
              <select
                value={statut}
                onChange={(e) => {
                  setFiltres({ statut: e.target.value, page: '1' });
                }}
                aria-label="Filtrer par statut"
                className="champ w-full sm:w-auto"
              >
                <option value="">Tous les statuts</option>
                {ORDRE_STATUTS_COMMANDE.map((s) => (
                  <option key={s} value={s}>
                    {LIBELLE_STATUT_COMMANDE[s]}
                  </option>
                ))}
              </select>
            </>
          }
          actions={
            <BoutonExportExcel
              charger={liste.chargerPourExport}
              nomFichier="commandes"
              colonnes={COLONNES_EXPORT}
              filtres={{
                Recherche: search,
                Statut: statut ? libelleStatut(statut) : '',
                'Période de commande': libellePeriode(filtres.du, filtres.au),
                'Montant (FCFA)': libelleIntervalle(filtres.montantMin, filtres.montantMax),
                Vendeur: optionsVendeurs.find((o) => o.valeur === filtres.vendeur)?.libelle ?? filtres.vendeur,
                'Réponse vendeurs': REPONSES_VENDEURS.find((r) => r.valeur === filtres.reponse)?.libelle,
              }}
            />
          }
        >
          <FiltrePeriode
            libelle="Date de commande"
            du={filtres.du}
            au={filtres.au}
            onChange={(du, au) => setFiltres({ du, au, page: '1' })}
          />
          <FiltreIntervalle
            libelle="Montant total (FCFA)"
            min={filtres.montantMin}
            max={filtres.montantMax}
            onChange={(montantMin, montantMax) => setFiltres({ montantMin, montantMax, page: '1' })}
          />
          <FiltreSelect
            libelle="Vendeur"
            valeur={filtres.vendeur}
            onChange={(v) => setFiltres({ vendeur: v, page: '1' })}
            tous="Tous les vendeurs"
            options={optionsVendeurs}
          />
          <FiltreSelect
            libelle="Réponse des vendeurs"
            valeur={filtres.reponse}
            onChange={(v) => setFiltres({ reponse: v, page: '1' })}
            tous="Toutes"
            options={REPONSES_VENDEURS}
          />
        </BarreFiltres>
        {liste.tronque && (
          <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
            Seules les 10 000 commandes les plus récentes ont été filtrées : affinez la recherche ou le statut.
          </p>
        )}
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : isError ? (
          <ErreurChargement erreur={error} onReessayer={() => refetch()} />
        ) : (
        <div className="tbl-wrap">
          <table className="w-full text-sm tbl-cards">
            <thead>
              <tr className="text-left">
                <th className="px-4">Commande</th>
                <th className="px-4">Client</th>
                <th className="px-4">Montant</th>
                <th className="px-4">Vendeurs</th>
                <th className="px-4">Statut</th>
                <th className="px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {commandes.map((c: any) => (
                <tr key={c.id} {...ouvrir(`/boutique/commandes/${c.id}`)} className="border-b border-gray-50 last:border-0">
                  {/* Référence et date ensemble : la référence ne se coupe
                      plus en deux lignes. */}
                  <td className="px-4 tbl-primary">
                    <p className="font-mono text-[13px] font-semibold text-gray-900 whitespace-nowrap">{c.reference}</p>
                    <p className="text-[13px] text-gray-500 mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </td>
                  <td className="px-4" data-label="Client">
                    <span className="font-medium text-gray-900 whitespace-nowrap">
                      {c.user?.prenom} {c.user?.nom}
                    </span>
                  </td>
                  <td className="px-4 whitespace-nowrap" data-label="Montant">
                    <div className="text-right md:text-left">
                      <p className="font-semibold text-gray-900 tabular-nums">
                        {montant(c.montantTotal)}
                      </p>
                      <p className="text-[13px] text-gray-500">
                        {c.items?.length ? `${c.items.length} article(s)` : '—'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4" data-label="Vendeurs">
                    <ReponsesVendeurs vendeurs={c.vendeurs ?? []} />
                  </td>
                  <td className="px-4" data-label="Statut">
                    <div className="flex flex-wrap items-center justify-end md:justify-start gap-1.5">
                      <span
                        className={`badge ${
                          STATUT_COLORS[c.statut] || 'bg-gray-100'
                        }`}
                      >
                        {libelleStatut(c.statut)}
                      </span>

                      {/* Un vendeur a déclaré ses produits indisponibles. */}
                      {c.refusVendeurs > 0 && (
                        <span
                          className="badge bg-red-50 text-red-700"
                          title="Produits déclarés indisponibles par un vendeur — voir le détail"
                        >
                          Indisponible
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 tbl-actions" data-label="Actions">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/boutique/commandes/${c.id}`, { state: etatRetour(location) })}
                        title="Voir"
                        aria-label="Voir la commande"
                        className="btn-icon hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                      >
                        <Icon name="eye" size={17} />
                      </button>
                      {(c.statut === 'en_attente' || c.statut === 'en_modification') && (
                        <>
                          <button
                            onClick={() => validerMutation.mutate(c.id)}
                            title="Accepter"
                            aria-label="Accepter la commande"
                            className="btn-icon bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            <Icon name="check" size={17} />
                          </button>
                          <button
                            onClick={() => setShowRejectModal(c.id)}
                            title="Rejeter"
                            aria-label="Rejeter la commande"
                            className="btn-icon bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            <Icon name="x" size={17} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {commandes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400 tbl-empty">
                    Aucune commande trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
        <Pagination page={page} totalPages={liste.totalPages} onChange={(p) => setFiltres({ page: String(p) })} />
      </div>

      {/* Modal de rejet */}
      {showRejectModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Rejeter la commande">
          <div className="modal-box max-w-md">
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Rejeter la commande
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Veuillez indiquer le motif du rejet. Ce motif sera visible au client.
              </p>
              <textarea
                value={rejectMotif}
                onChange={(e) => setRejectMotif(e.target.value)}
                placeholder="Motif du rejet (ex: Stock insuffisant, Produit indisponible)…"
                aria-label="Motif du rejet"
                maxLength={500}
                className="champ w-full resize-none focus:border-red-400 focus:ring-red-400/20"
                rows={4}
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectMotif('');
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (!rejectMotif.trim()) {
                      showError('Le motif du rejet est obligatoire');
                      return;
                    }
                    rejeterMutation.mutate({
                      id: showRejectModal,
                      motif: rejectMotif,
                    });
                  }}
                  disabled={rejeterMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-gray-400 rounded-lg"
                >
                  {rejeterMutation.isPending ? 'En cours…' : 'Rejeter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Vendeurs d'une commande et leur réponse : V (disponible), X (refusé, avec
 * le motif) ou « … » (pas encore répondu).
 */
function ReponsesVendeurs({ vendeurs }: { vendeurs: any[] }) {
  if (!vendeurs.length) return <span className="text-gray-400">—</span>;
  return (
    <ul className="space-y-1.5 min-w-[160px]">
      {vendeurs.map((v) => {
        const nom = v.boutique || v.vendeur || 'Vendeur';
        const badge =
          v.statut === 'acceptee'
            ? { texte: 'V', classes: 'bg-green-100 text-green-700', titre: 'Produits disponibles' }
            : v.statut === 'refusee'
              ? { texte: 'X', classes: 'bg-red-100 text-red-700', titre: 'Refusée par le vendeur' }
              : { texte: '…', classes: 'bg-amber-50 text-amber-700', titre: 'En attente de réponse' };
        return (
          <li key={v.vendeurId}>
            <div className="flex items-center gap-1.5">
              <span
                title={badge.titre}
                aria-label={badge.titre}
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 ${badge.classes}`}
              >
                {badge.texte}
              </span>
              <span className="text-gray-800 truncate" title={[nom, v.vendeur, v.telephone].filter(Boolean).join(' · ')}>
                {nom}
              </span>
            </div>
            {v.telephone && <p className="text-xs text-gray-400 pl-6">{v.telephone}</p>}
            {v.statut === 'refusee' && v.motifRefus && (
              <p className="text-xs text-red-700 pl-6 line-clamp-2" title={v.motifRefus}>
                Motif : {v.motifRefus}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
