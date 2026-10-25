import { Link, useParams } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
import { useQuery } from '@tanstack/react-query';
import AdminBackButton from '@/shared/components/AdminBackButton';
import shopClient from '@/infrastructure/http/shop.client';
import { Bloc, Chiffre, Titre, Vide } from '@/shared/components/dashboard/Blocs';
import { date, fcfa, nombre } from '@/shared/utils/format';
import type { ActiviteClient } from '@/domains/shop/types/indicateurs';
import { useOuvrirLigne } from '@/shared/hooks/useOuvrirLigne';

/** La fiche telle que la renvoie `GET /admin/users/:id`, activité incluse. */
interface FicheClient {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  activite?: ActiviteClient;
}

interface CommandeClient {
  id: string;
  reference: string;
  statut: string;
  montantTotal: string | number;
  createdAt: string;
  items?: Array<{ id: string; quantite: number }>;
}

const COULEUR_STATUT: Record<string, string> = {
  en_attente: 'bg-orange-100 text-orange-700',
  en_modification: 'bg-amber-100 text-amber-800',
  validee: 'bg-blue-100 text-blue-700',
  en_preparation: 'bg-indigo-100 text-indigo-700',
  expediee: 'bg-purple-100 text-purple-700',
  livree: 'bg-green-100 text-green-700',
  annulee: 'bg-red-100 text-red-700',
  rejetee: 'bg-gray-200 text-gray-600',
};

export default function UserDetailPage() {
  const ouvrir = useOuvrirLigne();
  const { id } = useParams<{ id: string }>();

  const { data: user, isLoading } = useQuery<FicheClient>({
    queryKey: ['user', id],
    queryFn: () =>
      shopClient
        .get<{ user?: FicheClient } & FicheClient>(`/admin/users/${id}`)
        .then((r) => r.user ?? r),
    enabled: !!id,
  });

  // Récapitulatif des commandes du client, demandé au cahier des charges.
  // Requête séparée de la fiche : l'identité s'affiche sans attendre un
  // historique qui peut compter des centaines de lignes.
  const commandesQ = useQuery<CommandeClient[]>({
    queryKey: ['commandes-client', id],
    queryFn: () =>
      shopClient
        .get<{ commandes?: CommandeClient[] }>(`/admin/commandes/client/${id}`)
        .then((r) => r.commandes ?? []),
    enabled: !!id,
    staleTime: 30_000,
  });

  if (isLoading)
    return (
      <div className="max-w-3xl mx-auto">
        <AdminBackButton parent="/boutique/clients" className="mb-3" />
        <div className="p-8 text-center text-gray-400">Chargement…</div>
      </div>
    );
  if (!user)
    return (
      <div className="max-w-3xl mx-auto">
        <AdminBackButton parent="/boutique/clients" className="mb-3" />
        <div className="p-8 text-center text-red-400">Utilisateur introuvable</div>
      </div>
    );

  const commandes = commandesQ.data ?? [];
  const activite = user.activite;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <AdminBackButton parent="/boutique/clients" />

      {/* ── Identité : une carte de profil plutôt qu'une grille de champs ── */}
      <Bloc className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <span className="w-16 h-16 rounded-2xl bg-yellow-50 text-yellow-700 text-xl font-bold flex items-center justify-center shrink-0">
            {`${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase() || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
              {user.prenom} {user.nom}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {user.isActive ? 'Actif' : 'Bloqué'}
              </span>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  user.isVerified ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {user.isVerified ? 'Vérifié' : 'Non vérifié'}
              </span>
              <span className="text-sm text-gray-500">Inscrit le {date(user.createdAt)}</span>
            </div>
          </div>
        </div>
        <dl className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
              <Icon name="mail" size={18} />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</dt>
              <dd className="text-[15px] text-gray-900 break-words">{user.email}</dd>
            </div>
          </div>
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
              <Icon name="phone" size={18} />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Téléphone</dt>
              <dd className="text-[15px] text-gray-900">{user.telephone || '—'}</dd>
            </div>
          </div>
        </dl>
      </Bloc>

      {/* ── Activité commerciale ─────────────────────────────────────────── */}
      {activite && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Chiffre libelle="Commandes" valeur={nombre(activite.nbCommandes)} />
          <Chiffre
            libelle="Livrées"
            valeur={nombre(activite.nbCommandesLivrees)}
            ton={activite.nbCommandesLivrees > 0 ? 'bon' : 'neutre'}
          />
          <Chiffre
            libelle="Annulées"
            valeur={nombre(activite.nbCommandesAnnulees)}
            ton={activite.nbCommandesAnnulees > 0 ? 'attention' : 'neutre'}
          />
          <Chiffre
            libelle="Total dépensé"
            valeur={fcfa(activite.montantDepense)}
            aide={
              activite.derniereCommande
                ? `Dernière commande le ${date(activite.derniereCommande)}`
                : 'Aucune commande'
            }
          />
        </div>
      )}

      {/* ── Historique des commandes ─────────────────────────────────────── */}
      <Bloc>
        <div className="flex flex-wrap items-baseline justify-between gap-2 p-4 pb-0">
          <Titre>Historique des commandes</Titre>
          {commandes.length > 0 && (
            <p className="text-xs text-gray-400">{nombre(commandes.length)} commande(s)</p>
          )}
        </div>

        {commandesQ.isLoading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Chargement de l'historique…</p>
        ) : commandesQ.isError ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            Impossible de charger l'historique des commandes.
          </p>
        ) : commandes.length === 0 ? (
          <Vide texte="Ce client n'a passé aucune commande." />
        ) : (
          <div className="tbl-wrap mt-3">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-2.5 font-medium">Référence</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium text-right">Articles</th>
                  <th className="px-4 py-2.5 font-medium text-right">Montant</th>
                  <th className="px-4 py-2.5 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commandes.map((c) => (
                  <tr key={c.id} {...ouvrir(`/boutique/commandes/${c.id}`)}>
                    <td data-label="Référence" className="px-4 py-2.5">
                      <Link
                        to={`/boutique/commandes/${c.id}`}
                        className="font-mono text-xs font-medium text-gray-900 hover:underline"
                      >
                        {c.reference}
                      </Link>
                    </td>
                    <td data-label="Date" className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {date(c.createdAt)}
                    </td>
                    <td data-label="Articles" className="px-4 py-2.5 text-right text-gray-600 tabular-nums">
                      {nombre((c.items ?? []).reduce((total, i) => total + Number(i.quantite || 0), 0))}
                    </td>
                    <td data-label="Montant" className="px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                      {fcfa(c.montantTotal)}
                    </td>
                    <td data-label="Statut" className="px-4 py-2.5">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          COULEUR_STATUT[c.statut] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {String(c.statut).replace(/_/g, ' ')}
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
