import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '@/auth/hooks/useLogin';
import { useAuthStore } from '@/auth/store/auth.store';
import { showError } from '@/shared/utils/alert';
import Icon from '@/shared/components/dashboard/Icon';
import '@/assets/css/Login.css';
import { PICTO } from '@/assets/images/logos';

const APPS = [
  {
    id: 'shop' as const,
    label: 'Yobante Boutique',
    desc: 'Gérez votre catalogue, vos commandes et vos clients boutique.',
    chips: ['Catalogue', 'Commandes', 'Clients'],
    accent: '#f5c518',
    ink: '#111',
    path: '/boutique/dashboard',
  },
  {
    id: 'shipment' as const,
    label: 'Yobante Colis',
    desc: 'Suivez vos expéditions, conteneurs et livraisons.',
    chips: ['Expéditions', 'Conteneurs', 'Suivi'],
    accent: '#17379b',
    ink: '#fff',
    path: '/colis/dashboard',
  },
];

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const setSelectedApp = useAuthStore((state) => state.setSelectedApp);
  const login = useLogin(() => setShowModal(true));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showError('Veuillez remplir tous les champs');
      return;
    }
    login.mutate({ email, password });
  };

  const handleSelectApp = (app: typeof APPS[number]) => {
    setSelectedApp(app.id);
    navigate(app.path);
  };

  return (
    <div className="auth-page auth-fit auth-solo">
      <main className="auth-card">
        <div className="auth-card-head">
          <span className="auth-card-logo">
            {/* Décoratif : le nom de la marque est déjà dans le titre. */}
            <img src={PICTO} alt="" aria-hidden="true" />
          </span>
          <h1 className="auth-card-title">Yobante Administration</h1>
          <p className="auth-card-sub">Connectez-vous à votre espace</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            {/* `htmlFor` / `id` : sans eux, cliquer le libellé ne plaçait pas
                le curseur dans le champ et les lecteurs d'écran annonçaient
                un champ sans nom. */}
            <label className="auth-label" htmlFor="login-email">
              Email
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-ic"><Icon name="mail" size={16} /></span>
              <input
                id="login-email"
                className="auth-input"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
                disabled={login.isPending}
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="login-password">
              Mot de passe
            </label>
            <div className="auth-input-wrap">
              <span className="auth-input-ic"><Icon name="lock" size={16} /></span>
              <input
                id="login-password"
                className="auth-input"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={login.isPending}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showPwd}
              >
                <Icon name={showPwd ? 'eye-off' : 'eye'} size={15} />
              </button>
            </div>
          </div>

          <button className="auth-btn" type="submit" disabled={login.isPending}>
            {login.isPending ? (
              <>
                <span className="auth-spinner" />
                Connexion…
              </>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <p className="auth-card-foot">
          Accès réservé aux administrateurs Yobante
          <br />© {new Date().getFullYear()} Yobante · Administration
        </p>
      </main>

      {/* ── Modal de choix de dashboard (les 2 backs ont répondu) ── */}
      {showModal && (
        <div className="app-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="app-modal" onClick={(e) => e.stopPropagation()}>
            <div className="app-modal-head">
              <img src={PICTO} alt="Yobante" className="app-modal-logo" />
              <h3>Choisissez votre espace</h3>
              <p>Vous avez accès aux deux plateformes. Laquelle voulez-vous gérer ?</p>
            </div>
            <div className="app-modal-grid">
              {APPS.map((app) => (
                <button
                  key={app.id}
                  className="app-modal-card"
                  style={{ '--accent': app.accent, '--ink': app.ink } as React.CSSProperties}
                  onClick={() => handleSelectApp(app)}
                >
                  <span className="app-modal-card-name">{app.label}</span>
                  <span className="app-modal-card-desc">{app.desc}</span>
                  <span className="app-modal-chips">
                    {app.chips.map((c) => <span key={c} className="app-modal-chip">{c}</span>)}
                  </span>
                  <span className="app-modal-cta">
                    Accéder <Icon name="arrow-right" size={14} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
