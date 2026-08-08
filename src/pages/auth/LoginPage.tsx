import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '@/auth/hooks/useLogin';
import { useAuthStore } from '@/auth/store/auth.store';
import { showError } from '@/shared/utils/alert';
import Icon from '@/shared/components/dashboard/Icon';
import '@/assets/css/Login.css';
import { PICTO } from '@/assets/images/logos';

const FEATURES = [
  'Boutique en ligne & catalogue produits',
  'Expédition, conteneurs & suivi colis',
  "Pilotage de l'application mobile",
];

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
    <div className="auth-page auth-fit">
      <div className="auth-shell">
        {/* ── Panneau de marque ── */}
        <aside className="auth-brand">
          <div className="auth-brand-inner">
            <div className="auth-logo-tile">
              <img src={PICTO} alt="Yobante" />
            </div>
            <h1>
              Pilotez tout <span className="accent">Yobante</span> depuis un seul endroit
            </h1>
            <p className="auth-brand-lead">
              La plateforme d'administration unifiée pour votre boutique, vos expéditions et votre
              application mobile.
            </p>
            <ul className="auth-features">
              {FEATURES.map((f) => (
                <li className="auth-feature" key={f}>
                  <span className="auth-feature-ic"><Icon name="check" size={12} /></span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="auth-brand-foot">© {new Date().getFullYear()} Yobante · Administration</div>
        </aside>

        {/* ── Formulaire ── */}
        <main className="auth-form-side">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2>Connexion</h2>
            <p className="auth-form-sub">Accédez à votre espace d'administration</p>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <div className="auth-input-wrap">
                <span className="auth-input-ic"><Icon name="mail" size={16} /></span>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={login.isPending}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Mot de passe</label>
              <div className="auth-input-wrap">
                <span className="auth-input-ic"><Icon name="lock" size={16} /></span>
                <input
                  className="auth-input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={login.isPending}
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <Icon name={showPwd ? 'eye-off' : 'eye'} size={15} />
                </button>
              </div>
            </div>

            <button className="auth-btn" type="submit" disabled={login.isPending}>
              {login.isPending ? <span className="auth-spinner" /> : 'Se connecter'}
            </button>

            <p className="auth-foot">Accès réservé aux administrateurs Yobante</p>
          </form>
        </main>
      </div>

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
