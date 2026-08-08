# 🚀 Yobante Admin - Getting Started

## Prerequisites
- Node.js 18+
- npm ou yarn
- yobante-boutique-back running on `localhost:5000`
- yobante-colis-back running on `localhost:5001`

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Environment configuration is already in .env.local:
# VITE_SHOP_API_URL=https://api.yobanterek.com/api/v1
# VITE_SHIPMENT_API_URL=https://api.yobanterek.com/api/v1
```

## Development Server

```bash
npm run dev
```

The app will start at `http://localhost:5173`

## How to Test the Login Flow

### Complete Dual Login (Both Backends Available)
1. Start both backends:
   ```bash
   # Terminal 1: boutique backend
   cd yobante-boutique && npm start  # http://localhost:5000

   # Terminal 2: colis backend
   cd yobante-colis && npm start     # http://localhost:5001
   ```

2. Navigate to `http://localhost:5173/login`

3. Enter credentials that exist in BOTH databases:
   - Email: `admin@yobante.com`
   - Password: (as configured in your backends)

4. Expected flow:
   - ✅ Both backends return 201 (success)
   - ✅ Tokens stored separately (token_shop, token_shipment)
   - ✅ Redirects to `/select-app` modal
   - ✅ Shows 2 cards: "Yobante Boutique" and "Yobante Colis"
   - Click either card → redirects to `/shop/dashboard` or `/shipment/dashboard`

### Single Backend Available (Boutique Only)
1. Start only boutique backend:
   ```bash
   cd yobante-boutique && npm start
   ```

2. Login with credentials
3. Expected flow:
   - ✅ Shop: 201 (success)
   - ✅ Shipment: 401/error
   - ✅ Auto-redirects to `/shop/dashboard` WITHOUT showing modal
   - No need to select app

### Single Backend Available (Colis Only)
Same as above but:
- Start only colis backend
- Auto-redirects to `/shipment/dashboard`

## Architecture Overview

### Login Flow (Promise.allSettled)
```
User submits credentials
    ↓
Promise.allSettled([
  shopClient.post('/auth/login'),
  shipmentClient.post('/auth/login')
])
    ↓
Result handling:
├─ Both 201 → Show modal (/select-app)
├─ Only shop 201 → Redirect /shop/dashboard
├─ Only shipment 201 → Redirect /shipment/dashboard
└─ None 201 → Show error
```

### Token Management
- **Shop token**: Stored in `localStorage.token_shop`
- **Shipment token**: Stored in `localStorage.token_shipment`
- Each client has separate Axios instance with token interceptors
- On 401 refresh error: Auto-logout and redirect to `/login`

### State Management
- **Zustand store**: `src/auth/store/auth.store.ts`
  - `user`: Current user data
  - `isAuthenticated`: Login status
  - `selectedApp`: 'shop' | 'shipment' | null
  - `isShopAvailable`: Shop backend reachable
  - `isShipmentAvailable`: Colis backend reachable

### Route Protection
- **PrivateRoute**: Checks `isAuthenticated`
  - All private routes require login
  - Redirect to `/login` if not authenticated

- **AppSelectGuard**: Checks `selectedApp === requiredApp`
  - `/shop/*` requires `selectedApp === 'shop'`
  - `/shipment/*` requires `selectedApp === 'shipment'`
  - Redirect to `/select-app` if mismatch

## File Structure

```
src/
├── auth/                          # Authentication logic
│   ├── services/auth.service.ts   # Login with Promise.allSettled
│   ├── store/auth.store.ts        # Zustand global state
│   ├── hooks/useLogin.ts          # TanStack Query mutation
│   ├── hooks/useAuth.ts           # Store consumer hook
│   └── components/
│       ├── LoginForm.tsx          # Login form with validation
│       └── AppSelector.tsx        # App selection modal
├── infrastructure/
│   ├── http/
│   │   ├── shop.client.ts         # Axios instance for boutique API
│   │   └── shipment.client.ts     # Axios instance for colis API
│   └── auth/
│       └── tokenManager.ts        # localStorage token management
├── config/
│   ├── env.ts                     # Environment variables (validated)
│   └── queryClient.ts             # TanStack Query configuration
├── app/
│   └── routes/
│       ├── index.tsx              # Route configuration
│       ├── PrivateRoute.tsx       # Auth guard
│       └── AppSelectGuard.tsx     # App selection guard
├── pages/
│   ├── auth/LoginPage.tsx         # Beautiful login page
│   └── select-app/SelectAppPage.tsx # App selection page
└── main.tsx                        # React entry point
```

## Key Features Implemented

✅ **Beautiful Login Page**
- Gradient background with animated blobs
- Email & password fields with validation
- Show/hide password toggle
- Loading state with spinner
- Error message display

✅ **App Selector Modal**
- Shows available apps (Boutique & Colis)
- Only clickable if backend available
- Auto-selects if only one available
- Logout button

✅ **Dual API Authentication**
- Parallel login to both backends
- Independent token storage
- Smart redirect based on availability
- Separate Axios interceptors per API

