import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '@/shared/components/dashboard/Icon';
import ErreurChargement from '@/shared/components/feedback/ErreurChargement';
import SelecteurPeriode from '@/shared/components/dashboard/SelecteurPeriode';
import {
  Barre,
  Bloc,
  BoutonActualiser,
  Chiffre,
  EntetePage,
  Reserve,
  Squelette,
  Titre,
  Tuile,
  Vide,
} from '@/shared/components/dashboard/Blocs';
import { useIndicateursLivraison } from '@/domains/shop/hooks/useAnalytique';
import { useKpiRetours } from '@/domains/shop/hooks/useIndicateurs';
import { bornesDepuisPeriode, fcfa, libelleBornes, nombre, pourcent } from '@/shared/utils/format';
import { LIBELLE_MOTIF_RETOUR, type FiltrePeriode } from '@/domains/shop/types/indicateurs';

/**
 * Livraison et logistique : la charge de l'instant, la performance de la période.
 *
 * Les deux blocs ne répondent pas à la même question et n'ont donc pas le même
 * périmètre temporel. Ce qui reste à livrer est un état présent — le filtrer
 * sur « ce mois » masquerait une commande en retard depuis février.
 */
export default function LivraisonPage() {
  const [periode, setPeriode] = useState<FiltrePeriode>({ periode: 'mois' });
  const bornes = bornesDepuisPeriode(periode);

  const livraisonQ = useIndicateursLivraison(bornes);
  const retoursQ = useKpiRetours(periode);

  if (livraisonQ.isLoading) return <Squelette tuiles={4} />;

  if (livraisonQ.isError) {
    return (
      <Bloc>
        <ErreurChargement
          erreur={livraisonQ.error}
          onReessayer={livraisonQ.refetch}
          defaut="Impossible de charger les indicateurs de livraison."
        />
      </Bloc>
    );
  }

  const t = livraisonQ.data!.instantT;
  const p = livraisonQ.data!.surLaPeriode;
  const kpiRetours = retoursQ.data?.kpi;
  const parMotif = retoursQ.data?.parMotif ?? [];
  const maxMotif = Math.max(...parMotif.map((m) => Number(m.quantite) || 0), 1);

  return (
    <div className="space-y-3 sm:space-y-4">
      <EntetePage
        titre="Livraison"
        soustitre={`Charge à l'instant présent et performance sur ${libelleBornes(livraisonQ.data!.periode)}`}
      >
        <SelecteurPeriode valeur={periode} onChange={setPeriode} />
        <BoutonActualiser
          onClick={() => {
            livraisonQ.refetch();
            retoursQ.refetch();
          }}
          enCours={livraisonQ.isFetching}
        />
      </EntetePage>

      {/* ── À l'instant T ────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
          À livrer maintenant
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <Tuile
            icone="truck"
            libelle="À livrer"
            valeur={nombre(t.aLivrer)}
            sous="validée, en préparation ou expédiée"
            teinte="bg-blue-50 text-blue-600"
          />
          <Tuile
            icone="package"
            libelle="En préparation"
            valeur={nombre(t.enPreparation)}
            teinte="bg-indigo-50 text-indigo-600"
          />
          <Tuile
            icone="ship"
            libelle="Expédiées"
            valeur={nombre(t.expediees)}
            sous="en cours de route"
            teinte="bg-purple-50 text-purple-600"
          />
          <Tuile
            icone="alert-triangle"
            libelle="En retard"
            valeur={nombre(t.enRetard)}
            sous={t.definitionRetard}
            teinte={t.enRetard > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}
          />
        </div>

        {t.enRetard > 0 && (
          <Bloc className="mt-2.5 sm:mt-3 p-3.5 border-red-100 bg-red-50/40">
            <p className="flex flex-wrap items-center gap-2 text-sm text-red-800">
              <Icon name="alert-triangle" size={15} className="shrink-0" />
              <span>
                <strong>{nombre(t.enRetard)}</strong> commande(s) ont dépassé leur date de
                livraison souhaitée.
              </span>
              <Link
                to="/boutique/alertes"
                className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline"
              >
                Voir lesquelles <Icon name="arrow-right" size={13} />
              </Link>
            </p>
          </Bloc>
        )}
      </div>

      {/* ── Sur la période ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
        <Bloc className="p-4">
          <Titre>Livraisons de la période</Titre>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Chiffre libelle="Commandes livrées" valeur={nombre(p.livrees)} ton="bon" />
            <Chiffre libelle="Revenus générés" valeur={fcfa(p.revenus)} aide="Montant total des commandes livrées" />
            <Chiffre
              libelle="Frais encaissés"
              valeur={fcfa(p.fraisEncaisses)}
              aide="Livraison facturée aux clients"
            />
            <Chiffre
              libelle="Frais moyens"
              valeur={fcfa(p.fraisMoyens)}
              aide={p.natureDesFrais}
            />
          </div>
        </Bloc>

        {/* ── Retours ────────────────────────────────────────────────────── */}
        <Bloc className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Titre>Retours produits</Titre>
            <Link
              to="/boutique/retours"
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 hover:underline"
            >
              Gérer les retours
            </Link>
          </div>

          {retoursQ.isLoading ? (
            <p className="text-sm text-gray-400 py-8 text-center">Chargement…</p>
          ) : !kpiRetours ? (
            <Vide texte="Indicateurs de retour indisponibles." />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Chiffre
                  libelle="Taux de retour"
                  valeur={pourcent(kpiRetours.tauxRetour)}
                  ton={
                    kpiRetours.tauxRetour >= 10
                      ? 'critique'
                      : kpiRetours.tauxRetour >= 5
                        ? 'attention'
                        : 'bon'
                  }
                  aide={kpiRetours.formuleTauxRetour}
                />
                <Chiffre
                  libelle="Articles retournés"
                  valeur={nombre(kpiRetours.quantiteRetournee)}
                  aide={`Sur ${nombre(kpiRetours.quantiteLivree)} article(s) livré(s)`}
                />
                <Chiffre libelle="Retours" valeur={nombre(kpiRetours.nombreRetours)} />
                <Chiffre
                  libelle="Remboursé"
                  valeur={fcfa(kpiRetours.montantRembourse)}
                  ton={kpiRetours.montantRembourse > 0 ? 'attention' : 'neutre'}
                />
              </div>

              {parMotif.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Motifs des retours
                  </p>
                  <div className="space-y-2.5">
                    {parMotif.map((m) => (
                      <Barre
                        key={m.motif}
                        libelle={LIBELLE_MOTIF_RETOUR[m.motif] ?? m.motif}
                        valeur={Number(m.quantite)}
                        max={maxMotif}
                        couleur="bg-orange-400"
                        detail={`${nombre(m.nombre)} retour(s)`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Bloc>
      </div>

      <Reserve>
        Les rubriques <strong>Transporteurs</strong> et <strong>Préparation</strong> du cahier
        des charges ne sont pas encore outillées : la base ne connaît ni transporteur ni livreur.
        Seule la responsabilité « transport » d'un retour est enregistrée, sans désigner personne.
      </Reserve>
    </div>
  );
}
