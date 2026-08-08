import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/utils/alert';
import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';
import Modal, { BoutonPrincipal, BoutonSecondaire, Champ } from './Modal';

interface Props {
  /** Null en création. */
  banniere: any | null;
  onFermer: () => void;
  onEnregistre: () => void;
}

const formaterPrix = (v: any) => Number(v ?? 0).toLocaleString('fr-FR');

/**
 * Crée ou modifie une bannière de la section principale, et lui rattache les
 * produits mis en avant.
 *
 * Remplace l'ancienne page « Bannières » : tout se règle désormais depuis la
 * page d'accueil, là où l'on voit le rendu.
 */
export default function BanniereModal({ banniere, onFermer, onEnregistre }: Props) {
  const edition = Boolean(banniere);
  const fichierRef = useRef<HTMLInputElement>(null);

  const [titre, setTitre] = useState(banniere?.titre ?? '');
  const [lien, setLien] = useState(banniere?.lien ?? '');
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(banniere?.image ?? null);

  const [recherche, setRecherche] = useState('');
  const [resultats, setResultats] = useState<any[]>([]);
  const [chargement, setChargement] = useState(false);

  /** Aperçu local avant envoi, pour juger le cadrage de l'image. */
  useEffect(() => {
    if (!fichier) return;
    const url = URL.createObjectURL(fichier);
    setApercu(url);
    // Sans révocation, chaque changement d'image fuit un objet en mémoire.
    return () => URL.revokeObjectURL(url);
  }, [fichier]);

  /** Catalogue affiché d'emblée, filtré au fil de la frappe. */
  useEffect(() => {
    if (!edition) return;
    setChargement(true);
    const t = setTimeout(
      async () => {
        try {
          const r: any = await shopClient.get('/admin/produits', {
            params: {
              limit: 20,
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
  }, [recherche, edition]);

  const enregistrer = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('titre', titre);
      if (lien) fd.append('lien', lien);
      if (fichier) fd.append('image', fichier);
      const options = { headers: { 'Content-Type': 'multipart/form-data' } };
      return edition
        ? shopClient.put(`/admin/bannieres/${banniere.id}`, fd, options)
        : shopClient.post('/admin/bannieres', fd, options);
    },
    onSuccess: (data) => {
      showSuccess(data);
      onEnregistre();
      onFermer();
    },
    onError: (e: any) => showError(e),
  });

  const associer = useMutation({
    mutationFn: (produitId: string) =>
      shopClient.post(`/admin/bannieres/${banniere.id}/produits`, { produitId }),
    onSuccess: (data) => {
      showSuccess(data);
      setRecherche('');
      onEnregistre();
    },
    onError: (e: any) => showError(e),
  });

  const valider = () => {
    if (!titre.trim()) return showError('Le titre est obligatoire');
    if (!edition && !fichier) return showError('Choisissez une image');
    enregistrer.mutate();
  };

  const produitsAssocies: any[] = banniere?.produits ?? [];

  return (
    <Modal
      titre={edition ? 'Modifier la bannière' : 'Nouvelle bannière'}
      sousTitre="Affichée en haut de l'accueil de l'application"
      onFermer={onFermer}
      largeur="md"
      actions={
        <>
          <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
          <BoutonPrincipal onClick={valider} disabled={enregistrer.isPending} ton="or">
            {enregistrer.isPending ? 'Enregistrement…' : edition ? 'Enregistrer' : 'Créer'}
          </BoutonPrincipal>
        </>
      }
    >
      <div className="space-y-4">
        {/* ── Image ─────────────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Image</label>
          <button
            type="button"
            onClick={() => fichierRef.current?.click()}
            className="w-full aspect-[16/9] rounded-lg border-2 border-dashed border-gray-200 hover:border-yellow-400 bg-gray-50 overflow-hidden flex items-center justify-center transition-colors group"
          >
            {apercu ? (
              <span className="relative w-full h-full block">
                <img src={apercu} alt="" className="w-full h-full object-cover" />
                <span className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/40 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-xs font-semibold text-white bg-gray-900/80 px-2.5 py-1 rounded-full">
                    Changer l'image
                  </span>
                </span>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-gray-400">
                <Icon name="image" size={24} />
                <span className="text-xs font-medium">Choisir une image</span>
              </span>
            )}
          </button>
          <input
            ref={fichierRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
          />
          {edition && !fichier && (
            <p className="text-xs text-gray-400 mt-1">
              Sans nouvelle image, l'image actuelle est conservée.
            </p>
          )}
        </div>

        <Champ label="Titre" valeur={titre} onChange={setTitre} placeholder="Ex. Soldes d'été" />
        <Champ
          label="Lien (facultatif)"
          valeur={lien}
          onChange={setLien}
          placeholder="https://…"
          aide="Ouvert au clic sur la bannière dans l'application."
        />

        {/* ── Produits mis en avant ─────────────────────────────────────── */}
        {edition ? (
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Produits mis en avant
            </label>

            {produitsAssocies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {produitsAssocies.map((p: any) => (
                  <span
                    key={p.id}
                    className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                  >
                    {p.nom}
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icon name="search" size={15} />
              </span>
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un produit à mettre en avant…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
            </div>

            {chargement && <p className="text-xs text-gray-400 mt-2">Chargement…</p>}

            {!chargement && resultats.length > 0 && (
              <ul className="mt-2 border border-gray-100 rounded-lg max-h-52 overflow-auto divide-y divide-gray-50">
                {resultats.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => associer.mutate(p.id)}
                      disabled={associer.isPending}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-yellow-50/60 disabled:opacity-50"
                    >
                      {p.images?.[0] ? (
                        <img
                          src={p.images[0]}
                          alt=""
                          className="w-8 h-8 rounded object-cover shrink-0"
                        />
                      ) : (
                        <span className="w-8 h-8 rounded bg-gray-100 shrink-0" />
                      )}
                      <span className="flex-1 text-sm text-gray-800 truncate">{p.nom}</span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {formaterPrix(p.prix)} FCFA
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            Les produits mis en avant pourront être ajoutés une fois la bannière créée.
          </p>
        )}
      </div>
    </Modal>
  );
}
