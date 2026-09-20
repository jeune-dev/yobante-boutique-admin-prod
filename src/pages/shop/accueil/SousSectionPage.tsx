import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/utils/alert';
import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';
import PromotionModal from './components/PromotionModal';

/**
 * Composition d'une sous-section de l'accueil client.
 *
 * L'administrateur y choisit les produits mis en avant, leur remise, leur
 * période de validité et leur ordre d'affichage. Une promotion dont la période
 * est écoulée disparaît d'elle-même de l'application, sans intervention.
 */

const api = {
  bloc: (id: string) => shopClient.get(`/admin/blocs-promo/${id}`),
  promotions: (blocId: string) =>
    shopClient.get('/admin/promotions', { params: { blocPromoId: blocId, limit: 200 } }),
  supprimer: (id: string) => shopClient.delete(`/admin/promotions/${id}`),
  basculer: (id: string) => shopClient.patch(`/admin/promotions/${id}/toggle`),
  reordonner: (elements: { id: string; ordre: number }[]) =>
    shopClient.post('/admin/promotions/reordonner', { elements }),
};

const LIBELLES: Record<string, string> = {
  nos_promos_du_moment: 'Nos promos du moment',
  a_ne_pas_rater: 'À ne pas rater',
  nos_promos_a_venir: 'Nos promos à venir',
};

/** Une promotion est-elle réellement visible par le client en ce moment ? */
function etatVisibilite(promo: any): { libelle: string; classe: string } {
  if (!promo.isActive) return { libelle: 'Masqué', classe: 'bg-gray-100 text-gray-500' };

  const maintenant = Date.now();
  const debut = promo.dateDebut ? new Date(promo.dateDebut).getTime() : null;
  const fin = promo.dateFin ? new Date(promo.dateFin).getTime() : null;

  if (fin && fin < maintenant) return { libelle: 'Terminé', classe: 'bg-red-50 text-red-600' };
  if (debut && debut > maintenant)
    return { libelle: 'Programmé', classe: 'bg-blue-50 text-blue-600' };
  return { libelle: 'En ligne', classe: 'bg-green-50 text-green-700' };
}

const fcfa = (v: unknown) => `${Number(v ?? 0).toLocaleString('fr-FR')} FCFA`;

