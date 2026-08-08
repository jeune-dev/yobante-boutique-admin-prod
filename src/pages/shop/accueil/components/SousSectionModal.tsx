import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/utils/alert';
import { blocsPromoApi } from '@/domains/shop/api/blocs-promo.api';
import Icon from '@/shared/components/dashboard/Icon';
import Modal, { BoutonPrincipal, BoutonSecondaire, Champ } from './Modal';

interface Props {
  section: string;
  /** Null en création. */
  bloc: any | null;
  onFermer: () => void;
  onEnregistre: () => void;
}

const LIBELLES: Record<string, string> = {
  nos_promos_du_moment: 'Nos promos du moment',
  a_ne_pas_rater: 'À ne pas rater',
  nos_promos_a_venir: 'Nos promos à venir',
};

/** Création ou modification d'une sous-section : image, titre, sous-titre, ordre. */
export default function SousSectionModal({ section, bloc, onFermer, onEnregistre }: Props) {
  const edition = Boolean(bloc);
  const [titre, setTitre] = useState(bloc?.titre ?? '');
  const [sousTitre, setSousTitre] = useState(bloc?.sousTitre ?? '');
  const [ordre, setOrdre] = useState<string>(bloc?.ordre?.toString() ?? '');
  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(bloc?.image ?? null);

  const enregistrer = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('section', section);
      fd.append('titre', titre);
      fd.append('sousTitre', sousTitre);
      if (ordre !== '') fd.append('ordre', ordre);
      if (fichier) fd.append('image', fichier);
      return edition ? blocsPromoApi.update(bloc.id, fd) : blocsPromoApi.create(fd);
    },
    onSuccess: (data) => {
      showSuccess(data);
      onEnregistre();
      onFermer();
    },
    onError: (e: any) => showError(e),
  });

  const choisirImage = (f: File | null) => {
    setFichier(f);
    // Aperçu local : l'image n'est envoyée qu'à l'enregistrement.
    setApercu(f ? URL.createObjectURL(f) : (bloc?.image ?? null));
  };

  const valider = () => {
    if (!titre.trim()) {
      showError('Donnez un titre à la sous-section');
      return;
    }
    enregistrer.mutate();
  };

  return (
    <Modal
      titre={edition ? 'Modifier la sous-section' : 'Nouvelle sous-section'}
      sousTitre={LIBELLES[section] ?? section}
      onFermer={onFermer}
      actions={
        <>
          <BoutonSecondaire onClick={onFermer}>Annuler</BoutonSecondaire>
          <BoutonPrincipal onClick={valider} disabled={enregistrer.isPending}>
            {enregistrer.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </BoutonPrincipal>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Image</label>
          {/* La zone entière est cliquable : plus confortable qu'un input nu. */}
          <label className="block cursor-pointer group">
            <div className="aspect-[16/9] rounded-xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 group-hover:border-yellow-400 transition-colors flex items-center justify-center">
              {apercu ? (
                <img src={apercu} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <Icon name="image" size={24} className="text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-400 mt-1.5">Cliquez pour choisir une image</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => choisirImage(e.target.files?.[0] ?? null)}
            />
          </label>
          {apercu && (
            <p className="text-xs text-gray-400 mt-1.5">
              Cliquez sur l'image pour la remplacer.
            </p>
          )}
        </div>

        <Champ
          label="Titre"
          valeur={titre}
          onChange={setTitre}
          placeholder="Ex. Électroménager"
        />
        <Champ
          label="Sous-titre"
          valeur={sousTitre}
          onChange={setSousTitre}
          placeholder="Ex. Jusqu'à −40 %"
        />
        <Champ
          label="Ordre d'affichage"
          valeur={ordre}
          onChange={setOrdre}
          type="number"
          aide="Laisser vide pour placer la sous-section en fin de section."
        />
      </div>
    </Modal>
  );
}
