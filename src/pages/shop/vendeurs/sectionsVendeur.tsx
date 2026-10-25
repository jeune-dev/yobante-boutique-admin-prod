import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Icon from '@/shared/components/dashboard/Icon';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import Pagination from '@/shared/components/tables/Pagination';
import { Bloc, Chiffre, TitreIcone, Vide } from '@/shared/components/dashboard/Blocs';
import { useTableauVendeurs } from '@/domains/shop/hooks/useAnalytique';
import { useComptesVendeurs, useReversements } from '@/domains/shop/hooks/useFinance';
import { useFiabiliteVendeurs } from '@/domains/shop/hooks/useIndicateurs';
import { useOuvrirLigne } from '@/shared/hooks/useOuvrirLigne';
import { date, decimal, fcfa, nombre, pourcent } from '@/shared/utils/format';
import {
  CLASSE_STATUT_REVERSEMENT,
  LIBELLE_STATUT_REVERSEMENT,
} from '@/domains/shop/types/finance';
import type { FiltrePeriode } from '@/domains/shop/types/indicateurs';
import { vendeursApi, type AvisAdmin } from '@/domains/shop/api/vendeurs.api';
import type { Produit } from '@/domains/shop/types';

/* ──────────────────────────────────────────────────────────────────────────
   Sections de la fiche vendeur.

   Chacune charge ses données pour son propre compte : une analytique en
   panne ne doit pas emporter l'identité du vendeur ni son catalogue. Toutes
   affichent donc leurs trois états — chargement, erreur, vide.
   ────────────────────────────────────────────────────────────────────────── */

/** Enveloppe commune : titre à pastille, puis le contenu de la section. */
function Section({
  icone,
  accent,
  titre,
  apercu,
  children,
}: {
  icone: string;
  accent: 'bleu' | 'vert' | 'violet' | 'ambre' | 'rose' | 'cyan' | 'orange' | 'indigo';
  titre: string;
  /** Compteur ou précision affichée à droite du titre. */
  apercu?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Bloc>
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-0">
        <TitreIcone icone={icone} accent={accent}>
          {titre}
        </TitreIcone>
        {apercu && <p className="text-xs text-gray-400">{apercu}</p>}
      </div>
      {children}
    </Bloc>
  );
}

/** Silhouette de chargement d'une section : quelques lignes grises. */
function SqueletteLignes({ lignes = 4 }: { lignes?: number }) {
  return (
    <div className="p-4 space-y-2 animate-pulse">
      {Array.from({ length: lignes }).map((_, i) => (
        <div key={i} className="h-9 bg-gray-100 rounded-lg" />
      ))}
    </div>
  );
}

// ── Indicateurs commerciaux ─────────────────────────────────────────────────

/**
 * Indicateurs commerciaux du vendeur, sur la période choisie.
 *
 * Trois sources assemblées sur l'identifiant du vendeur, comme le fait déjà
 * le tableau de bord des vendeurs : l'analytique (volumes, panier, note), la
 * finance (taux de commission, montants) et la fiabilité (incidents
 * imputables). Aucune route ne renvoie ces chiffres pour un seul vendeur :
 * on lit la liste complète puis on y retrouve la ligne qui nous intéresse.
 */
