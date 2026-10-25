import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminBackButton from '@/shared/components/AdminBackButton';
import Icon from '@/shared/components/dashboard/Icon';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import SelecteurPeriode from '@/shared/components/dashboard/SelecteurPeriode';
import { Bloc, Squelette, TitreIcone } from '@/shared/components/dashboard/Blocs';
import { bornesDepuisPeriode, date, libelleBornes } from '@/shared/utils/format';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';
import {
  adresseBoutique,
  descriptionBoutique,
  estBloque,
  nomBoutique,
  nomComplet,
  telephoneVendeur,
  vendeursApi,
  type Vendeur,
} from '@/domains/shop/api/vendeurs.api';
import ModaleModifierVendeur from './ModaleModifierVendeur';
import { useActionsVendeur } from './useActionsVendeur';
import {
  SectionAvis,
  SectionIndicateurs,
  SectionProduits,
  SectionReversements,
} from './sectionsVendeur';

const LISTE = '/boutique/vendeurs';

/** Une donnée d'identité : libellé au-dessus, valeur en dessous. */
function Champ({
  libelle,
  children,
  large = false,
}: {
  libelle: string;
  children: React.ReactNode;
  /** Occupe toute la largeur : adresse, description, information légale. */
  large?: boolean;
}) {
  return (
    <div className={large ? 'sm:col-span-2' : undefined}>
      <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{libelle}</p>
      <div className="text-gray-900 break-words">{children}</div>
    </div>
  );
}

/**
 * Fiche d'un vendeur : identité, coordonnées, indicateurs commerciaux,
 * catalogue, reversements et avis reçus, plus les actions du compte.
 *
 * L'identité vient de `GET /admin/vendeurs/:id`; chaque section charge ensuite
 * ses propres données (voir `sectionsVendeur.tsx`) pour qu'une analytique en
 * panne n'emporte pas toute la page.
 *
 * Donnée demandée mais absente de l'API : il n'existe aucune route qui liste
 * les commandes d'un vendeur côté administration (`/admin/commandes` filtre
 * par client, pas par vendeur) — les volumes de vente sont donc présentés
 * sous forme d'indicateurs, et l'historique financier par les reversements.
 */
