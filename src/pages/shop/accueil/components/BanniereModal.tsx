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

interface OptionRayon {
  id: string;
  nom: string;
}

const formaterPrix = (v: any) => Number(v ?? 0).toLocaleString('fr-FR');

/**
 * Crée ou modifie une bannière de la section principale de l'accueil mobile.
 *
 * Dans l'application, la bannière porte un bouton (« Découvrir » par défaut).
 * Au toucher, l'application ouvre, dans cet ordre de priorité :
 *   1. les produits mis en avant ci-dessous, s'il y en a ;
 *   2. sinon le rayon choisi ;
 *   3. sinon le lien externe ;
 *   4. sinon la liste des promotions en cours.
 */
export default function BanniereModal({ banniere, onFermer, onEnregistre }: Props) {
  const edition = Boolean(banniere);
  const fichierRef = useRef<HTMLInputElement>(null);

  const [titre, setTitre] = useState(banniere?.titre ?? '');
  const [lien, setLien] = useState(banniere?.lien ?? '');
  const [rayonId, setRayonId] = useState<string>(banniere?.rayonId ?? '');
  const [afficherBouton, setAfficherBouton] = useState<boolean>(banniere?.afficherBouton ?? true);
  const [texteBouton, setTexteBouton] = useState<string>(banniere?.texteBouton || 'Découvrir');
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(banniere?.image ?? null);

  const [rayons, setRayons] = useState<OptionRayon[]>([]);
  // Tenue à jour localement : la liste reste juste après un ajout ou un retrait.
  const [produitsAssocies, setProduitsAssocies] = useState<any[]>(banniere?.produits ?? []);

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

  /** Rayons proposés comme destination de la bannière. */
  useEffect(() => {
    shopClient
      .get<{ rayons?: OptionRayon[] }>('/admin/rayons', { params: { actif: true, limit: 100 } })
      .then((r: any) => setRayons(r.rayons ?? []))
      .catch(() => setRayons([]));
  }, []);

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
      fd.append('lien', lien.trim());
      fd.append('rayonId', rayonId);
      fd.append('afficherBouton', String(afficherBouton));
      fd.append('texteBouton', texteBouton.trim() || 'Découvrir');
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
    mutationFn: (produit: any) =>
      shopClient.post(`/admin/bannieres/${banniere.id}/produits`, { produitId: produit.id }),
    onSuccess: (data, produit) => {
      showSuccess(data);
      setProduitsAssocies((liste) => [...liste, produit]);
      setRecherche('');
      onEnregistre();
    },
    onError: (e: any) => showError(e),
  });

  const retirer = useMutation({
    mutationFn: (produitId: string) =>
      shopClient.delete(`/admin/bannieres/${banniere.id}/produits/${produitId}`),
    onSuccess: (data, produitId) => {
      showSuccess(data);
      setProduitsAssocies((liste) => liste.filter((p) => p.id !== produitId));
      onEnregistre();
    },
    onError: (e: any) => showError(e),
  });

  const valider = () => {
    if (!titre.trim()) return showError('Le titre est obligatoire');
    if (!edition && !fichier) return showError('Choisissez une image');
    // L'application n'ouvre que les liens sécurisés.
    if (lien.trim() && !/^https:\/\//i.test(lien.trim())) {
      return showError('Le lien doit commencer par https://');
    }
    enregistrer.mutate();
  };

  const idsAssocies = new Set(produitsAssocies.map((p) => p.id));

  /** Ce que l'application ouvrira au toucher, pour l'expliquer à l'admin. */
  const destination =
    produitsAssocies.length > 0
      ? `les ${produitsAssocies.length} produit(s) mis en avant`
      : rayonId
        ? `le rayon « ${rayons.find((r) => r.id === rayonId)?.nom ?? '…'} »`
        : lien.trim()
          ? 'le lien externe'
          : 'la liste des promotions en cours';

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
        {/* ── Image (avec le bouton tel qu'il apparaîtra dans l'application) ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Image</label>
          <button
            type="button"
            onClick={() => fichierRef.current?.click()}
            className="w-full aspect-[1.9/1] rounded-2xl border-2 border-dashed border-gray-200 hover:border-yellow-400 bg-gray-50 overflow-hidden flex items-center justify-center transition-colors group"
          >
            {apercu ? (
              <span className="relative w-full h-full block">
                <img src={apercu} alt="" className="w-full h-full object-cover" />
                {afficherBouton && (
                  <span className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 bg-white text-[#053D8F] text-xs font-bold px-3.5 py-1.5 rounded-full shadow">
                    {texteBouton.trim() || 'Découvrir'} <span aria-hidden>→</span>
                  </span>
                )}
                <span className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/40 transition-colors flex items-center justify-center">
                  <span className="badge opacity-0 group-hover:opacity-100 text-white bg-gray-900/80">
                    Changer l'image
                  </span>
                </span>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-gray-400">
                <Icon name="image" size={24} />
                <span className="text-xs font-medium">Choisir une image (format 1,9:1 conseillé)</span>
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

        <Champ label="Titre" valeur={titre} onChange={setTitre} placeholder="Ex. Spécial Tabaski" />

        {/* ── Bouton posé sur la bannière ───────────────────────────────── */}
        <div className="rounded-lg border border-gray-100 p-3 space-y-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span>
              <span className="block text-sm font-medium text-gray-700">Bouton sur la bannière</span>
              <span className="block text-xs text-gray-400">Affiché en bas à gauche de l'image</span>
            </span>
            <input
              type="checkbox"
              checked={afficherBouton}
              onChange={(e) => setAfficherBouton(e.target.checked)}
              className="h-4 w-4 accent-[#053D8F]"
            />
          </label>
          {afficherBouton && (
            <Champ
              label="Texte du bouton"
              valeur={texteBouton}
              onChange={(v) => setTexteBouton(v.slice(0, 40))}
              placeholder="Découvrir"
            />
          )}
        </div>

        {/* ── Destination ───────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Rayon ouvert (facultatif)
          </label>
          <select
            value={rayonId}
            onChange={(e) => setRayonId(e.target.value)}
            className="champ w-full"
          >
            <option value="">Aucun rayon</option>
            {rayons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nom}
              </option>
            ))}
          </select>
        </div>
        <Champ
          label="Lien externe (facultatif)"
          valeur={lien}
          onChange={setLien}
          placeholder="https://…"
          aide="Utilisé seulement sans produits mis en avant ni rayon."
        />
        <p className="text-xs text-[#053D8F] bg-blue-50 rounded-lg px-3 py-2">
          Dans l'application, le toucher ouvrira {destination}.
        </p>

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
                    className="inline-flex items-center gap-1 text-xs font-medium bg-gray-100 text-gray-700 pl-2 pr-1 py-1 rounded-full"
                  >
                    {p.nom}
                    <button
                      type="button"
                      onClick={() => retirer.mutate(p.id)}
                      disabled={retirer.isPending}
                      title="Retirer de la bannière"
                      className="w-4 h-4 rounded-full hover:bg-gray-300 text-gray-500 leading-none disabled:opacity-50"
                    >
                      ×
                    </button>
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
                className="champ w-full pl-9 pr-3"
              />
            </div>

            {chargement && <p className="text-xs text-gray-400 mt-2">Chargement…</p>}

            {!chargement && resultats.length > 0 && (
              <ul className="mt-2 border border-gray-100 rounded-lg max-h-52 overflow-auto divide-y divide-gray-50">
                {resultats
                  .filter((p) => !idsAssocies.has(p.id))
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => associer.mutate(p)}
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