export function SectionIndicateurs({
  vendeurId,
  bornes,
}: {
  vendeurId: string;
  bornes: FiltrePeriode;
}) {
  const vendeursQ = useTableauVendeurs(bornes);
  const comptesQ = useComptesVendeurs(bornes);
  const fiabiliteQ = useFiabiliteVendeurs({ limit: 200 });

  if (vendeursQ.isLoading || comptesQ.isLoading) {
    return (
      <Section icone="bar-chart" accent="bleu" titre="Indicateurs commerciaux">
        <SqueletteLignes lignes={3} />
      </Section>
    );
  }

  if (vendeursQ.isError) {
    return (
      <Section icone="bar-chart" accent="bleu" titre="Indicateurs commerciaux">
        <ErreurChargement
          erreur={vendeursQ.error}
          onReessayer={vendeursQ.refetch}
          defaut="Impossible de charger les indicateurs commerciaux de ce vendeur."
        />
      </Section>
    );
  }

  const stats = (vendeursQ.data?.vendeurs ?? []).find((v) => v.id === vendeurId) ?? null;
  const compte = (comptesQ.data?.comptes ?? []).find((c) => c.vendeurId === vendeurId) ?? null;
  const fiabilite = (fiabiliteQ.data?.vendeurs ?? []).find((f) => f.id === vendeurId) ?? null;

  if (!stats && !compte) {
    return (
      <Section icone="bar-chart" accent="bleu" titre="Indicateurs commerciaux">
        <Vide texte="Aucune activité commerciale pour ce vendeur sur la période choisie." />
      </Section>
    );
  }

  return (
    <Section
      icone="bar-chart"
      accent="bleu"
      titre="Indicateurs commerciaux"
      apercu={comptesQ.isError ? 'Commission indisponible' : undefined}
    >
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <Chiffre
            libelle="Chiffre d'affaires"
            valeur={fcfa(stats?.chiffreAffaires ?? 0)}
            icone="coins"
            accent="vert"
          />
          <Chiffre
            libelle="Commandes"
            valeur={nombre(stats?.commandes ?? 0)}
            aide={`${nombre(stats?.commandesLivrees ?? 0)} livrée(s)`}
            icone="clipboard-list"
            accent="bleu"
          />
          <Chiffre
            libelle="Panier moyen"
            valeur={fcfa(stats?.panierMoyen ?? 0)}
            icone="shopping-cart"
            accent="indigo"
          />
          <Chiffre
            libelle="Articles vendus"
            valeur={nombre(stats?.articlesVendus ?? 0)}
            icone="package"
            accent="ambre"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <Chiffre
            libelle="Produits actifs"
            valeur={nombre(stats?.produitsActifs ?? 0)}
            icone="boxes"
            accent="cyan"
          />
          <Chiffre
            libelle="Taux d'acceptation"
            valeur={stats ? pourcent(stats.tauxAcceptation, 1) : '—'}
            ton={!stats ? 'neutre' : stats.tauxAcceptation >= 90 ? 'bon' : 'attention'}
            aide={
              stats && stats.commandesSansReponse > 0
                ? `${nombre(stats.commandesSansReponse)} sans réponse`
                : undefined
            }
            icone="check-circle"
            accent="vert"
          />
          <Chiffre
            libelle="Taux d'annulation"
            valeur={stats ? pourcent(stats.tauxAnnulation, 1) : '—'}
            ton={!stats ? 'neutre' : stats.tauxAnnulation >= 10 ? 'critique' : 'neutre'}
            icone="x-circle"
            accent="rose"
          />
          <Chiffre
            libelle="Taux de retour"
            valeur={stats ? pourcent(stats.tauxRetour, 1) : '—'}
            ton={!stats ? 'neutre' : stats.tauxRetour >= 10 ? 'critique' : 'neutre'}
            aide={
              stats && stats.articlesRetournes > 0
                ? `${nombre(stats.articlesRetournes)} article(s) retourné(s)`
                : undefined
            }
            icone="arrow-left"
            accent="orange"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <Chiffre
            libelle="Note client"
            valeur={
              stats?.noteClient == null ? (
                <span className="text-gray-300">—</span>
              ) : (
                <span className="inline-flex items-baseline gap-1">
                  {decimal(stats.noteClient, 1)}
                  <span className="text-xs font-medium text-gray-400">/ 5</span>
                </span>
              )
            }
            aide={
              stats?.noteClient == null
                ? 'Aucun avis reçu'
                : `${nombre(stats.nombreAvis)} avis`
            }
            icone="star"
            accent="ambre"
          />
          <Chiffre
            libelle="Score de fiabilité"
            valeur={fiabilite ? pourcent(fiabilite.scoreFiabilite, 0) : '—'}
            ton={
              !fiabilite ? 'neutre' : fiabilite.scoreFiabilite >= 95 ? 'bon' : 'attention'
            }
            aide={
              fiabilite
                ? `${nombre(fiabilite.incidents)} incident(s) sur ${nombre(fiabilite.commandesTotal)} commande(s)`
                : 'Aucune vente mesurée'
            }
            icone="shield"
            accent="violet"
          />
          <Chiffre
            libelle="Commission"
            valeur={compte ? fcfa(compte.commission) : '—'}
            aide={
              compte
                ? `Taux ${pourcent(compte.tauxCommission, 2)}${compte.tauxParDefaut ? ' (défaut)' : ''}`
                : 'Compte financier indisponible'
            }
            icone="percent"
            accent="orange"
          />
          <Chiffre
            libelle="Reste à reverser"
            valeur={compte ? fcfa(compte.resteDu) : '—'}
            ton={compte && compte.resteDu > 0 ? 'attention' : 'neutre'}
            aide={
              compte
                ? `Dû ${fcfa(compte.montantVendeur)} − déjà versé ${fcfa(compte.dejaReverse)}`
                : undefined
            }
            icone="wallet"
            accent="bleu"
          />
        </div>
      </div>
    </Section>
  );
}