export default function VendeurDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [periode, setPeriode] = useState<FiltrePeriode>({ periode: 'tout' });
  const [enEdition, setEnEdition] = useState(false);
  const actions = useActionsVendeur();

  const bornes = bornesDepuisPeriode(periode);

  const ficheQ = useQuery<Vendeur>({
    queryKey: ['vendeur', id],
    // Le backend répond `{ vendeur }`; le repli couvre une réponse à plat.
    queryFn: () => vendeursApi.detail(id!).then((r) => r.vendeur ?? (r as Vendeur)),
    enabled: !!id,
  });

  if (ficheQ.isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <AdminBackButton parent={LISTE} className="mb-3" />
        <Squelette tuiles={4} />
      </div>
    );
  }

  if (ficheQ.isError || !ficheQ.data) {
    return (
      <div className="max-w-5xl mx-auto">
        <AdminBackButton parent={LISTE} className="mb-3" />
        <Bloc>
          <ErreurChargement
            erreur={ficheQ.error}
            onReessayer={ficheQ.refetch}
            defaut="Ce vendeur est introuvable."
          />
        </Bloc>
      </div>
    );
  }

  const vendeur = ficheQ.data;
  const bloque = estBloque(vendeur);
  const boutique = nomBoutique(vendeur);
  const telephone = telephoneVendeur(vendeur);
  const adresse = adresseBoutique(vendeur);
  const description = descriptionBoutique(vendeur);
  const infoLegale = vendeur.boutique?.infoLegale || '';
  const logo = vendeur.logoBoutique || vendeur.boutique?.logo || '';
  const actionEnCours = actions.statut.isPending || actions.renvoyer.isPending;

  return (
    <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4">
      <AdminBackButton parent={LISTE} />

      {/* ── En-tête : identité de la boutique, statut et actions ─────────── */}
      <Bloc className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3 sm:gap-4">
          {logo ? (
            <img
              src={logo}
              alt=""
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-gray-100 shrink-0"
            />
          ) : (
            <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center shrink-0">
              <Icon name="store" size={24} />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
              {boutique === '—' ? nomComplet(vendeur) : boutique}
            </h1>
            <p className="text-sm text-gray-500 break-words">{nomComplet(vendeur)}</p>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  bloque ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}
              >
                {bloque ? 'Bloqué' : 'Actif'}
              </span>
              {vendeur.isVerified !== undefined && (
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    vendeur.isVerified ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {vendeur.isVerified ? 'Email vérifié' : 'Email non vérifié'}
                </span>
              )}
              {vendeur.mustChangePassword && (
                <span
                  className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700"
                  title="Le vendeur devra choisir un nouveau mot de passe à sa prochaine connexion"
                >
                  Mot de passe temporaire
                </span>
              )}
              {vendeur.createdAt && (
                <span className="text-xs text-gray-400">
                  Inscrit le {date(vendeur.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mêmes actions que la liste, sur le même vendeur. */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setEnEdition(true)}
            className="px-3.5 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={() => actions.demanderRenvoi(vendeur)}
            disabled={actionEnCours}
            title="Renvoyer les identifiants par email"
            className="px-3.5 py-2 rounded-lg text-sm font-medium bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors disabled:opacity-50"
          >
            Renvoyer les identifiants
          </button>
          <button
            type="button"
            onClick={() => actions.demanderStatut(vendeur)}
            disabled={actionEnCours}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
              bloque
                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            {bloque ? 'Débloquer' : 'Bloquer'}
          </button>
        </div>
      </Bloc>

      {/* ── Informations et coordonnées ──────────────────────────────────── */}
      <Bloc className="p-4 sm:p-5">
        <TitreIcone icone="user" accent="indigo">
          Informations et coordonnées
        </TitreIcone>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Champ libelle="Nom complet">{nomComplet(vendeur)}</Champ>
          <Champ libelle="Email">
            {vendeur.email ? (
              <a
                href={`mailto:${vendeur.email}`}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <Icon name="mail" size={14} className="text-gray-400 shrink-0" />
                {vendeur.email}
              </a>
            ) : (
              '—'
            )}
          </Champ>
          <Champ libelle="Téléphone">
            {telephone ? (
              <a
                href={`tel:${telephone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <Icon name="phone" size={14} className="text-gray-400 shrink-0" />
                {telephone}
              </a>
            ) : (
              '—'
            )}
          </Champ>
          <Champ libelle="Nom de la boutique">{boutique}</Champ>
          <Champ libelle="Adresse de la boutique" large>
            {adresse ? (
              <span className="inline-flex items-start gap-1.5">
                <Icon name="map-pin" size={14} className="text-gray-400 shrink-0 mt-1" />
                {adresse}
              </span>
            ) : (
              '—'
            )}
          </Champ>
          {description && (
            <Champ libelle="Description" large>
              {description}
            </Champ>
          )}
          {infoLegale && (
            <Champ libelle="Information légale" large>
              {infoLegale}
            </Champ>
          )}
        </div>
      </Bloc>

      {/* ── Indicateurs commerciaux, sur la période choisie ──────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          Indicateurs : {libelleBornes({ debut: bornes.debut ?? null, fin: bornes.fin ?? null })}
        </p>
        <SelecteurPeriode valeur={periode} onChange={setPeriode} />
      </div>
      <SectionIndicateurs vendeurId={vendeur.id} bornes={bornes} />

      <SectionProduits vendeurId={vendeur.id} />
      <SectionReversements vendeurId={vendeur.id} />
      <SectionAvis vendeurId={vendeur.id} />

      {enEdition && (
        <ModaleModifierVendeur
          vendeur={vendeur}
          enCours={actions.modifier.isPending}
          onFermer={() => setEnEdition(false)}
          onEnregistrer={(payload) =>
            actions.modifier.mutate(
              { id: vendeur.id, payload },
              { onSuccess: () => setEnEdition(false) }
            )
          }
        />
      )}
    </div>
  );
}
