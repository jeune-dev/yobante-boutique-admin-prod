import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { motDePasseOublieService } from '@/auth/services/auth.service';
import { erreurMotDePasse } from '@/auth/utils/motDePasse';
import { showError, showSuccess } from '@/shared/utils/alert';
import Icon from '@/shared/components/dashboard/Icon';
import { PICTO } from '@/assets/images/logos';
import '@/assets/css/Login.css';

type Etape = 'email' | 'code' | 'motDePasse';

const ETAPES: Etape[] = ['email', 'code', 'motDePasse'];

/** Délai avant de pouvoir redemander un code (le backend limite aussi). */
const DELAI_RENVOI_S = 60;

const TITRES: Record<Etape, { titre: string; sous: string }> = {
  email: {
    titre: 'Mot de passe oublié',
    sous: 'Saisissez l’e-mail de votre compte administrateur.',
  },
  code: { titre: 'Vérifiez vos e-mails', sous: 'Saisissez le code reçu par e-mail.' },
  motDePasse: {
    titre: 'Nouveau mot de passe',
    sous: 'Au moins 8 caractères, dont une majuscule et un chiffre.',
  },
};

/**
 * Réinitialisation du mot de passe d'un administrateur, en trois étapes :
 * e-mail → code reçu par e-mail (vérifié) → nouveau mot de passe. Le backend
 * répond de la même façon que le compte existe ou non : la page ne dit donc
 * jamais si l'adresse est connue.
 */
export const MotDePasseOubliePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [etape, setEtape] = useState<Etape>('email');
  const [email, setEmail] = useState(
    () => (location.state as { email?: string } | null)?.email ?? ''
  );
  const [code, setCode] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [voir, setVoir] = useState(false);
  const [attente, setAttente] = useState(0);

  useEffect(() => {
    if (attente <= 0) return;
    const minuterie = setTimeout(() => setAttente((s) => s - 1), 1000);
    return () => clearTimeout(minuterie);
  }, [attente]);

  const demander = useMutation({
    mutationFn: () => motDePasseOublieService.demanderCode(email),
    onSuccess: () => {
      setEtape('code');
      setCode('');
      setAttente(DELAI_RENVOI_S);
    },
    onError: (e) => showError(e),
  });

  const verifier = useMutation({
    mutationFn: () => motDePasseOublieService.verifierCode(email, code),
    onSuccess: () => setEtape('motDePasse'),
    onError: (e) => showError(e, 'Code invalide ou expiré.'),
  });

  const reinitialiser = useMutation({
    mutationFn: () => motDePasseOublieService.reinitialiser(email, code, nouveau),
    onSuccess: (reponse) => {
      showSuccess(reponse, 'Mot de passe réinitialisé. Vous pouvez vous connecter.');
      navigate('/login', { replace: true, state: { email: email.trim() } });
    },
    onError: (e) => {
      showError(e);
      // Code expiré ou déjà utilisé entre-temps : il faut en redemander un.
      setEtape('code');
    },
  });

  const enCours = demander.isPending || verifier.isPending || reinitialiser.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (etape === 'email') {
      if (!/\S+@\S+\.\S+/.test(email.trim())) {
        showError('Saisissez une adresse e-mail valide.');
        return;
      }
      demander.mutate();
    } else if (etape === 'code') {
      if (code.trim().length < 6) {
        showError('Saisissez le code reçu par e-mail.');
        return;
      }
      verifier.mutate();
    } else {
      const erreur = erreurMotDePasse(nouveau, confirmation, '');
      if (erreur) {
        showError(erreur);
        return;
      }
      reinitialiser.mutate();
    }
  };

  const champMotDePasse = (
    id: string,
    label: string,
    valeur: string,
    onChange: (v: string) => void,
    autoFocus = false
  ) => (
    <div className="auth-field">
      <label className="auth-label" htmlFor={id}>
        {label}
      </label>
      <div className="auth-input-wrap">
        <span className="auth-input-ic">
          <Icon name="lock" size={16} />
        </span>
        <input
          id={id}
          className="auth-input"
          type={voir ? 'text' : 'password'}
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          autoFocus={autoFocus}
          required
          disabled={enCours}
        />
      </div>
    </div>
  );

  const indexEtape = ETAPES.indexOf(etape);

  return (
    <div className="auth-page auth-fit auth-solo">
      <main className="auth-card">
        <div className="auth-card-head">
          <span className="auth-card-logo">
            <img src={PICTO} alt="" aria-hidden="true" />
          </span>
          <h1 className="auth-card-title">{TITRES[etape].titre}</h1>
          <p className="auth-card-sub">{TITRES[etape].sous}</p>
        </div>

        <div className="auth-steps" aria-label={`Étape ${indexEtape + 1} sur ${ETAPES.length}`}>
          {ETAPES.map((e, i) => (
            <span key={e} className={i <= indexEtape ? 'done' : undefined} />
          ))}
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {etape === 'email' && (
            <div className="auth-field">
              <label className="auth-label" htmlFor="oubli-email">
                Email
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-ic">
                  <Icon name="mail" size={16} />
                </span>
                <input
                  id="oubli-email"
                  className="auth-input"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                  disabled={enCours}
                />
              </div>
            </div>
          )}

          {etape === 'code' && (
            <>
              <p className="auth-note">
                Si <strong>{email.trim()}</strong> correspond à un compte administrateur, un code
                vient d’y être envoyé. Il est valable 15 minutes. Pensez à vérifier les indésirables.
              </p>
              <div className="auth-field">
                <label className="auth-label" htmlFor="oubli-code">
                  Code de vérification
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-ic">
                    <Icon name="shield" size={16} />
                  </span>
                  <input
                    id="oubli-code"
                    className="auth-input auth-input-code"
                    type="text"
                    inputMode="text"
                    placeholder="XXXXXXXX"
                    maxLength={12}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    disabled={enCours}
                  />
                </div>
              </div>
            </>
          )}

          {etape === 'motDePasse' && (
            <>
              {champMotDePasse('oubli-nouveau', 'Nouveau mot de passe', nouveau, setNouveau, true)}
              {champMotDePasse(
                'oubli-confirmation',
                'Confirmer le mot de passe',
                confirmation,
                setConfirmation
              )}
              <label className="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer select-none">
                <input type="checkbox" checked={voir} onChange={(e) => setVoir(e.target.checked)} />
                Afficher les mots de passe
              </label>
            </>
          )}

          <button className="auth-btn" type="submit" disabled={enCours}>
            {enCours ? (
              <span className="auth-spinner" />
            ) : etape === 'email' ? (
              'Recevoir un code'
            ) : etape === 'code' ? (
              'Vérifier le code'
            ) : (
              'Réinitialiser le mot de passe'
            )}
          </button>

          <div className="auth-actions-secondaires">
            {etape === 'email' ? (
              <Link className="auth-link" to="/login" state={{ email: email.trim() }}>
                ← Retour à la connexion
              </Link>
            ) : (
              <button
                type="button"
                className="auth-link"
                onClick={() => setEtape('email')}
                disabled={enCours}
              >
                ← Changer d’e-mail
              </button>
            )}
            {etape === 'code' && (
              <button
                type="button"
                className="auth-link"
                onClick={() => demander.mutate()}
                disabled={enCours || attente > 0}
              >
                {attente > 0 ? `Renvoyer (${attente}s)` : 'Renvoyer le code'}
              </button>
            )}
          </div>
        </form>

        <p className="auth-card-foot">
          Accès réservé aux administrateurs Yobante
          <br />© {new Date().getFullYear()} Yobante · Administration
        </p>
      </main>
    </div>
  );
};
