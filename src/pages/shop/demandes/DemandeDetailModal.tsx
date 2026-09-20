import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/utils/alert';
import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';
import Modal, { BoutonPrincipal, BoutonSecondaire, Champ } from '@/pages/shop/accueil/components/Modal';

interface Props {
  demande: any;
  onFermer: () => void;
  onTraitee: () => void;
}

const formaterPrix = (v: any) => Number(v ?? 0).toLocaleString('fr-FR');

/**
 * Instruit une demande de publication envoyée depuis l'application vendeur.
 *
 * L'admin y voit ce que le vendeur a saisi — visuels, description, message
 * d'accompagnement — peut corriger la fiche avant mise en ligne, puis publier
 * ou rejeter en motivant.
 */
export default function DemandeDetailModal({ demande, onFermer, onTraitee }: Props) {
  const [nom, setNom] = useState(demande.nom ?? '');
  const [description, setDescription] = useState(demande.description ?? '');
  const [prix, setPrix] = useState(String(demande.prix ?? ''));
  const [stock, setStock] = useState(String(demande.stock ?? ''));
  const [motif, setMotif] = useState('');
  const [demandeRejet, setDemandeRejet] = useState(false);
  const [imageActive, setImageActive] = useState(0);

  // Les soumissions vendeur n'indiquent pas de rayon : c'est l'admin qui range
  // le produit, sans quoi il resterait introuvable dans la navigation mobile.
  const [rayonId, setRayonId] = useState(demande.rayonId ?? '');
  const [sousRayonId, setSousRayonId] = useState(demande.sousRayonId ?? '');

  const { data: rayonsData } = useQuery({
    queryKey: ['rayons-select'],
    queryFn: () =>
      shopClient
        .get('/admin/rayons', { params: { actif: true, limit: 100 } })
        .then((r: any) => r.rayons ?? []),
  });

  const { data: sousRayonsData } = useQuery({
    queryKey: ['sous-rayons-select', rayonId],
    queryFn: () =>
      shopClient.get(`/admin/rayons/${rayonId}/sous-rayons`).then((r: any) => r.sousRayons ?? []),
    enabled: !!rayonId,
  });

  const rayons: any[] = rayonsData || [];
  const sousRayons: any[] = sousRayonsData || [];

  const images: string[] = demande.images ?? [];
  const vendeur = demande.vendeur;
  const nomVendeur =
    vendeur?.profilVendeur?.nomBoutique ||
    [vendeur?.prenom, vendeur?.nom].filter(Boolean).join(' ') ||
    '—';

  const modifiee =
    nom !== (demande.nom ?? '') ||
    description !== (demande.description ?? '') ||
    prix !== String(demande.prix ?? '') ||
    stock !== String(demande.stock ?? '') ||
    rayonId !== (demande.rayonId ?? '') ||
    sousRayonId !== (demande.sousRayonId ?? '');

  const enregistrer = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('nom', nom);
      fd.append('description', description);
      fd.append('prix', prix);
      fd.append('stock', stock);
      if (rayonId) fd.append('rayonId', rayonId);
      if (sousRayonId) fd.append('sousRayonId', sousRayonId);
      return shopClient.put(`/admin/produits/${demande.id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (data) => {
      showSuccess(data);
      onTraitee();
    },
    onError: (e: any) => showError(e),
  });

  /**
   * La validation se fait en deux temps côté backend (`valide_step1` puis
   * `valide`). On enchaîne les deux, en reprenant là où la demande en est.
   */
  const publier = useMutation({
    mutationFn: async () => {
      if (modifiee) await enregistrer.mutateAsync();
      if (demande.statutValidation === 'en_attente') {
        await shopClient.patch(`/admin/produits/${demande.id}/valider-step1`);
      }
      return shopClient.patch(`/admin/produits/${demande.id}/valider-step2`);
    },
    onSuccess: (data) => {
      showSuccess(data);
      onTraitee();
      onFermer();
    },
    onError: (e: any) => showError(e),
  });

  const rejeter = useMutation({
    mutationFn: () =>
      shopClient.patch(`/admin/produits/${demande.id}/rejeter`, { motif }),
    onSuccess: (data) => {
      showSuccess(data);
      onTraitee();
      onFermer();
    },
    onError: (e: any) => showError(e),
  });

  const enCours = publier.isPending || rejeter.isPending || enregistrer.isPending;

  return (
    <Modal
      titre={demande.nom}
      sousTitre={`Demande de ${nomVendeur}`}
      onFermer={onFermer}
      largeur="lg"
      actions={
        demandeRejet ? (
          <>
            <BoutonSecondaire onClick={() => setDemandeRejet(false)}>Retour</BoutonSecondaire>
            <button
              type="button"
              onClick={() => {
                if (!motif.trim()) return showError('Indiquez un motif');
                rejeter.mutate();
              }}
              disabled={enCours}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
            >
              {rejeter.isPending ? 'Rejet…' : 'Confirmer le rejet'}
            </button>
          </>
        ) : (
          <>
            <BoutonSecondaire onClick={() => setDemandeRejet(true)}>Rejeter</BoutonSecondaire>
            {modifiee && (
              <BoutonSecondaire onClick={() => enregistrer.mutate()}>
                {enregistrer.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </BoutonSecondaire>
            )}
            <BoutonPrincipal
              onClick={() => {
                // Publier sans rangement mettrait le produit en ligne sans
                // qu'aucun écran mobile ne puisse l'atteindre.
                if (!rayonId || !sousRayonId) {
                  return showError('Rangez le produit dans un rayon et un sous-rayon');
                }
                publier.mutate();
              }}
              disabled={enCours}
              ton="or"
            >
              {publier.isPending
                ? 'Publication…'
                : modifiee
                  ? 'Enregistrer et publier'
                  : 'Publier'}
            </BoutonPrincipal>
          </>
        )
      }
    >
      {demandeRejet ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Le motif est transmis au vendeur : il le lit dans le suivi de sa demande.
          </p>
          <Champ
            label="Motif du rejet"
            valeur={motif}
            onChange={setMotif}
            lignes={4}
            placeholder="Expliquer ce qui doit être corrigé…"
          />
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Visuels envoyés par le vendeur ───────────────────────────── */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Images ({images.length})
            </h4>
            {images.length === 0 ? (
              <div className="py-8 text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg text-center">
                Aucune image envoyée.
              </div>
            ) : (
              <>
                <div className="aspect-[16/10] rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={images[imageActive]}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto">
                    {images.map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setImageActive(i)}
                        className={`w-14 h-14 rounded-md overflow-hidden shrink-0 border-2 transition-colors ${
                          i === imageActive ? 'border-yellow-500' : 'border-transparent'
                        }`}
                      >
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Message adressé à l'administration ───────────────────────── */}
          {demande.messageVendeur && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50/60 rounded-lg">
              <Icon name="message-square" size={15} className="text-blue-500 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-900 mb-0.5">
                  Message du vendeur
                </p>
                <p className="text-sm text-blue-900 whitespace-pre-wrap">
                  {demande.messageVendeur}
                </p>
              </div>
            </div>
          )}

          {/* ── Fiche, modifiable avant publication ──────────────────────── */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Fiche produit
            </h4>
            <Champ label="Nom" valeur={nom} onChange={setNom} />
            <Champ label="Description" valeur={description} onChange={setDescription} lignes={4} />
            <div className="grid grid-cols-2 gap-3">
              <Champ label="Prix (FCFA)" valeur={prix} onChange={setPrix} type="number" />
              <Champ label="Stock" valeur={stock} onChange={setStock} type="number" />
            </div>

            {/* Rangement — obligatoire avant mise en ligne. Les libellés de
                rayons sont longs : une colonne sur téléphone. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Rayon *</label>
                <select
                  value={rayonId}
                  onChange={(e) => {
                    setRayonId(e.target.value);
                    setSousRayonId('');
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">— Choisir —</option>
                  {rayons.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Sous-rayon *
                </label>
                <select
                  value={sousRayonId}
                  onChange={(e) => setSousRayonId(e.target.value)}
                  disabled={!rayonId}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">{rayonId ? '— Choisir —' : '— Rayon d’abord —'}</option>
                  {sousRayons.map((sr) => (
                    <option key={sr.id} value={sr.id}>
                      {sr.nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Contexte ─────────────────────────────────────────────────── */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-1 border-t border-gray-100">
            <Ligne label="Vendeur" valeur={nomVendeur} />
            <Ligne label="Contact" valeur={vendeur?.telephone || vendeur?.email || '—'} />
            <Ligne label="Catégorie" valeur={demande.categorie?.nom ?? '—'} />
            <Ligne
              label="Rangement"
              valeur={
                demande.rayon?.nom
                  ? `${demande.rayon.nom}${demande.sousRayon?.nom ? ` › ${demande.sousRayon.nom}` : ''}`
                  : 'Non rangé'
              }
            />
            <Ligne label="Prix demandé" valeur={`${formaterPrix(demande.prix)} FCFA`} />
            <Ligne
              label="Soumise le"
              valeur={new Date(demande.createdAt).toLocaleDateString('fr-FR')}
            />
          </dl>
        </div>
      )}
    </Modal>
  );
}

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-gray-900 truncate">{valeur}</dd>
    </div>
  );
}
