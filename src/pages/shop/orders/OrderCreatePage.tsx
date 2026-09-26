import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminBackButton from '@/shared/components/AdminBackButton';
import { useRetour } from '@/shared/hooks/useRetour';
import { useConfirmationSortie } from '@/shared/hooks/useConfirmationSortie';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError } from '@/shared/utils/alert';
import {
  ajouterAuPanier,
  construirePayload,
  formaterFcfa,
  lireQuantite,
  modifierQuantite,
  premiereErreur,
  retirerDuPanier,
  sousTotalLigne,
  totalArticles,
  validerBrouillon,
  type ErreursBrouillon,
  type LignePanier,
  type ProduitCatalogue,
} from './commandeBrouillon';

// ── Types des réponses backend utilisées ici ─────────────────
interface Client {
  id: string;
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  isActive?: boolean;
}
interface Adresse {
  id: string;
  nomComplet: string;
  telephone: string;
  rue: string;
  ville: string;
  region?: string | null;
  pays?: string;
  isDefault?: boolean;
}
interface CommandeCreee {
  id: string;
  reference: string;
  statut: string;
  montantTotal: string | number;
  fraisLivraison: string | number;
  items?: { quantite: number }[];
}

// ── API : uniquement des routes existantes du backend ────────
const api = {
  clients: (search: string) =>
    shopClient
      .get<{ users?: Client[] }>('/admin/users', { params: { search: search || undefined, limit: 8 } })
      .then((r) => r?.users ?? []),
  produits: (search: string) =>
    shopClient
      .get<{ produits?: ProduitCatalogue[] }>('/admin/produits', {
        params: { search: search || undefined, isActive: true, statutValidation: 'valide', limit: 8 },
      })
      .then((r) => r?.produits ?? []),
  adresses: (clientId: string) =>
    shopClient
      .get<{ adresses?: Adresse[] }>(`/admin/users/clients/${clientId}/adresses`)
      .then((r) => r?.adresses ?? []),
  ajouterAdresse: (clientId: string, data: Record<string, unknown>) =>
    shopClient.post<{ adresse?: Adresse }>(`/admin/users/clients/${clientId}/adresses`, data),
  // Route publique : tarif configuré pour la ville (null → tarif par défaut du serveur).
  fraisVille: (ville: string) =>
    shopClient
      .get<{ frais?: { montant: string | number } | null }>(`/frais-livraisons/${encodeURIComponent(ville)}`)
      .then((r) => (r?.frais ? Number(r.frais.montant) : null)),
  creer: (payload: ReturnType<typeof construirePayload>) =>
    shopClient.post<{ commande: CommandeCreee }>('/admin/commandes', payload),
};

const METHODES = [
  { value: 'cash_livraison', label: 'Paiement à la livraison' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'carte', label: 'Carte bancaire' },
];

const STATUT_LIBELLES: Record<string, string> = {
  en_attente: 'En attente',
  validee: 'Validée',
};

const CHAMP =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300';

const nomClient = (c: Client) => `${c.prenom ?? ''} ${c.nom ?? ''}`.trim() || c.email || 'Client';

function useDebounce<T>(valeur: T, delai = 300) {
  const [v, setV] = useState(valeur);
  useEffect(() => {
    const t = setTimeout(() => setV(valeur), delai);
    return () => clearTimeout(t);
  }, [valeur, delai]);
  return v;
}

