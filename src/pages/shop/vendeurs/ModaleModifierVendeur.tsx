import { useState } from 'react';
import { PhoneInput } from '@/shared/components/PhoneInput';
import { showConfirm } from '@/shared/utils/alert';
import {
  adresseBoutique,
  nomBoutique,
  telephoneVendeur,
  type Vendeur,
} from '@/domains/shop/api/vendeurs.api';

interface Props {
  vendeur: Vendeur;
  enCours?: boolean;
  onFermer: () => void;
  onEnregistrer: (payload: Record<string, unknown>) => void;
}

const champsDepuis = (v: Vendeur) => ({
  nom: v.nom || '',
  prenom: v.prenom || '',
  email: v.email || '',
  telephone: telephoneVendeur(v),
  // Renseignés seulement si l'admin ressaisit le numéro : le backend reformate
  // alors à partir de l'indicatif choisi.
  phoneCountryCode: '',
  phoneNationalNumber: '',
  nomBoutique: nomBoutique(v) === '—' ? '' : nomBoutique(v),
  adresseBoutique: adresseBoutique(v),
});

/**
 * Modale « Modifier le vendeur », partagée par la liste et la fiche.
 *
 * Le même formulaire vivait en double : la fiche aurait envoyé un corps
 * légèrement différent de celui de la liste (champs vides transmis, téléphone
 * non reformaté) pour la même route `PUT /admin/vendeurs/:id`.
 */
export default function ModaleModifierVendeur({
  vendeur,
  enCours = false,
  onFermer,
  onEnregistrer,
}: Props) {
  const [form, setForm] = useState(() => champsDepuis(vendeur));

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();

    const confirme = await showConfirm({
      titre: 'Modifier le vendeur',
      message: `Enregistrer les modifications pour ${form.prenom} ${form.nom} ?`,
      confirmText: 'Enregistrer',
    });
    if (!confirme) return;

    const payload: Record<string, unknown> = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      nomBoutique: form.nomBoutique.trim(),
    };
    if (form.telephone.trim()) {
      payload.telephone = form.telephone.trim();
      if (form.phoneCountryCode) payload.phoneCountryCode = form.phoneCountryCode;
      if (form.phoneNationalNumber) payload.phoneNationalNumber = form.phoneNationalNumber;
    }
    if (form.adresseBoutique.trim()) payload.adresseBoutique = form.adresseBoutique.trim();

    onEnregistrer(payload);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onFermer}
      role="dialog"
      aria-modal="true"
      aria-label="Modifier le vendeur"
    >
      <div className="modal-box max-w-md p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Modifier le vendeur</h2>
        <form onSubmit={soumettre} className="space-y-4" autoComplete="off">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Prénom *</label>
              <input
                required
                value={form.prenom}
                onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                className="champ mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Nom *</label>
              <input
                required
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                className="champ mt-1 w-full"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email *</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="champ mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Téléphone</label>
            <PhoneInput
              value={form.telephone}
              onChange={(phone, meta) => {
                setForm((f) => ({
                  ...f,
                  telephone: phone,
                  phoneCountryCode: meta.country.iso2.toUpperCase(),
                  phoneNationalNumber: meta.inputValue,
                }));
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Nom de la boutique *</label>
            <input
              required
              value={form.nomBoutique}
              onChange={(e) => setForm((f) => ({ ...f, nomBoutique: e.target.value }))}
              className="champ mt-1 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Adresse de la boutique</label>
            <input
              value={form.adresseBoutique}
              onChange={(e) => setForm((f) => ({ ...f, adresseBoutique: e.target.value }))}
              className="champ mt-1 w-full"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onFermer}
              className="px-4 py-2.5 sm:py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={enCours}
              className="px-4 py-2.5 sm:py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {enCours ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
