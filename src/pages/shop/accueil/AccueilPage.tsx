import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { showSuccess, showError } from '@/shared/utils/alert';
import Icon from '@/shared/components/dashboard/Icon';
import SousSectionModal from './components/SousSectionModal';
import PromotionModal from './components/PromotionModal';
import BanniereModal from './components/BanniereModal';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import { etatRetour } from '@/shared/hooks/useRetour';

/**
 * Gestion de la page d'accueil de l'application client.
 *
 * Reproduit la structure vue par le client :
 *  - la section principale, portée par les bannières du haut ;
 *  - trois sections promotionnelles, chacune composée de sous-sections
 *    (image + titre) et des produits en promotion qui leur sont rattachés.
 */

export const SECTIONS = [
  { cle: 'nos_promos_du_moment', libelle: 'Nos promos du moment' },
  { cle: 'a_ne_pas_rater', libelle: 'À ne pas rater' },
  { cle: 'nos_promos_a_venir', libelle: 'Nos promos à venir' },
] as const;

const api = {
  bannieres: () => shopClient.get('/admin/bannieres'),
  creerBanniere: (data: FormData) => shopClient.post('/admin/bannieres', data),
  supprimerBanniere: (id: string) => shopClient.delete(`/admin/bannieres/${id}`),
  basculerBanniere: (id: string) => shopClient.patch(`/admin/bannieres/${id}/toggle`),

  blocs: () => shopClient.get('/admin/blocs-promo'),
  supprimerBloc: (id: string) => shopClient.delete(`/admin/blocs-promo/${id}`),
  basculerBloc: (id: string) => shopClient.patch(`/admin/blocs-promo/${id}/toggle`),

  promotions: () => shopClient.get('/admin/promotions', { params: { limit: 200 } }),
  supprimerPromotion: (id: string) => shopClient.delete(`/admin/promotions/${id}`),
  basculerPromotion: (id: string) => shopClient.patch(`/admin/promotions/${id}/toggle`),
};

const listeDe = (donnees: any, cle: string): any[] =>
  Array.isArray(donnees?.[cle]) ? donnees[cle] : Array.isArray(donnees) ? donnees : [];