export default function SousSectionPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [promoEnEdition, setPromoEnEdition] = useState<any>(null);
  const [modalOuvert, setModalOuvert] = useState(false);

  const blocQuery = useQuery({ queryKey: ['sous-section', id], queryFn: () => api.bloc(id) });
  const promosQuery = useQuery({
    queryKey: ['sous-section', id, 'promotions'],
    queryFn: () => api.promotions(id),
  });

  const rafraichir = () => qc.invalidateQueries({ queryKey: ['sous-section', id] });

  const surErreur = (e: any) => showError(e);

  const supprimer = useMutation({
    mutationFn: api.supprimer,
    onSuccess: (data) => {
      rafraichir();
      showSuccess(data);
    },
    onError: surErreur,
  });

  const basculer = useMutation({
    mutationFn: api.basculer,
    onSuccess: rafraichir,
    onError: surErreur,
  });

  const reordonner = useMutation({
    mutationFn: api.reordonner,
    onSuccess: (data) => {
      rafraichir();
      showSuccess(data);
    },
    onError: surErreur,
  });

  const bloc = blocQuery.data?.bloc;
  const promotions: any[] = useMemo(
    () =>
      [...((promosQuery.data as any)?.promotions ?? [])].sort(
        (a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)
      ),
    [promosQuery.data]
  );

  /** Échange une promotion avec sa voisine et persiste le nouvel ordre. */
  const deplacer = (index: number, direction: -1 | 1) => {
    const cible = index + direction;
    if (cible < 0 || cible >= promotions.length) return;

    const reordonnees = [...promotions];
    [reordonnees[index], reordonnees[cible]] = [reordonnees[cible], reordonnees[index]];
    reordonner.mutate(reordonnees.map((p, i) => ({ id: p.id, ordre: i })));
  };

  if (blocQuery.isLoading) {
    return <p className="text-sm text-gray-400">Chargement…</p>;
  }

  if (blocQuery.isError || !bloc) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
        <Icon name="alert-triangle" size={26} className="mx-auto text-red-400" />
        <p className="mt-3 font-semibold text-gray-900">Sous-section introuvable</p>
        <Link to="/boutique/accueil" className="mt-3 inline-block text-sm text-yellow-700 hover:underline">
          Retour à la page d'accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/boutique/accueil"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <Icon name="arrow-left" size={15} /> Page d'accueil
        </Link>
      </div>

      {/* ── En-tête : la sous-section telle que le client la verra ───────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row gap-5">
        <div className="w-full sm:w-64 shrink-0 aspect-[16/9] rounded-lg bg-gray-50 overflow-hidden flex items-center justify-center">
          {bloc.image ? (
            <img src={bloc.image} alt={bloc.titre ?? ''} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <Icon name="image" size={22} className="text-gray-300 mx-auto" />
              <p className="text-xs text-gray-400 mt-1">Aucune image</p>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {LIBELLES[bloc.section] ?? bloc.section}
          </p>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mt-1">{bloc.titre ?? 'Sans titre'}</h1>
          {bloc.sousTitre && <p className="text-sm text-gray-500 mt-0.5">{bloc.sousTitre}</p>}
          <p className="text-sm text-gray-500 mt-3">
            {promotions.length === 0
              ? 'Aucun produit. Ajoutez-en pour composer cette page.'
              : `${promotions.length} produit${promotions.length > 1 ? 's' : ''} dans cette sous-section.`}
          </p>
        </div>

        <button
          onClick={() => {
            setPromoEnEdition(null);
            setModalOuvert(true);
          }}
          className="w-full sm:w-auto sm:self-start inline-flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-sm font-semibold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 shrink-0"
        >
          <Icon name="plus" size={16} /> Ajouter un produit
        </button>
      </div>

      {/* ── Produits de la sous-section ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Produits mis en avant</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Un produit disparaît de l'application dès que sa période est écoulée.
          </p>
        </div>

        {promosQuery.isLoading ? (
          <p className="p-8 text-sm text-gray-400 text-center">Chargement…</p>
        ) : promotions.length === 0 ? (
          <p className="p-10 text-sm text-gray-400 text-center">
            Aucun produit rattaché à cette sous-section.
          </p>
        ) : (
          <div className="tbl-wrap">
          <table className="w-full text-sm tbl-cards">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-50">
                <th className="py-2.5 px-5 font-medium w-20">Ordre</th>
                <th className="py-2.5 pr-4 font-medium">Produit</th>
                <th className="py-2.5 pr-4 font-medium">Prix promo</th>
                <th className="py-2.5 pr-4 font-medium hidden xl:table-cell">Remise</th>
                <th className="py-2.5 pr-4 font-medium">Période</th>
                <th className="py-2.5 pr-4 font-medium">État</th>
                <th className="py-2.5 pr-5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promo, i) => {
                const etat = etatVisibilite(promo);
                return (
                  <tr key={promo.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 px-5" data-label="Ordre">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => deplacer(i, -1)}
                          disabled={i === 0 || reordonner.isPending}
                          title="Monter"
                          aria-label="Monter"
                          className="btn-icon text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30"
                        >
                          <Icon name="arrow-up" size={14} />
                        </button>
                        <button
                          onClick={() => deplacer(i, 1)}
                          disabled={i === promotions.length - 1 || reordonner.isPending}
                          title="Descendre"
                          aria-label="Descendre"
                          className="btn-icon text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30"
                        >
                          <Icon name="arrow-down" size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 pr-4 tbl-primary">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {promo.produit?.images?.[0] && (
                          <img
                            src={promo.produit.images[0]}
                            alt=""
                            className="w-9 h-9 rounded-md object-cover shrink-0"
                          />
                        )}
                        <span className="text-gray-900 line-clamp-2 min-w-0">
                          {promo.produit?.nom ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-gray-700 whitespace-nowrap" data-label="Prix promo">{fcfa(promo.prixPromo)}</td>
                    <td className="py-3 pr-4 hidden xl:table-cell" data-label="Remise">
                      {promo.pourcentageReduction ? (
                        <span className="font-semibold text-yellow-700">
                          −{Math.round(Number(promo.pourcentageReduction))} %
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-500" data-label="Période">
                      {formatPeriode(promo.dateDebut, promo.dateFin)}
                    </td>
                    <td className="py-3 pr-4" data-label="État">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${etat.classe}`}>
                        {etat.libelle}
                      </span>
                    </td>
                    <td className="py-3 pr-5 text-right whitespace-nowrap tbl-actions" data-label="Actions">
                      <BoutonIcone
                        nom="pencil"
                        titre="Modifier"
                        onClick={() => {
                          setPromoEnEdition(promo);
                          setModalOuvert(true);
                        }}
                      />
                      <BoutonIcone
                        nom={promo.isActive ? 'eye-off' : 'eye'}
                        titre={promo.isActive ? 'Masquer' : 'Afficher'}
                        onClick={() => basculer.mutate(promo.id)}
                      />
                      <BoutonIcone
                        nom="trash-2"
                        titre="Retirer"
                        danger
                        onClick={() => supprimer.mutate(promo.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {modalOuvert && (
        <PromotionModal
          section={bloc.section}
          blocPromoId={bloc.id}
          promotion={promoEnEdition}
          onFermer={() => {
            setModalOuvert(false);
            setPromoEnEdition(null);
          }}
          onEnregistre={rafraichir}
        />
      )}
    </div>
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

function formatPeriode(debut?: string, fin?: string) {
  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : null;
  const d = fmt(debut);
  const f = fmt(fin);
  if (!d && !f) return 'Permanente';
  if (d && f) return `du ${d} au ${f}`;
  return d ? `à partir du ${d}` : `jusqu'au ${f}`;
}
