import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/utils/alert';
import shopClient from '@/infrastructure/http/shop.client';
import { promotionsApi } from '@/domains/shop/api/promotions.api';
import type { SectionPromotion } from '@/domains/shop/types';
import Icon from '@/shared/components/dashboard/Icon';
import Modal, { BoutonPrincipal, BoutonSecondaire, Champ } from './Modal';
import PromoExistante, { LIBELLE_SECTION, emplacementPromo, promosEnCoursDuProduit } from './PromoExistante';

interface Props {
  section: SectionPromotion;
  /** Produits déjà présents dans la section : affichés comme « Déjà ajouté ». */
  produitsPresents: string[];
  /** Ordre à partir duquel les nouveaux produits sont placés (à la suite). */
  ordreDepart: number;
  onFermer: () => void;
  onEnregistre: () => void;
}

const formaterPrix = (v: any) => Number(v ?? 0).toLocaleString('fr-FR');

/** Date du jour au format d'un `input[type=date]`. */
const aujourdHui = () => new Date().toISOString().slice(0, 10);

/** Prix après remise, arrondi au franc (même calcul que le serveur). */
export const prixApresRemise = (prix: number, pct: number) =>
  prix > 0 && pct > 0 && pct < 100 ? Math.round(prix * (1 - pct / 100)) : null;

/**
 * Ajout de produits à « Nos promos du moment », en deux étapes :
 *  1. cocher un ou plusieurs produits du catalogue ;
 *  2. fixer la remise (commune, ajustable produit par produit) et la période.
 *
 * Le prix promo est calculé automatiquement. Dans l'application, le client
 * voit l'ancien prix barré, la remise en % et le temps restant. Passé la date
 * de fin, le produit quitte la section et reprend son prix normal.
 */