export default function AccueilPage() {
  const qc = useQueryClient();
  const [blocEnEdition, setBlocEnEdition] = useState<any>(null);
  const [sectionCible, setSectionCible] = useState<string | null>(null);
  const [promoEnEdition, setPromoEnEdition] = useState<any>(null);
  const [sectionPromo, setSectionPromo] = useState<string | null>(null);
  const [modaleBanniere, setModaleBanniere] = useState(false);
  const [banniereEnEdition, setBanniereEnEdition] = useState<any>(null);

  const bannieres = useQuery({ queryKey: ['accueil', 'bannieres'], queryFn: api.bannieres });
  const blocs = useQuery({ queryKey: ['accueil', 'blocs'], queryFn: api.blocs });
  const promotions = useQuery({ queryKey: ['accueil', 'promotions'], queryFn: api.promotions });

  const rafraichir = (cle: string) => qc.invalidateQueries({ queryKey: ['accueil', cle] });

  // Hook local (préfixe `use`) : appelé un nombre fixe de fois, dans le même
  // ordre, à chaque rendu — les règles des hooks sont respectées.
  const useMutationAccueil = (fn: (id: string) => Promise<any>, cle: string, message: string) =>
    useMutation({
      mutationFn: fn,
      // Le message affiché est celui renvoyé par le backend (`data._message`) ;
      // `message` ne sert que de repli si le backend n'en renvoie aucun.
      onSuccess: (data) => {
        rafraichir(cle);
        showSuccess(data, message);
      },
      onError: (e: any) => showError(e),
    });

  const supprBanniere = useMutationAccueil(api.supprimerBanniere, 'bannieres', 'Bannière supprimée');
  const bascBanniere = useMutationAccueil(api.basculerBanniere, 'bannieres', 'Bannière mise à jour');
  const supprBloc = useMutationAccueil(api.supprimerBloc, 'blocs', 'Sous-section supprimée');
  const bascBloc = useMutationAccueil(api.basculerBloc, 'blocs', 'Sous-section mise à jour');
  const supprPromo = useMutationAccueil(api.supprimerPromotion, 'promotions', 'Promotion retirée');
  const bascPromo = useMutationAccueil(api.basculerPromotion, 'promotions', 'Promotion mise à jour');

  const blocsParSection = useMemo(() => {
    const parSection = blocs.data?.parSection;
    if (parSection) return parSection as Record<string, any[]>;
    // Repli si le backend ne renvoie que la liste brute.
    const tous = listeDe(blocs.data, 'blocs');
    return SECTIONS.reduce<Record<string, any[]>>((acc, s) => {
      acc[s.cle] = tous.filter((b) => b.section === s.cle);
      return acc;
    }, {});
  }, [blocs.data]);

  const promosParSection = useMemo(() => {
    const tous = listeDe(promotions.data, 'promotions');
    return SECTIONS.reduce<Record<string, any[]>>((acc, s) => {
      acc[s.cle] = tous.filter((p) => p.section === s.cle);
      return acc;
    }, {});
  }, [promotions.data]);

  const listeBannieres = listeDe(bannieres.data, 'bannieres');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-lg sm:text-xl font-bold text-gray-900">Page d'accueil</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ce que voient les clients dans l'application, connectés ou non.
        </p>
      </header>

      {/* ── Section principale ─────────────────────────────────────────── */}
      <section className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900">Section principale</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Bannières du haut de l'accueil. Pas de sous-sections ici.
            </p>
          </div>
          <button
            onClick={() => {
              setBanniereEnEdition(null);
              setModaleBanniere(true);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600"
          >
            <Icon name="plus" size={15} /> Bannière
          </button>
        </div>

        {bannieres.isLoading ? (
          <Chargement />
        ) : bannieres.isError ? (
          <ErreurChargement erreur={bannieres.error} onReessayer={() => bannieres.refetch()} className="py-4" />
        ) : listeBannieres.length === 0 ? (
          <Vide texte="Aucune bannière. L'accueil affichera l'image par défaut." />
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listeBannieres.map((b: any) => (
              <Vignette
                key={b.id}
                image={b.image}
                titre={b.titre || 'Sans titre'}
                sousTitre={
                  b.produits?.length ? `${b.produits.length} produit(s) mis en avant` : undefined
                }
                actif={b.isActive}
                onModifier={() => {
                  setBanniereEnEdition(b);
                  setModaleBanniere(true);
                }}
                onBasculer={() => bascBanniere.mutate(b.id)}
                onSupprimer={() => supprBanniere.mutate(b.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Sections promotionnelles ───────────────────────────────────── */}
      {SECTIONS.map((section) => (
        <section key={section.cle} className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-gray-900">{section.libelle}</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSectionCible(section.cle);
                  setBlocEnEdition(null);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
              >
                <Icon name="plus" size={15} /> Sous-section
              </button>
              <button
                onClick={() => {
                  setSectionPromo(section.cle);
                  setPromoEnEdition(null);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600"
              >
                <Icon name="plus" size={15} /> Produit en promo
              </button>
            </div>
          </div>

          {/* Sous-sections */}
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Sous-sections
          </h3>
          {blocs.isLoading ? (
            <Chargement />
          ) : blocs.isError ? (
            <ErreurChargement erreur={blocs.error} onReessayer={() => blocs.refetch()} className="py-4" />
          ) : (blocsParSection[section.cle] ?? []).length === 0 ? (
            <Vide texte="Aucune sous-section." />
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
              {(blocsParSection[section.cle] ?? []).map((bloc: any) => (
                <Vignette
                  key={bloc.id}
                  image={bloc.image}
                  titre={bloc.titre || 'Sans titre'}
                  sousTitre={bloc.sousTitre}
                  actif={bloc.isActive}
                  // Ouvre la page de composition : produits, remises, durées, ordre.
                  lien={`/boutique/accueil/sous-section/${bloc.id}`}
                  onModifier={() => {
                    setSectionCible(section.cle);
                    setBlocEnEdition(bloc);
                  }}
                  onBasculer={() => bascBloc.mutate(bloc.id)}
                  onSupprimer={() => supprBloc.mutate(bloc.id)}
                />
              ))}
            </div>
          )}

          {/* Produits en promotion */}
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Produits en promotion
          </h3>
          {promotions.isLoading ? (
            <Chargement />
          ) : promotions.isError ? (
            <ErreurChargement erreur={promotions.error} onReessayer={() => promotions.refetch()} className="py-4" />
          ) : (promosParSection[section.cle] ?? []).length === 0 ? (
            <Vide texte="Aucun produit rattaché à cette section." />
          ) : (
            <div className="tbl-wrap">
              <table className="w-full text-sm tbl-cards">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase">
                    <th className="py-2 pr-3 font-medium">Produit</th>
                    <th className="py-2 pr-3 font-medium">Prix promo</th>
                    <th className="py-2 pr-3 font-medium">Réduction</th>
                    <th className="py-2 pr-3 font-medium">Période</th>
                    <th className="py-2 pr-3 font-medium">État</th>
                    <th className="py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(promosParSection[section.cle] ?? []).map((promo: any) => (
                    <tr key={promo.id} className="border-t border-gray-50">
                      <td className="py-2.5 pr-3 text-gray-900 tbl-primary">
                        {promo.produit?.nom ?? promo.titre ?? '—'}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap" data-label="Prix promo">
                        {promo.prixPromo ? `${promo.prixPromo} FCFA` : '—'}
                      </td>
                      <td className="py-2.5 pr-3" data-label="Réduction">
                        {promo.pourcentageReduction ? `−${promo.pourcentageReduction} %` : '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-gray-500 text-xs" data-label="Période">
                        {formatPeriode(promo.dateDebut, promo.dateFin)}
                      </td>
                      <td className="py-2.5 pr-3" data-label="État">
                        <Etat actif={promo.isActive} />
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap tbl-actions" data-label="Actions">
                        <BoutonIcone
                          nom="pencil"
                          titre="Modifier"
                          onClick={() => {
                            setSectionPromo(section.cle);
                            setPromoEnEdition(promo);
                          }}
                        />
                        <BoutonIcone
                          nom={promo.isActive ? 'eye-off' : 'eye'}
                          titre={promo.isActive ? 'Masquer' : 'Afficher'}
                          onClick={() => bascPromo.mutate(promo.id)}
                        />
                        <BoutonIcone
                          nom="trash-2"
                          titre="Retirer"
                          danger
                          onClick={() => supprPromo.mutate(promo.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {modaleBanniere && (
        <BanniereModal
          banniere={banniereEnEdition}
          onFermer={() => {
            setModaleBanniere(false);
            setBanniereEnEdition(null);
          }}
          onEnregistre={() => rafraichir('bannieres')}
        />
      )}

      {sectionCible && (
        <SousSectionModal
          section={sectionCible}
          bloc={blocEnEdition}
          onFermer={() => {
            setSectionCible(null);
            setBlocEnEdition(null);
          }}
          onEnregistre={() => rafraichir('blocs')}
        />
      )}

      {sectionPromo && (
        <PromotionModal
          section={sectionPromo}
          promotion={promoEnEdition}
          onFermer={() => {
            setSectionPromo(null);
            setPromoEnEdition(null);
          }}
          onEnregistre={() => rafraichir('promotions')}
        />
      )}
    </div>
  );
}

// ── Petits composants partagés ─────────────────────────────────────────

function Chargement() {
  return <div className="py-6 text-sm text-gray-400">Chargement…</div>;
}

function Vide({ texte }: { texte: string }) {
  return (
    <div className="py-6 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg text-center">
      {texte}
    </div>
  );
}

function Etat({ actif }: { actif: boolean }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded ${
        actif ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}
    >
      {actif ? 'Affiché' : 'Masqué'}
    </span>
  );
}

function BoutonIcone({
  nom,
  titre,
  onClick,
  danger,
}: {
  nom: string;
  titre: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={titre}
      onClick={onClick}
      aria-label={titre}
      className={`btn-icon hover:bg-gray-50 ${
        danger ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-gray-700'
      }`}
    >
      <Icon name={nom} size={16} />
    </button>
  );
}

function Vignette({
  image,
  titre,
  sousTitre,
  actif,
  lien,
  onModifier,
  onBasculer,
  onSupprimer,
}: {
  image: string | null;
  titre: string;
  sousTitre?: string | null;
  actif: boolean;
  /** Si fourni, l'aperçu mène à la page de composition. */
  lien?: string;
  onModifier?: () => void;
  onBasculer: () => void;
  onSupprimer: () => void;
}) {
  const location = useLocation();
  const apercu = (
    <div className="aspect-[16/9] bg-gray-50 flex items-center justify-center">
      {image ? (
        <img src={image} alt={titre} className="w-full h-full object-cover" />
      ) : (
        <Icon name="image" size={22} className="text-gray-300" />
      )}
    </div>
  );

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden hover:border-gray-200 transition-colors">
      {lien ? (
        <Link to={lien} state={etatRetour(location)} title="Composer cette sous-section" className="block group">
          <div className="relative">
            {apercu}
            <div className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/30 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-white bg-gray-900/80 px-2.5 py-1 rounded-full">
                Composer
              </span>
            </div>
          </div>
        </Link>
      ) : (
        apercu
      )}
      <div className="p-2.5">
        <div className="text-sm font-medium text-gray-900 truncate">{titre}</div>
        {sousTitre && <div className="text-xs text-gray-500 truncate">{sousTitre}</div>}
        <div className="flex items-center justify-between mt-2">
          <Etat actif={actif} />
          <div className="flex">
            {onModifier && <BoutonIcone nom="pencil" titre="Modifier" onClick={onModifier} />}
            <BoutonIcone
              nom={actif ? 'eye-off' : 'eye'}
              titre={actif ? 'Masquer' : 'Afficher'}
              onClick={onBasculer}
            />
            <BoutonIcone nom="trash-2" titre="Supprimer" danger onClick={onSupprimer} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** « du 01/07 au 15/07 », ou « permanente » si aucune date n'est posée. */
function formatPeriode(debut?: string, fin?: string) {
  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : null;
  const d = fmt(debut);
  const f = fmt(fin);
  if (!d && !f) return 'Permanente';
  if (d && f) return `du ${d} au ${f}`;
  return d ? `à partir du ${d}` : `jusqu'au ${f}`;
}
