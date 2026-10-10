# 🚀 Yobante Admin — Démarrage

Dashboard web d'administration de **Yobante Boutique**.

## Prérequis
- Node.js 18+
- npm
- `yobante-boutique-back` accessible (local `localhost:5000` ou `https://api.yobante-boutique.com/api/v1`)

## Installation

```bash
npm install

# .env.local
# VITE_SHOP_API_URL=https://api.yobante-boutique.com/api/v1
```

## Serveur de développement

```bash
npm run dev   # http://localhost:5173
```

## Connexion

1. Ouvrir `http://localhost:5173/login`.
2. Se connecter avec un compte dont le rôle est **ADMIN** : l'endpoint
   `POST /auth/admin/login` refuse tout autre rôle (403). Les vendeurs et les
   clients passent par l'application mobile.
3. Déroulement attendu :
   - `POST /auth/admin/login` → 200, jeton stocké sous `token_shop`
     (refresh token sous `refresh_token_shop`)
   - redirection vers `/boutique/dashboard`
   - `GET /admin/me` confirme la session côté serveur à chaque ouverture
4. Mot de passe temporaire (compte créé par l'administration) : la réponse
   porte `mustChangePassword`, et toutes les routes `/api/v1/admin` répondent
   403 `MOT_DE_PASSE_A_CHANGER` jusqu'au remplacement via
   `/changer-mot-de-passe`.

## Architecture

### Session
- **Store Zustand** : `src/auth/store/auth.store.ts`
  - `user`, `isAuthenticated`, `isShopAvailable`, `mustChangePassword`
- **Jetons** : `src/infrastructure/auth/tokenManager.ts` (localStorage)
- **Client HTTP** : `src/infrastructure/http/shop.client.ts` (Axios, jeton et
  rafraîchissement automatique ; un échec du rafraîchissement déconnecte)

### Protection des routes
- **PrivateRoute** : exige une session et la confirme côté serveur
  (`useVerificationSession`), sinon renvoie vers `/login`.
- Toutes les pages du dashboard vivent sous `/boutique/*`.

### Structure

```
src/
├── auth/            # service de connexion, store, hooks
├── infrastructure/  # client HTTP boutique, gestion des jetons
├── config/          # variables d'environnement (validées), TanStack Query
├── app/routes/      # table des routes, PrivateRoute
├── layouts/         # ShopLayout (en-tête, navigation)
├── pages/           # auth, public, shop/* (une page par écran)
└── domains/shop/    # appels API, hooks et types métier
```

## Dépannage

- **La connexion échoue toujours** : vérifier que le compte a le rôle ADMIN,
  que `VITE_SHOP_API_URL` est correct et que le CORS du backend autorise
  l'origine du dashboard.
- **Le jeton ne persiste pas** : vider le stockage (`localStorage.clear()`)
  et vérifier l'appel à `tokenManager.setShopToken()`.

## Build de production

```bash
npm run build     # bundle optimisé
npm run preview   # prévisualisation locale
```

## Déploiement Production (VPS Contabo)

L'app est servie à la racine de **`https://admin.yobante-boutique.com`** par nginx, sur un VPS Contabo.
Le build statique est envoyé par GitHub Actions (même principe que le projet `sign-admin`).

### Architecture

```
push sur main (GitHub)
      ↓
GitHub Actions (.github/workflows/deploy.yml)
      ↓  npm ci → écrit .env → npm run build
      ↓
SCP de dist/* → /var/www/yobante-admin  (sur le VPS)
      ↓
nginx sert admin.yobante-boutique.com (fallback SPA → /index.html)
```

### Secrets GitHub à configurer

Dans le repo **`jeune-dev/yobante-boutique-admin-prod`** → *Settings → Secrets and variables → Actions*, créer ces secrets :

| Secret | Valeur attendue |
|---|---|
| `VPS_HOST` | IP ou hostname du VPS Contabo (ex: `185.xxx.xxx.xxx`) |
| `VPS_USER` | Utilisateur SSH (ex: `root`) |
| `VPS_SSH_KEY` | Clé SSH privée complète (au format `-----BEGIN OPENSSH PRIVATE KEY-----…`) |
| `VITE_SHOP_API_URL` | `https://api.yobante-boutique.com/api/v1` |
| `VITE_APP_NAME` | `Yobante Admin` |
| `VITE_APP_VERSION` | `1.0.0` |

> Les 3 variables `VITE_*` sont injectées dans le build (pas secrètes en soi) mais passent par des secrets
> pour changer d'URL sans toucher au code.

### Préparation du VPS (une seule fois)

```bash
# 1. Dossier cible du déploiement
mkdir -p /var/www/yobante-admin

# 2. Copier deploy/nginx-admin.yobante-boutique.com.conf depuis ce repo
#    (ou utiliser scp depuis la machine locale)
sudo cp nginx-admin.yobante-boutique.com.conf /etc/nginx/sites-available/yobante-admin
sudo ln -s /etc/nginx/sites-available/yobante-admin /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 3. HTTPS (Let's Encrypt)
sudo certbot --nginx -d admin.yobante-boutique.com

# 4. DNS : pointez un enregistrement A (admin) vers l'IP du VPS
```

> Le workflow SCP écrit les fichiers en root. Après chaque déploiement, nginx lit
> `/var/www/yobante-admin` directement — pas de redémarrage nécessaire.

### Vérification

Chaque push sur `main` déclenche le workflow qui termine par :
```bash
curl -f -I https://admin.yobante-boutique.com   # doit répondre 200
```
Suivez l'exécution dans *Actions* du repo GitHub.

## Commandes

```bash
npm run dev         # serveur de développement
npm run build       # build de production
npm run lint        # ESLint
npm run format      # Prettier
npm run type-check  # vérification TypeScript
npm test            # tests (Vitest)
```