✅ **Error Handling**
- 401 token refresh with auto-retry
- Network error handling
- Auto-logout on refresh failure
- User-friendly error messages

## Testing Credentials

You'll need to create test accounts in your backends. Example:
```
Email: admin@yobante.com
Password: securePassword123
Role: admin (in both databases)
```

## Troubleshooting

### "Cannot read property of undefined" errors
- Ensure both `.env.local` URLs are correct
- Check backend URLs are reachable: `curl http://localhost:5000/api/health`

### Login always fails
- Check credentials exist in both/either backend database
- Verify backends are running on correct ports
- Check CORS configuration in backend

### Token not persisting
- Clear localStorage and retry: `localStorage.clear()`
- Verify `tokenManager.setShopToken()` is being called
- Check browser DevTools > Application > Local Storage

### Can't select app after login
- Verify `/select-app` route is accessible
- Check `isShopAvailable` and `isShipmentAvailable` in store
- Check if one backend returned error during login

## Build for Production

```bash
npm run build        # Build optimized bundle
npm run preview      # Preview production build locally
```

## Déploiement Production (VPS Contabo)

L'app est servie à la racine de **`https://admin.yobanterek.com`** par nginx, sur un VPS Contabo.
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
nginx sert admin.yobanterek.com (fallback SPA → /index.html)
```

### Secrets GitHub à configurer

Dans le repo **`jeune-dev/yobante-boutique-admin-prod`** → *Settings → Secrets and variables → Actions*, créer ces secrets :

| Secret | Valeur attendue |
|---|---|
| `VPS_HOST` | IP ou hostname du VPS Contabo (ex: `185.xxx.xxx.xxx`) |
| `VPS_USER` | Utilisateur SSH (ex: `root`) |
| `VPS_SSH_KEY` | Clé SSH privée complète (au format `-----BEGIN OPENSSH PRIVATE KEY-----…`) |
| `VITE_SHOP_API_URL` | `https://api.yobanterek.com/api/v1` |
| `VITE_SHIPMENT_API_URL` | `https://api.yobanterek.com/api/v1` |
| `VITE_APP_NAME` | `Yobante Admin` |
| `VITE_APP_VERSION` | `1.0.0` |

> Les 4 variables `VITE_*` sont injectées dans le build (pas secrètes en soi) mais passent par des secrets
> pour changer d'URL sans toucher au code.

### Préparation du VPS (une seule fois)

```bash
# 1. Dossier cible du déploiement
mkdir -p /var/www/yobante-admin

# 2. Copier deploy/nginx-admin.yobanterek.com.conf depuis ce repo
#    (ou utiliser scp depuis la machine locale)
sudo cp nginx-admin.yobanterek.com.conf /etc/nginx/sites-available/yobante-admin
sudo ln -s /etc/nginx/sites-available/yobante-admin /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 3. HTTPS (Let's Encrypt)
sudo certbot --nginx -d admin.yobanterek.com

# 4. DNS : pointez un enregistrement A (admin) vers l'IP du VPS
```

> Le workflow SCP écrit les fichiers en root. Après chaque déploiement, nginx lit
> `/var/www/yobante-admin` directement — pas de redémarrage nécessaire.

### Vérification

Chaque push sur `main` déclenche le workflow qui termine par :
```bash
curl -f -I https://admin.yobanterek.com   # doit répondre 200
```
Suivez l'exécution dans *Actions* du repo GitHub.

## Development Commands

```bash
npm run dev         # Start dev server
npm run build       # Build for production
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
npm run type-check  # Check TypeScript types
```

## Next Steps for Developer

1. **Implement Dashboard Pages**
   - `/shop/dashboard` and `/shipment/dashboard`
   - Use the placeholder components as template

2. **Implement Domain Features**
   - Shop: Products, Categories, Orders, Payments, Reviews, Users
   - Shipment: Colis, Expeditions, Douane, Tarifs, etc.
   - See `domains/shop/` and `domains/shipment/` for structure

3. **API Integration**
   - Each feature has API files in `domains/shop/api/` and `domains/shipment/api/`
   - Use existing hooks as templates (e.g., `useProducts()`)

4. **Add More Tests**
   - Unit tests for services
   - Component tests for forms
   - Integration tests for API flows

## Quick Reference

**Default Ports:**
- Frontend: `http://localhost:5173`
- Shop API: `https://api.yobanterek.com/api/v1`
- Shipment API: `https://api.yobanterek.com/api/v1`

**Store Paths:**
- Auth store: `useAuthStore()`
- Shop state: `useShopStore()` (to be implemented)
- Shipment state: `useShipmentStore()` (to be implemented)

**API Clients:**
- Shop: `shopClient` (import from `@/infrastructure/http/shop.client`)
- Shipment: `shipmentClient` (import from `@/infrastructure/http/shipment.client`)

## Support

For architecture questions, see: `C:\Users\vPro\Downloads\yobante_admin_guide.pdf`