export default function ProduitsSectionModal({
  section,
  produitsPresents,
  ordreDepart,
  onFermer,
  onEnregistre,
}: Props) {
  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState<any[]>([]);
  const [chargement, setChargement] = useState(false);
  // Ordre de sélection conservé : c'est l'ordre d'affichage dans l'app.
  const [choisis, setChoisis] = useState<any[]>([]);
  const [etape, setEtape] = useState<'choix' | 'remise'>('choix');
  // Remise commune, et remise propre à chaque produit (id → %).
  const [remiseCommune, setRemiseCommune] = useState('');
  const [remises, setRemises] = useState<Record<string, string>>({});
  const [dateDebut, setDateDebut] = useState(aujourdHui());
  const [dateFin, setDateFin] = useState('');

  // Produits déjà en promotion ailleurs : leur remise est reprise telle quelle
  // (un produit garde la même remise dans toutes les sections).
  const [imposees, setImposees] = useState<Record<string, { pct: number; prixPromo: number; ou: string }>>({});
  const [aConfirmer, setAConfirmer] = useState<{ produit: any; promos: any[] } | null>(null);
  const [verification, setVerification] = useState<string | null>(null);

  const remiseDe = (id: string) =>
    imposees[id] ? String(imposees[id].pct) : (remises[id] ?? remiseCommune);
  const prixPromoDe = (p: any) =>
    imposees[p.id]?.prixPromo ?? prixApresRemise(Number(p.prix), Number(remiseDe(p.id)));
  const appliquerCommune = (v: string) => {
    setRemiseCommune(v);
    // La remise commune s'applique à tous les produits : on efface les écarts.
    setRemises({});
  };

  // Catalogue chargé à l'ouverture, puis à chaque recherche (anti-rebond).
  useEffect(() => {
    setChargement(true);
    const t = setTimeout(
      async () => {
        try {
          const r: any = await shopClient.get('/admin/produits', {
            params: {
              limit: 50,
              isActive: true,
              ...(recherche.trim().length >= 2 ? { search: recherche.trim() } : {}),
            },
          });
          setResultats(r.produits ?? []);
        } catch {
          setResultats([]);
        } finally {
          setChargement(false);
        }
      },
      recherche ? 350 : 0
    );
    return () => clearTimeout(t);
  }, [recherche]);

  const estChoisi = (id: string) => choisis.some((p) => p.id === id);
  const basculer = async (p: any) => {
    if (estChoisi(p.id)) {
      setChoisis((liste) => liste.filter((x) => x.id !== p.id));
      setImposees(({ [p.id]: _retire, ...reste }) => reste);
      return;
    }
    // Déjà en promotion ailleurs ? Mini fiche et confirmation avant de l'ajouter.
    setVerification(p.id);
    const promos = await promosEnCoursDuProduit(p.id);
    setVerification(null);
    if (promos.length) {
      setAConfirmer({ produit: p, promos });
      return;
    }
    setChoisis((liste) => [...liste, p]);
  };

  const confirmerExistante = () => {
    if (!aConfirmer) return;
    const { produit, promos } = aConfirmer;
    const ref = promos[0];
    setImposees((m) => ({
      ...m,
      [produit.id]: {
        pct: Math.round(Number(ref.pourcentageReduction) || 0),
        prixPromo: Math.round(Number(ref.prixPromo)),
        ou: promos.map(emplacementPromo).join(', '),
      },
    }));
    setChoisis((liste) => [...liste, produit]);
    setAConfirmer(null);
  };

  const ajouter = useMutation({
    mutationFn: async () => {
      // Un appel par produit, dans l'ordre de sélection.
      for (let i = 0; i < choisis.length; i++) {
        const p = choisis[i];
        const pct = Number(remiseDe(p.id));
        await promotionsApi.create({
          produitId: p.id,
          section,
          ordre: ordreDepart + i,
          pourcentageReduction: pct,
          prixPromo: prixPromoDe(p) ?? undefined,
          dateDebut: new Date(`${dateDebut}T00:00:00`).toISOString(),
          // Fin de journée : une promotion « jusqu'au 15 » couvre tout le 15.
          dateFin: new Date(`${dateFin}T23:59:59`).toISOString(),
        });
      }
      return {
        _message:
          choisis.length > 1
            ? `${choisis.length} produits ajoutés à la section.`
            : 'Produit ajouté à la section.',
      };
    },
    onSuccess: (data) => {
      showSuccess(data);
      onEnregistre();
      onFermer();
    },
    // Ceux déjà créés restent : la liste est rafraîchie pour le montrer.
    onError: (e: any) => {
      showError(e);
      onEnregistre();
    },
  });

  /** Contrôles de l'étape 2 avant l'envoi. */
  const valider = () => {
    const sansRemise = choisis.filter((p) => prixPromoDe(p) === null);
    if (sansRemise.length) {
      showError(
        sansRemise.length === choisis.length
          ? 'Indiquez la remise (entre 1 et 99 %)'
          : `Remise manquante ou invalide pour : ${sansRemise.map((p) => p.nom).join(', ')}`
      );
      return;
    }
    if (!dateFin) {
      showError('Indiquez la date de fin de la promotion');
      return;
    }
    if (dateFin < aujourdHui()) {
      showError('La date de fin est déjà passée');
      return;
    }
    if (dateDebut && dateFin < dateDebut) {
      showError('La date de fin précède la date de début');
      return;
    }
    ajouter.mutate();
  };

  return (
    <Modal
      titre="Ajouter des produits en promo"
      sousTitre={
        etape === 'choix'
          ? 'Étape 1 sur 2 — cochez les produits'
          : 'Étape 2 sur 2 — remise et durée de la promotion'
      }
      largeur="md"
      onFermer={onFermer}
      actions={
        aConfirmer ? undefined : etape === 'choix' ? (
          <>
            <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
            <BoutonPrincipal
              onClick={() => setEtape('remise')}
              disabled={choisis.length === 0}
              ton="or"
            >
              {choisis.length > 0 ? `Suivant (${choisis.length})` : 'Suivant'}
            </BoutonPrincipal>
          </>
        ) : (
          <>
            <BoutonSecondaire onClick={() => setEtape('choix')}>Retour</BoutonSecondaire>
            <BoutonPrincipal onClick={valider} disabled={ajouter.isPending} ton="or">
              {ajouter.isPending
                ? 'Ajout…'
                : `Mettre en promo (${choisis.length})`}
            </BoutonPrincipal>
          </>
        )
      }
    >
      {aConfirmer ? (
        <PromoExistante
          produit={aConfirmer.produit}
          promos={aConfirmer.promos}
          cible={LIBELLE_SECTION[section] ?? section}
          onConfirmer={confirmerExistante}
          onAnnuler={() => setAConfirmer(null)}
        />
      ) : etape === 'remise' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Champ
              label="Remise (%)"
              valeur={remiseCommune}
              onChange={appliquerCommune}
              type="number"
              placeholder="ex. 20"
            />
            <Champ label="Début" valeur={dateDebut} onChange={setDateDebut} type="date" />
            <Champ label="Fin (obligatoire)" valeur={dateFin} onChange={setDateFin} type="date" />
          </div>
          <p className="text-xs text-gray-500 -mt-2">
            La remise s'applique à tous les produits ; ajustez-la ligne par ligne si besoin.
          </p>

          <ul className="border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-72 overflow-auto">
            {choisis.map((p) => {
              const prixNormal = Number(p.prix);
              const nouveau = prixPromoDe(p);
              const imposee = imposees[p.id];
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt="" className="w-10 h-10 rounded-md object-contain bg-white border border-gray-100 shrink-0" />
                  ) : (
                    <span className="w-10 h-10 rounded-md bg-gray-100 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.nom}</p>
                    <p className="text-xs">
                      {nouveau !== null ? (
                        <>
                          <span className="text-gray-400 line-through">{formaterPrix(prixNormal)} FCFA</span>{' '}
                          <span className="font-semibold text-green-700">{formaterPrix(nouveau)} FCFA</span>
                        </>
                      ) : (
                        <span className="text-gray-500">{formaterPrix(prixNormal)} FCFA</span>
                      )}
                    </p>
                    {imposee && (
                      <p className="text-xs text-amber-700 mt-0.5">
                        Remise reprise de « {imposee.ou} »
                      </p>
                    )}
                  </div>
                  {imposee ? (
                    <span
                      className="flex items-center gap-1 shrink-0 text-sm font-semibold text-gray-700"
                      title="Un produit garde la même remise dans toutes les sections"
                    >
                      <Icon name="lock" size={13} className="text-gray-400" />−{imposee.pct} %
                    </span>
                  ) : (
                  <label className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-gray-400">−</span>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={remiseDe(p.id)}
                      onChange={(e) => setRemises((r) => ({ ...r, [p.id]: e.target.value }))}
                      aria-label={`Remise pour ${p.nom}`}
                      className="champ w-16 px-2 py-1.5 text-right"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </label>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50/60 rounded-lg">
            <Icon name="clock" size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800">
              Dans l'application : ancien prix barré, remise en % et temps restant. Après la date de
              fin, le produit quitte la section et revient à son prix normal.
            </p>
          </div>
        </div>
      ) : (
      <div className="space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon name="search" size={15} />
          </span>
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher dans le catalogue…"
            autoFocus
            className="champ w-full pl-9 pr-3"
          />
        </div>

        {chargement && <p className="text-xs text-gray-400">Chargement du catalogue…</p>}

        {!chargement && resultats.length === 0 && (
          <p className="text-sm text-gray-400 py-8 text-center">
            {recherche ? 'Aucun produit ne correspond.' : 'Aucun produit dans le catalogue.'}
          </p>
        )}

        {resultats.length > 0 && (
          <ul className="border border-gray-100 rounded-lg max-h-96 overflow-auto divide-y divide-gray-50">
            {resultats.map((p) => {
              const present = produitsPresents.includes(p.id);
              const coche = present || estChoisi(p.id);
              return (
                <li key={p.id}>
                  <label
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      present ? 'opacity-60 cursor-default' : 'cursor-pointer hover:bg-yellow-50/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={coche}
                      disabled={present || verification === p.id}
                      onChange={() => basculer(p)}
                      className="w-4 h-4 accent-yellow-500 shrink-0"
                    />
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-10 h-10 rounded-md object-contain bg-white border border-gray-100 shrink-0" />
                    ) : (
                      <span className="w-10 h-10 rounded-md bg-gray-100 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900 truncate">{p.nom}</span>
                      <span className="block text-xs text-gray-400">
                        {present ? 'Déjà dans la section' : `Stock : ${p.stock ?? 0}`}
                      </span>
                    </span>
                    <span className="text-sm text-gray-600 shrink-0">{formaterPrix(p.prix)} FCFA</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {choisis.length > 0 && (
          <p className="text-xs text-gray-500">
            {choisis.length} produit{choisis.length > 1 ? 's' : ''} sélectionné
            {choisis.length > 1 ? 's' : ''} — ils s'afficheront dans cet ordre, après ceux déjà présents.
          </p>
        )}
      </div>
      )}
    </Modal>
  );
}
