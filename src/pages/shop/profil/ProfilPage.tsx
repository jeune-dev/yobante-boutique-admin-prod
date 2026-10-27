import { useId, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/utils/alert';
import shopClient from '@/infrastructure/http/shop.client';
import Icon from '@/shared/components/dashboard/Icon';
import AdminBackButton from '@/shared/components/AdminBackButton';

const api = {
  profil: () => shopClient.get('/profile'),
  modifier: (data: Record<string, any>) => shopClient.put('/profile', data),
  changerMotDePasse: (data: Record<string, any>) =>
    shopClient.put('/auth/change-password', data),
};

/** Compte de l'administrateur connecté : informations et mot de passe. */
export default function ProfilPage() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['profil'], queryFn: api.profil });
  const utilisateur = data?.user ?? data ?? {};

  return (
    // Centré sur grand écran, pleine largeur sur mobile.
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <header>
        {/* Ouvert depuis l'entête : retour à la page quittée ; sinon tableau de bord. */}
        <AdminBackButton parent="/boutique/dashboard" className="mb-3" />
        <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight text-gray-900">Mon profil</h1>
        <p className="text-sm text-gray-500 mt-1">Vos informations et votre mot de passe.</p>
      </header>

      {isLoading ? (
        <div className="text-sm text-gray-400">Chargement…</div>
      ) : (
        <>
          <Identite utilisateur={utilisateur} />
          <Informations utilisateur={utilisateur} onEnregistre={refetch} />
          <MotDePasse />
        </>
      )}
    </div>
  );
}

function Identite({ utilisateur }: { utilisateur: any }) {
  const initiales = `${utilisateur.prenom?.[0] ?? ''}${utilisateur.nom?.[0] ?? ''}`.toUpperCase();
  return (
    <section className="carte p-5 flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-900 text-lg font-semibold text-yellow-400">
        {initiales || <Icon name="user" size={22} />}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-gray-900">
          {[utilisateur.prenom, utilisateur.nom].filter(Boolean).join(' ') || 'Administrateur'}
        </div>
        <div className="text-sm text-gray-500 break-all">{utilisateur.email}</div>
        {utilisateur.role && (
          <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
            {utilisateur.role}
          </span>
        )}
      </div>
    </section>
  );
}

function Informations({
  utilisateur,
  onEnregistre,
}: {
  utilisateur: any;
  onEnregistre: () => void;
}) {
  const [nom, setNom] = useState(utilisateur.nom ?? '');
  const [prenom, setPrenom] = useState(utilisateur.prenom ?? '');
  const [telephone, setTelephone] = useState(utilisateur.telephone ?? '');

  const enregistrer = useMutation({
    mutationFn: () => api.modifier({ nom, prenom, telephone }),
    onSuccess: (data) => {
      showSuccess(data);
      onEnregistre();
    },
    onError: (e: any) => showError(e),
  });

  return (
    <section className="carte p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Informations</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Champ label="Prénom" valeur={prenom} onChange={setPrenom} autoComplete="given-name" />
        <Champ label="Nom" valeur={nom} onChange={setNom} autoComplete="family-name" />
        <Champ label="Téléphone" valeur={telephone} onChange={setTelephone} autoComplete="tel" />
      </div>
      <button
        onClick={() => enregistrer.mutate()}
        disabled={enregistrer.isPending}
        className="btn-sombre mt-4"
      >
        {enregistrer.isPending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </section>
  );
}

function MotDePasse() {
  const [ancien, setAncien] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const changer = useMutation({
    mutationFn: () => api.changerMotDePasse({ oldPassword: ancien, newPassword: nouveau }),
    onSuccess: (data) => {
      showSuccess(data);
      setAncien('');
      setNouveau('');
      setConfirmation('');
    },
    onError: (e: any) => showError(e),
  });

  const valider = () => {
    if (nouveau.length < 8) {
      showError('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (nouveau !== confirmation) {
      showError('La confirmation ne correspond pas');
      return;
    }
    changer.mutate();
  };

  return (
    <section className="carte p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Mot de passe</h2>
      <div className="space-y-3">
        <Champ
          label="Mot de passe actuel"
          valeur={ancien}
          onChange={setAncien}
          type="password"
          autoComplete="current-password"
        />
        <Champ
          label="Nouveau mot de passe"
          valeur={nouveau}
          onChange={setNouveau}
          type="password"
          autoComplete="new-password"
        />
        <Champ
          label="Confirmer le nouveau mot de passe"
          valeur={confirmation}
          onChange={setConfirmation}
          type="password"
          autoComplete="new-password"
        />
      </div>
      <button
        onClick={valider}
        disabled={changer.isPending}
        className="btn-sombre mt-4"
      >
        {changer.isPending ? 'Modification…' : 'Changer le mot de passe'}
      </button>
    </section>
  );
}

function Champ({
  label,
  valeur,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  // `htmlFor` / `id` : le libellé n'était relié à aucun champ. Un lecteur
  // d'écran annonçait « zone de saisie » sans dire laquelle, et cliquer le
  // libellé ne donnait pas le focus (WCAG 2.2 AA, 1.3.1 et 4.1.2).
  // `useId` garantit l'unicité même si le composant est rendu plusieurs fois.
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="champ w-full"
      />
    </div>
  );
}
