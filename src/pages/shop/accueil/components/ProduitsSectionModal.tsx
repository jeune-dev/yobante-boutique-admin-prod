import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/utils/alert';
import shopClient from '@/infrastructure/http/shop.client';
import { promotionsApi } from '@/domains/shop/api/promotions.api';
import type { SectionPromotion } from '@/domains/shop/types';
import Icon from '@/shared/components/dashboard/Icon';
import Modal, { BoutonPrincipal, BoutonSecondaire } from './Modal';

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

/**
 * Choix des produits affichés dans une section de l'accueil (« Nos promos du
 * moment ») : on coche un ou plusieurs produits du catalogue, ils apparaissent
 * dans l'application à la suite de ceux déjà présents, à leur prix habituel.
 * Un prix promotionnel reste réglable ensuite, produit par produit.
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
  const basculer = (p: any) =>
    setChoisis((liste) => (estChoisi(p.id) ? liste.filter((x) => x.id !== p.id) : [...liste, p]));

  const ajouter = useMutation({
    mutationFn: async () => {
      // Un appel par produit, dans l'ordre de sélection.
      for (let i = 0; i < choisis.length; i++) {
        await promotionsApi.create({ produitId: choisis[i].id, section, ordre: ordreDepart + i });
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

  return (
    <Modal
      titre="Ajouter des produits"
      sousTitre="Cochez les produits à afficher dans « Nos promos du moment »"
      largeur="md"
      onFermer={onFermer}
      actions={
        <>
          <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
          <BoutonPrincipal
            onClick={() => ajouter.mutate()}
            disabled={choisis.length === 0 || ajouter.isPending}
            ton="or"
          >
            {ajouter.isPending
              ? 'Ajout…'
              : choisis.length > 0
                ? `Ajouter (${choisis.length})`
                : 'Ajouter'}
          </BoutonPrincipal>
        </>
      }
    >
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
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
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
                      disabled={present}
                      onChange={() => basculer(p)}
                      className="w-4 h-4 accent-yellow-500 shrink-0"
                    />
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
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
    </Modal>
  );
}
