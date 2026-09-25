import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import shopClient from '@/infrastructure/http/shop.client';
import { useAuthStore } from '@/auth/store/auth.store';
import { useAuth } from '@/auth/hooks/useAuth';
import { showError, showSuccess } from '@/shared/utils/alert';
import Icon from '@/shared/components/dashboard/Icon';
import { PICTO } from '@/assets/images/logos';
import { erreurMotDePasse } from '@/auth/utils/motDePasse';
import '@/assets/css/Login.css';

/**
 * Première connexion d'un administrateur créé depuis le dashboard (ou dont les
 * identifiants ont été renvoyés) : le mot de passe temporaire reçu par email
 * doit être remplacé. Le backend refuse toute route admin d'ici là.
 */
export const ChangerMotDePassePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const user = useAuthStore((s) => s.user);
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);

  const [temporaire, setTemporaire] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [voir, setVoir] = useState(false);

  const changer = useMutation({
    mutationFn: () =>
      shopClient.post('/auth/changer-premier-mdp', {
        ancienPassword: temporaire,
        nouveauPassword: nouveau,
        confirmPassword: confirmation,
      }),
    onSuccess: (reponse) => {
      setMustChangePassword(false);
      // La vérification de session repart de zéro avec le compte régularisé.
      queryClient.removeQueries({ queryKey: ['session', 'admin'] });
      useAuthStore.getState().setSelectedApp('shop');
      navigate('/boutique/dashboard', { replace: true });
      showSuccess(reponse, 'Mot de passe modifié. Bienvenue !');
    },
    onError: (e) => showError(e),
  });

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!mustChangePassword) return <Navigate to="/boutique/dashboard" replace />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const erreur = erreurMotDePasse(nouveau, confirmation, temporaire);
    if (!temporaire) {
      showError('Saisissez le mot de passe temporaire reçu par email.');
      return;
    }
    if (erreur) {
      showError(erreur);
      return;
    }
    changer.mutate();
  };

  const champ = (
    label: string,
    valeur: string,
    onChange: (v: string) => void,
    autoComplete: string,
  ) => (
    <div className="auth-field">
      <label className="auth-label">{label}</label>
      <div className="auth-input-wrap">
        <span className="auth-input-ic">
          <Icon name="lock" size={16} />
        </span>
        <input
          className="auth-input"
          type={voir ? 'text' : 'password'}
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={changer.isPending}
          required
        />
      </div>
    </div>
  );

  return (
    <div className="auth-page auth-fit">
      <div className="auth-shell">
        <aside className="auth-brand">
          <div className="auth-brand-inner">
            <div className="auth-logo-tile">
              <img src={PICTO} alt="Yobante" />
            </div>
            <h1>
              Bienvenue{user?.prenom ? `, ${user.prenom}` : ''} <span className="accent">!</span>
            </h1>
            <p className="auth-brand-lead">
              Pour sécuriser votre compte administrateur, remplacez le mot de passe temporaire reçu
              par email par un mot de passe personnel.
            </p>
          </div>
          <div className="auth-brand-foot">© {new Date().getFullYear()} Yobante · Administration</div>
        </aside>

        <main className="auth-form-side">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2>Nouveau mot de passe</h2>
            <p className="auth-form-sub">
              Au moins 8 caractères, dont une majuscule et un chiffre.
            </p>

            {champ('Mot de passe temporaire', temporaire, setTemporaire, 'current-password')}
            {champ('Nouveau mot de passe', nouveau, setNouveau, 'new-password')}
            {champ('Confirmer le nouveau mot de passe', confirmation, setConfirmation, 'new-password')}

            <label className="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer select-none">
              <input type="checkbox" checked={voir} onChange={(e) => setVoir(e.target.checked)} />
              Afficher les mots de passe
            </label>

            <button className="auth-btn" type="submit" disabled={changer.isPending}>
              {changer.isPending ? <span className="auth-spinner" /> : 'Valider'}
            </button>

            <p className="auth-foot">
              <button
                type="button"
                onClick={() => void logout()}
                className="underline hover:text-gray-900"
              >
                Se déconnecter
              </button>
            </p>
          </form>
        </main>
      </div>
    </div>
  );
};