function Carte({
  numero,
  titre,
  action,
  children,
}: {
  numero: number;
  titre: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm" aria-labelledby={`etape-${numero}`}>
      <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-gray-100">
        <h2 id={`etape-${numero}`} className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
            {numero}
          </span>
          {titre}
        </h2>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

const MessageErreur = ({ id, children }: { id?: string; children?: ReactNode }) =>
  children ? (
    <p id={id} role="alert" className="mt-2 text-sm text-red-600">
      {children}
    </p>
  ) : null;

// ── Section 1 : client ────────────────────────────────────────
function SelectionClient({
  client,
  onChange,
  erreur,
}: {
  client: Client | null;
  onChange: (c: Client | null) => void;
  erreur?: string;
}) {
  const [recherche, setRecherche] = useState('');
  const terme = useDebounce(recherche.trim());
  const { data: clients = [], isFetching, isError } = useQuery({
    queryKey: ['commande-creation', 'clients', terme],
    queryFn: () => api.clients(terme),
    enabled: !client,
    staleTime: 30_000,
  });

  if (client) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{nomClient(client)}</p>
          <p className="text-sm text-gray-600 wrap-anywhere">
            {client.email}
            {client.telephone ? ` · ${client.telephone}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        >
          Changer de client
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="recherche-client" className="text-sm font-medium text-gray-700 block mb-1">
        Rechercher un client
      </label>
      <input
        id="recherche-client"
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Nom, prénom ou email…"
        autoComplete="off"
        aria-invalid={!!erreur}
        aria-describedby={erreur ? 'erreur-client' : undefined}
        className={CHAMP}
      />
      <MessageErreur id="erreur-client">{erreur}</MessageErreur>
      <div className="mt-3 rounded-lg border border-gray-100 divide-y divide-gray-50 max-h-72 overflow-y-auto">
        {isError ? (
          <p className="p-3 text-sm text-red-600">Impossible de charger les clients.</p>
        ) : isFetching && clients.length === 0 ? (
          <p className="p-3 text-sm text-gray-400">Recherche…</p>
        ) : clients.length === 0 ? (
          <p className="p-3 text-sm text-gray-400">Aucun client trouvé.</p>
        ) : (
          clients.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c)}
              disabled={c.isActive === false}
              className="w-full text-left px-3 py-2.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="block text-sm font-medium text-gray-900">
                {nomClient(c)}
                {c.isActive === false && <span className="ml-2 text-xs text-red-500">(désactivé)</span>}
              </span>
              <span className="block text-xs text-gray-500 wrap-anywhere">
                {c.email}
                {c.telephone ? ` · ${c.telephone}` : ''}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Adresse de livraison (liste + ajout) ──────────────────────
const ADRESSE_VIDE = { nomComplet: '', telephone: '', rue: '', ville: '', region: '' };

function SelectionAdresse({
  client,
  adresseId,
  onChange,
  erreur,
}: {
  client: Client;
  adresseId: string;
  onChange: (a: Adresse | null) => void;
  erreur?: string;
}) {
  const qc = useQueryClient();
  const [formulaire, setFormulaire] = useState<typeof ADRESSE_VIDE | null>(null);
  const { data: adresses = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['commande-creation', 'adresses', client.id],
    queryFn: () => api.adresses(client.id),
  });

  // Présélection de l'adresse par défaut (ou de la seule adresse).
  useEffect(() => {
    if (adresseId || adresses.length === 0) return;
    onChange(adresses.find((a) => a.isDefault) ?? adresses[0]);
  }, [adresses, adresseId, onChange]);

  const ajout = useMutation({
    mutationFn: (data: typeof ADRESSE_VIDE) => api.ajouterAdresse(client.id, data),
    onSuccess: (res) => {
      showSuccess(res);
      setFormulaire(null);
      qc.invalidateQueries({ queryKey: ['commande-creation', 'adresses', client.id] });
      if (res?.adresse) onChange(res.adresse);
    },
    onError: (e) => showError(e),
  });

  if (isLoading) return <p className="text-sm text-gray-400">Chargement des adresses…</p>;
  if (isError)
    return (
      <p className="text-sm text-red-600">
        Impossible de charger les adresses.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Réessayer
        </button>
      </p>
    );

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Adresse de livraison</p>
      {adresses.length === 0 && !formulaire && (
        <p className="text-sm text-gray-500 mb-2">Ce client n'a encore aucune adresse enregistrée.</p>
      )}
      <div className="space-y-2" role="radiogroup" aria-label="Adresse de livraison">
        {adresses.map((a) => (
          <label
            key={a.id}
            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${
              a.id === adresseId ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="adresse"
              className="mt-1 accent-yellow-500"
              checked={a.id === adresseId}
              onChange={() => onChange(a)}
            />
            <span className="text-sm">
              <span className="font-medium text-gray-900">{a.nomComplet}</span>
              {a.isDefault && <span className="ml-2 text-xs text-yellow-700">Par défaut</span>}
              <span className="block text-gray-600">
                {a.rue}, {a.ville}
                {a.region ? ` (${a.region})` : ''}
              </span>
              <span className="block text-gray-500">{a.telephone}</span>
            </span>
          </label>
        ))}
      </div>
      <MessageErreur>{erreur}</MessageErreur>

      {formulaire ? (
        <div className="mt-3 rounded-lg border border-gray-200 p-3 space-y-3">
          <p className="text-sm font-medium text-gray-900">Nouvelle adresse</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                ['nomComplet', 'Nom complet *'],
                ['telephone', 'Téléphone *'],
                ['rue', 'Adresse (rue, quartier) *'],
                ['ville', 'Ville *'],
                ['region', 'Région'],
              ] as const
            ).map(([cle, libelle]) => (
              <div key={cle} className={cle === 'rue' ? 'sm:col-span-2' : ''}>
                <label htmlFor={`adresse-${cle}`} className="text-xs font-medium text-gray-600 block mb-1">
                  {libelle}
                </label>
                <input
                  id={`adresse-${cle}`}
                  value={formulaire[cle]}
                  onChange={(e) => setFormulaire({ ...formulaire, [cle]: e.target.value })}
                  className={CHAMP}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormulaire(null)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={ajout.isPending}
              onClick={() => {
                const { nomComplet, telephone, rue, ville } = formulaire;
                if (![nomComplet, telephone, rue, ville].every((v) => v.trim())) {
                  showError('Renseignez le nom, le téléphone, l’adresse et la ville.');
                  return;
                }
                ajout.mutate({ ...formulaire, region: formulaire.region || '' });
              }}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-60"
            >
              {ajout.isPending ? 'Enregistrement…' : 'Enregistrer l’adresse'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFormulaire({ ...ADRESSE_VIDE, nomComplet: nomClient(client), telephone: client.telephone ?? '' })}
          className="mt-3 text-sm font-medium text-yellow-700 hover:underline"
        >
          + Ajouter une adresse
        </button>
      )}
    </div>
  );
}

// ── Section 2 : produits ──────────────────────────────────────
function RechercheProduits({ panier, onAjouter }: { panier: LignePanier[]; onAjouter: (p: ProduitCatalogue) => void }) {
  const [recherche, setRecherche] = useState('');
  const terme = useDebounce(recherche.trim());
  const { data: produits = [], isFetching, isError } = useQuery({
    queryKey: ['commande-creation', 'produits', terme],
    queryFn: () => api.produits(terme),
    // Le stock change à chaque commande : toujours relu à l'ouverture.
    staleTime: 0,
  });

  return (
    <div>
      <label htmlFor="recherche-produit" className="text-sm font-medium text-gray-700 block mb-1">
        Rechercher un produit
      </label>
      <input
        id="recherche-produit"
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Nom ou description du produit…"
        autoComplete="off"
        className={CHAMP}
      />
      <ul className="mt-3 rounded-lg border border-gray-100 divide-y divide-gray-50 max-h-80 overflow-y-auto">
        {isError ? (
          <li className="p-3 text-sm text-red-600">Impossible de charger les produits.</li>
        ) : isFetching && produits.length === 0 ? (
          <li className="p-3 text-sm text-gray-400">Recherche…</li>
        ) : produits.length === 0 ? (
          <li className="p-3 text-sm text-gray-400">Aucun produit disponible.</li>
        ) : (
          produits.map((p) => {
            const stock = p.stock === undefined || p.stock === null ? null : Number(p.stock);
            const dejaAjoute = panier.find((l) => l.produitId === p.id);
            const epuise = stock !== null && stock <= 0;
            return (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.nom}</p>
                  <p className="text-xs text-gray-500">
                    {formaterFcfa(p.prix)}
                    {p.venduAuPoids ? ' / kg' : ''}
                    {' · '}
                    <span className={epuise ? 'text-red-600' : stock !== null && stock <= 5 ? 'text-orange-600' : ''}>
                      {stock === null ? 'stock non suivi' : epuise ? 'Rupture de stock' : `${stock} en stock`}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAjouter(p)}
                  disabled={epuise}
                  aria-label={`Ajouter ${p.nom}`}
                  className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-lg border border-yellow-300 text-yellow-700 hover:bg-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {dejaAjoute ? '+1' : 'Ajouter'}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function TablePanier({
  panier,
  erreurs,
  onQuantite,
  onRetirer,
}: {
  panier: LignePanier[];
  erreurs: Record<string, string>;
  onQuantite: (id: string, q: string) => void;
  onRetirer: (id: string) => void;
}) {
  if (panier.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
        Aucun produit sélectionné. Recherchez un produit ci-dessus pour l'ajouter.
      </div>
    );
  }
  return (
    <div className="tbl-wrap">
      <table className="w-full text-sm tbl-cards">
        <thead>
          <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
            <th className="py-2 pr-3 font-medium">Produit</th>
            <th className="py-2 px-3 font-medium text-right">Prix</th>
            <th className="py-2 px-3 font-medium">Quantité</th>
            <th className="py-2 px-3 font-medium text-right">Sous-total</th>
            <th className="py-2 pl-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {panier.map((l) => {
            const erreur = erreurs[l.produitId];
            const q = lireQuantite(l.quantite);
            return (
              <tr key={l.produitId} className="border-b border-gray-50 align-top">
                <td className="py-3 pr-3 tbl-primary">
                  <span className="font-medium text-gray-900">{l.nom}</span>
                  {l.stock !== null && <span className="block text-xs text-gray-400">{l.stock} en stock</span>}
                </td>
                <td className="py-3 px-3 text-right whitespace-nowrap" data-label="Prix">
                  {formaterFcfa(l.prix)}
                  {l.venduAuPoids ? ' / kg' : ''}
                </td>
                <td className="py-3 px-3" data-label="Quantité">
                  <div className="inline-flex items-center rounded-lg border border-gray-200">
                    <button
                      type="button"
                      onClick={() => onQuantite(l.produitId, String(Math.max(1, (q ?? 1) - 1)))}
                      disabled={(q ?? 1) <= 1}
                      aria-label={`Diminuer la quantité de ${l.nom}`}
                      className="w-8 h-9 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={l.quantite}
                      onChange={(e) => onQuantite(l.produitId, e.target.value)}
                      aria-label={`Quantité de ${l.nom}`}
                      aria-invalid={!!erreur}
                      className={`w-14 h-9 text-center border-x border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 ${
                        erreur ? 'text-red-600 bg-red-50' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => onQuantite(l.produitId, String((q ?? 0) + 1))}
                      disabled={l.stock !== null && (q ?? 0) >= l.stock}
                      aria-label={`Augmenter la quantité de ${l.nom}`}
                      className="w-8 h-9 text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                  {erreur && (
                    <p role="alert" className="mt-1 text-xs text-red-600">
                      {erreur}
                    </p>
                  )}
                </td>
                <td className="py-3 px-3 text-right font-medium whitespace-nowrap" data-label="Sous-total">
                  {formaterFcfa(sousTotalLigne(l))}
                </td>
                <td className="py-3 pl-3 text-right tbl-actions" data-label="Action">
                  <button
                    type="button"
                    onClick={() => onRetirer(l.produitId)}
                    aria-label={`Supprimer ${l.nom}`}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Confirmation après création ───────────────────────────────
function CommandeCreeeVue({
  commande,
  client,
  onVoir,
  onListe,
  onNouvelle,
}: {
  commande: CommandeCreee;
  client: Client | null;
  onVoir: () => void;
  onListe: () => void;
  onNouvelle: () => void;
}) {
  const nbArticles = (commande.items ?? []).reduce((s, i) => s + Number(i.quantite || 0), 0);
  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900">Commande créée avec succès</h1>
      <p className="mt-1 text-sm text-gray-500">Elle est enregistrée et visible dans la liste des commandes.</p>
      <dl className="mt-6 grid grid-cols-2 gap-3 text-left text-sm">
        <div className="rounded-lg bg-gray-50 p-3">
          <dt className="text-gray-500">Référence</dt>
          <dd className="font-mono text-xs font-medium text-gray-900 wrap-anywhere">{commande.reference}</dd>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <dt className="text-gray-500">Statut</dt>
          <dd className="font-medium text-gray-900">{STATUT_LIBELLES[commande.statut] ?? commande.statut}</dd>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <dt className="text-gray-500">Client</dt>
          <dd className="font-medium text-gray-900">{client ? nomClient(client) : '—'}</dd>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <dt className="text-gray-500">Articles</dt>
          <dd className="font-medium text-gray-900">{nbArticles}</dd>
        </div>
        <div className="col-span-2 rounded-lg bg-yellow-50 p-3">
          <dt className="text-gray-600">Total enregistré (dont livraison {formaterFcfa(commande.fraisLivraison)})</dt>
          <dd className="text-lg font-bold text-gray-900">{formaterFcfa(commande.montantTotal)}</dd>
        </div>
      </dl>
      <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-2 justify-center [&>button]:whitespace-nowrap">
        <button type="button" onClick={onVoir} className="px-4 py-2 text-sm font-semibold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600">
          Voir la commande
        </button>
        <button type="button" onClick={onListe} className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
          Retour à la liste
        </button>
        <button type="button" onClick={onNouvelle} className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-100">
          Créer une autre commande
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function OrderCreatePage() {
  const navigate = useNavigate();
  const retour = useRetour('/boutique/commandes');
  const qc = useQueryClient();

  const [client, setClient] = useState<Client | null>(null);
  const [adresse, setAdresse] = useState<Adresse | null>(null);
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [methode, setMethode] = useState('cash_livraison');
  const [note, setNote] = useState('');
  const [dateLivraison, setDateLivraison] = useState('');
  const [tentee, setTentee] = useState(false);
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);
  const [creee, setCreee] = useState<CommandeCreee | null>(null);
  const [clientCree, setClientCree] = useState<Client | null>(null);
  // Garde synchrone contre le double-clic (l'état React se met à jour après le rendu).
  const envoiEnCours = useRef(false);

  const modifie = !!client || panier.length > 0 || !!note || !!dateLivraison || methode !== 'cash_livraison';
  useConfirmationSortie(modifie);

  const erreurs: ErreursBrouillon = validerBrouillon({
    clientId: client?.id ?? '',
    adresseId: adresse?.id ?? '',
    panier,
  });
  // Avant la première tentative, seules les erreurs de quantité sont signalées.
  const afficher = tentee ? erreurs : { lignes: erreurs.lignes };

  const { data: fraisVille, isFetching: fraisEnCours } = useQuery({
    queryKey: ['commande-creation', 'frais', adresse?.ville],
    queryFn: () => api.fraisVille(adresse!.ville),
    enabled: !!adresse?.ville,
    staleTime: 60_000,
  });
  const sousTotal = totalArticles(panier);

  const reinitialiser = () => {
    setClient(null);
    setAdresse(null);
    setPanier([]);
    setMethode('cash_livraison');
    setNote('');
    setDateLivraison('');
    setTentee(false);
    setErreurServeur(null);
  };

  const mutation = useMutation({
    mutationFn: api.creer,
    onSuccess: (res) => {
      showSuccess(res, 'Commande créée avec succès.');
      // La liste et les KPI sont relus depuis le backend (aucune injection locale).
      qc.invalidateQueries({ queryKey: ['commandes'] });
      qc.invalidateQueries({ queryKey: ['commandes-kpi'] });
      // Le stock des produits commandés a baissé.
      qc.invalidateQueries({ queryKey: ['commande-creation', 'produits'] });
      setClientCree(client);
      setCreee(res.commande);
      reinitialiser();
    },
    onError: (e: { message?: string }) => {
      // 401 : l'intercepteur HTTP gère déjà la session expirée (redirection).
      const message = e?.message || 'La commande n’a pas pu être créée.';
      setErreurServeur(message);
      showError(message);
      // Le stock a pu changer : on relit les produits.
      qc.invalidateQueries({ queryKey: ['commande-creation', 'produits'] });
    },
    onSettled: () => {
      envoiEnCours.current = false;
    },
  });

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault();
    if (envoiEnCours.current || mutation.isPending) return;
    setTentee(true);
    setErreurServeur(null);
    const message = premiereErreur(erreurs);
    if (message) {
      showError(message);
      return;
    }
    envoiEnCours.current = true;
    mutation.mutate(
      construirePayload({
        clientId: client!.id,
        adresseId: adresse!.id,
        panier,
        methode,
        note,
        dateLivraisonSouhaitee: dateLivraison,
      })
    );
  };

  if (creee) {
    return (
      <div>
        <AdminBackButton parent="/boutique/commandes" className="mb-3" />
        <CommandeCreeeVue
          commande={creee}
          client={clientCree}
          onVoir={() => navigate(`/boutique/commandes/${creee.id}`, { replace: true })}
          onListe={retour}
          onNouvelle={() => setCreee(null)}
        />
      </div>
    );
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-6xl mx-auto">
      <AdminBackButton parent="/boutique/commandes" className="mb-3" />
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Créer une commande</h1>
        <p className="text-sm text-gray-500 mt-1">
          Commande passée pour le compte d'un client. Les prix et le stock sont vérifiés par le serveur à la validation.
        </p>
      </div>

      <form onSubmit={soumettre} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
          <Carte numero={1} titre="Client">
            <SelectionClient
              client={client}
              onChange={(c) => {
                setClient(c);
                setAdresse(null);
              }}
              erreur={afficher.client}
            />
            {client && (
              <div className="mt-4">
                <SelectionAdresse client={client} adresseId={adresse?.id ?? ''} onChange={setAdresse} erreur={afficher.adresse} />
              </div>
            )}
          </Carte>

          <Carte
            numero={2}
            titre="Produits"
            action={panier.length > 0 && <span className="text-xs text-gray-500">{panier.length} produit(s)</span>}
          >
            <RechercheProduits panier={panier} onAjouter={(p) => setPanier((pn) => ajouterAuPanier(pn, p))} />
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Produits sélectionnés</h3>
              <TablePanier
                panier={panier}
                erreurs={afficher.lignes}
                onQuantite={(id, q) => setPanier((pn) => modifierQuantite(pn, id, q))}
                onRetirer={(id) => setPanier((pn) => retirerDuPanier(pn, id))}
              />
              <MessageErreur>{afficher.panier}</MessageErreur>
            </div>
          </Carte>

          <Carte numero={3} titre="Paiement et livraison">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="methode" className="text-sm font-medium text-gray-700 block mb-1">
                  Méthode de paiement
                </label>
                <select id="methode" value={methode} onChange={(e) => setMethode(e.target.value)} className={CHAMP}>
                  {METHODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="date-livraison" className="text-sm font-medium text-gray-700 block mb-1">
                  Date de livraison souhaitée <span className="text-gray-400 font-normal">(facultatif)</span>
                </label>
                <input
                  id="date-livraison"
                  type="date"
                  min={aujourdhui}
                  value={dateLivraison}
                  onChange={(e) => setDateLivraison(e.target.value)}
                  className={CHAMP}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="note" className="text-sm font-medium text-gray-700 block mb-1">
                  Note <span className="text-gray-400 font-normal">(facultatif, visible par le client)</span>
                </label>
                <textarea
                  id="note"
                  rows={2}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className={`${CHAMP} resize-none`}
                  placeholder="Instructions de livraison…"
                />
              </div>
            </div>
          </Carte>
        </div>

        <aside className="lg:sticky lg:top-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5" aria-label="Récapitulatif">
          <h2 className="font-semibold text-gray-900 mb-4">Récapitulatif</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Client</dt>
              <dd className="text-right font-medium text-gray-900 truncate">{client ? nomClient(client) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Livraison à</dt>
              <dd className="text-right text-gray-900">{adresse?.ville ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 pt-2 border-t border-gray-100">
              <dt className="text-gray-500">Sous-total articles</dt>
              <dd className="font-medium text-gray-900">{formaterFcfa(sousTotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Frais de livraison</dt>
              <dd className="text-right text-gray-900">
                {!adresse ? '—' : fraisEnCours ? '…' : fraisVille != null ? formaterFcfa(fraisVille) : 'Tarif par défaut'}
              </dd>
            </div>
            <div className="flex justify-between gap-3 pt-3 border-t border-gray-200 text-base">
              <dt className="font-semibold text-gray-900">Total estimé</dt>
              <dd className="font-bold text-gray-900">
                {fraisVille != null ? formaterFcfa(sousTotal + fraisVille) : `${formaterFcfa(sousTotal)} + livraison`}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-gray-400">
            Montant indicatif : le total définitif est recalculé par le serveur à partir des prix enregistrés.
          </p>

          {erreurServeur && (
            <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {erreurServeur}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              aria-busy={mutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mutation.isPending && (
                <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" aria-hidden="true" />
              )}
              {mutation.isPending ? 'Création en cours…' : 'Créer la commande'}
            </button>
            <button
              type="button"
              onClick={retour}
              disabled={mutation.isPending}
              className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-60"
            >
              Annuler
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