// ── Produits du vendeur ─────────────────────────────────────────────────────

const CLASSE_STATUT_PRODUIT = (statut: string) =>
  statut === 'valide'
    ? 'bg-green-100 text-green-700'
    : statut === 'en_attente' || statut === 'valide_step1'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700';

const PAR_PAGE = 10;

export function SectionProduits({ vendeurId }: { vendeurId: string }) {
  const ouvrir = useOuvrirLigne();
  const [page, setPage] = useState(1);

  const produitsQ = useQuery({
    queryKey: ['vendeur-produits', vendeurId, page],
    queryFn: () => vendeursApi.produits(vendeurId, { page, limit: PAR_PAGE }),
    enabled: !!vendeurId,
    staleTime: 30_000,
  });

  const produits: Produit[] = produitsQ.data?.produits ?? [];
  const total = produitsQ.data?.pagination?.total;

  return (
    <Section
      icone="package"
      accent="ambre"
      titre="Produits de la boutique"
      apercu={total !== undefined ? `${nombre(total)} produit(s)` : undefined}
    >
      {produitsQ.isLoading ? (
        <SqueletteLignes />
      ) : produitsQ.isError ? (
        <ErreurChargement
          erreur={produitsQ.error}
          onReessayer={produitsQ.refetch}
          defaut="Impossible de charger les produits de ce vendeur."
        />
      ) : produits.length === 0 ? (
        <Vide texte="Ce vendeur n'a encore soumis aucun produit." />
      ) : (
        <>
          <div className="tbl-wrap mt-3">
            <table className="w-full text-sm tbl-cards">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="px-4 py-2.5 font-medium">Produit</th>
                  <th className="px-4 py-2.5 font-medium text-right">Prix</th>
                  <th className="px-4 py-2.5 font-medium text-right">Stock</th>
                  <th className="px-4 py-2.5 font-medium text-right">Note</th>
                  <th className="px-4 py-2.5 font-medium">Statut</th>
                  <th className="px-4 py-2.5 font-medium">Ajouté le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {produits.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50/60"
                    {...ouvrir(`/boutique/produits/${p.id}/modifier`)}
                  >
                    <td data-label="Produit" className="px-4 py-2.5 tbl-primary min-w-[160px]">
                      <p className="font-medium text-gray-900 truncate">{p.nom}</p>
                      {p.reference && (
                        <p className="font-mono text-xs text-gray-400">{p.reference}</p>
                      )}
                    </td>
                    <td
                      data-label="Prix"
                      className="px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums"
                    >
                      {fcfa(p.prixPromo ?? p.prix)}
                      {p.prixPromo != null && p.prixPromo !== p.prix && (
                        <span className="block text-xs text-gray-400 line-through">
                          {fcfa(p.prix)}
                        </span>
                      )}
                    </td>
                    <td
                      data-label="Stock"
                      className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap"
                    >
                      <span
                        className={
                          Number(p.stock) === 0
                            ? 'font-semibold text-red-600'
                            : Number(p.stock) <= 5
                              ? 'font-medium text-orange-600'
                              : 'text-gray-700'
                        }
                      >
                        {nombre(p.stock)}
                      </span>
                    </td>
                    <td data-label="Note" className="px-4 py-2.5 text-right tabular-nums">
                      {!p.nombreAvis ? (
                        <span className="text-gray-300" title="Aucun avis">
                          —
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-800">
                          <Icon name="star" size={12} className="text-yellow-500" />
                          {decimal(p.noteMoyenne, 1)}
                          <span className="text-xs text-gray-400">({p.nombreAvis})</span>
                        </span>
                      )}
                    </td>
                    <td data-label="Statut" className="px-4 py-2.5">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${CLASSE_STATUT_PRODUIT(p.statutValidation)}`}
                      >
                        {String(p.statutValidation).replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td
                      data-label="Ajouté le"
                      className="px-4 py-2.5 text-gray-500 whitespace-nowrap"
                    >
                      {date(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={produitsQ.data?.pagination?.totalPages ?? 1}
            onChange={setPage}
          />
        </>
      )}
    </Section>
  );
}

// ── Reversements ────────────────────────────────────────────────────────────

/**
 * Versements effectués au vendeur, qui tiennent l'historique financier de ses
 * ventes. Le filtre `vendeurId` est transmis au backend ; les lignes sont
 * malgré tout revérifiées ici sur `vendeurId` — afficher par erreur les
 * versements d'un autre vendeur sur cette fiche serait pire que de n'en
 * afficher aucun.
 */
export function SectionReversements({ vendeurId }: { vendeurId: string }) {
  const reversementsQ = useReversements({ vendeurId, limit: 50 });

  const lignes = (reversementsQ.data?.reversements ?? []).filter(
    (r) => r.vendeurId === vendeurId
  );

  return (
    <Section
      icone="banknote"
      accent="vert"
      titre="Reversements"
      apercu={
        reversementsQ.isSuccess && lignes.length > 0
          ? `${nombre(lignes.length)} versement(s)`
          : undefined
      }
    >
      {reversementsQ.isLoading ? (
        <SqueletteLignes lignes={3} />
      ) : reversementsQ.isError ? (
        <ErreurChargement
          erreur={reversementsQ.error}
          onReessayer={reversementsQ.refetch}
          defaut="Impossible de charger les reversements de ce vendeur."
        />
      ) : lignes.length === 0 ? (
        <Vide texte="Aucun reversement enregistré pour ce vendeur." />
      ) : (
        <div className="tbl-wrap mt-3">
          <table className="w-full text-sm tbl-cards">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <th className="px-4 py-2.5 font-medium">Référence</th>
                <th className="px-4 py-2.5 font-medium">Période</th>
                <th className="px-4 py-2.5 font-medium text-right">Montant</th>
                <th className="px-4 py-2.5 font-medium">Moyen</th>
                <th className="px-4 py-2.5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lignes.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60">
                  <td data-label="Référence" className="px-4 py-2.5 tbl-primary">
                    <p className="font-mono text-xs font-medium text-gray-900">{r.reference}</p>
                    <p className="text-xs text-gray-400">Créé le {date(r.createdAt)}</p>
                  </td>
                  <td data-label="Période" className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                    {r.periodeDebut || r.periodeFin
                      ? `${date(r.periodeDebut)} → ${date(r.periodeFin)}`
                      : '—'}
                  </td>
                  <td
                    data-label="Montant"
                    className="px-4 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums"
                  >
                    {fcfa(r.montant)}
                  </td>
                  <td data-label="Moyen" className="px-4 py-2.5 text-gray-600">
                    {r.methode || '—'}
                  </td>
                  <td data-label="Statut" className="px-4 py-2.5">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${CLASSE_STATUT_REVERSEMENT[r.statut]}`}
                    >
                      {LIBELLE_STATUT_REVERSEMENT[r.statut]}
                    </span>
                    {r.statut === 'paye' && r.payeLe && (
                      <span className="block text-xs text-gray-400">le {date(r.payeLe)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

// ── Avis clients ────────────────────────────────────────────────────────────

/** Nombre de produits interrogés, et d'avis affichés au total. */
const PRODUITS_INTERROGES = 8;
const AVIS_AFFICHES = 10;

/** Cinq étoiles, celles de la note remplies. */
function Etoiles({ note }: { note: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          size={13}
          className={n <= Math.round(note) ? 'text-yellow-500' : 'text-gray-200'}
        />
      ))}
    </span>
  );
}

/**
 * Avis clients de la boutique.
 *
 * Un avis porte sur un produit, jamais sur un vendeur : l'API n'offre donc
 * aucune route « avis d'un vendeur ». On repère les produits de la boutique
 * qui ont effectivement reçu des avis, puis on interroge les plus commentés
 * d'entre eux. La section annonce explicitement cette limite : ce n'est pas
 * l'intégralité des avis, et la note d'ensemble reste celle calculée par
 * l'analytique.
 */
export function SectionAvis({ vendeurId }: { vendeurId: string }) {
  const avisQ = useQuery({
    queryKey: ['vendeur-avis', vendeurId],
    enabled: !!vendeurId,
    staleTime: 60_000,
    queryFn: async () => {
      const { produits } = await vendeursApi.produits(vendeurId, { limit: 100 });
      const commentes = (produits ?? [])
        .filter((p) => Number(p.nombreAvis ?? 0) > 0)
        .sort((a, b) => Number(b.nombreAvis ?? 0) - Number(a.nombreAvis ?? 0));

      if (commentes.length === 0) return { avis: [] as AvisAdmin[], produitsCommentes: 0 };

      const interroges = commentes.slice(0, PRODUITS_INTERROGES);
      const lots = await Promise.all(
        interroges.map((p) =>
          vendeursApi.avisProduit(p.id, 5).then(({ avis }) =>
            (avis ?? []).map((a) => ({
              ...a,
              // Le produit n'est pas toujours joint à l'avis : on complète
              // avec celui qu'on vient d'interroger, sinon la colonne est vide.
              produit: a.produit ?? { id: p.id, nom: p.nom },
            }))
          )
        )
      );

      const avis = lots
        .flat()
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, AVIS_AFFICHES);

      return { avis, produitsCommentes: commentes.length };
    },
  });

  const avis = avisQ.data?.avis ?? [];

  return (
    <Section
      icone="message-square"
      accent="violet"
      titre="Avis clients"
      apercu={
        avisQ.isSuccess && avis.length > 0
          ? `${nombre(avis.length)} avis récents sur ${nombre(Math.min(avisQ.data!.produitsCommentes, PRODUITS_INTERROGES))} produit(s)`
          : undefined
      }
    >
      {avisQ.isLoading ? (
        <SqueletteLignes lignes={3} />
      ) : avisQ.isError ? (
        <ErreurChargement
          erreur={avisQ.error}
          onReessayer={avisQ.refetch}
          defaut="Impossible de charger les avis sur les produits de ce vendeur."
        />
      ) : avis.length === 0 ? (
        <Vide texte="Aucun avis client sur les produits de cette boutique." />
      ) : (
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-400">
            Les avis portent sur les produits : voici les plus récents parmi les produits les plus
            commentés de la boutique.
          </p>
          <ul className="space-y-2.5">
            {avis.map((a) => (
              <li key={a.id} className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Etoiles note={Number(a.note)} />
                  <span className="text-xs text-gray-400">{date(a.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-900 break-words">
                  {a.produit?.nom ?? 'Produit retiré'}
                </p>
                {a.commentaire && (
                  <p className="mt-1 text-sm text-gray-600 break-words">{a.commentaire}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                  <span>
                    {[a.user?.prenom, a.user?.nom].filter(Boolean).join(' ') || 'Client'}
                  </span>
                  {!a.isApproved && (
                    <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                      En attente de modération
                    </span>
                  )}
                </div>
                {a.reponseVendeur && (
                  <p className="mt-2 border-l-2 border-gray-200 pl-2.5 text-xs text-gray-500 break-words">
                    <span className="font-medium text-gray-600">Réponse du vendeur : </span>
                    {a.reponseVendeur}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
