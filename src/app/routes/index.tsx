import { lazy, Suspense, type ReactElement } from 'react';
import { createBrowserRouter, Navigate, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { AttentePage } from '@/shared/components/feedback/AttentePage';
import { PrivateRoute } from './PrivateRoute';
import ShopLayout from '@/layouts/ShopLayout';
import { LoginPage } from '@/pages/auth/LoginPage';

// ── Pages chargées à la demande ────────────────────────────────────────
// Un seul chunk de 911 kB (239 kB gzip) embarquait les ~40 pages du
// dashboard : ouvrir la page de connexion téléchargeait l'analytique, la
// finance et la gestion de stock. Chaque page devient un module séparé,
// chargé à la première visite puis mis en cache par le navigateur.
// Exportées pour que la table des routes reste vérifiable en test.
export const ShopDashboard = lazy(() => import('@/pages/shop/dashboard/DashboardPage'));
export const AccueilPage = lazy(() => import('@/pages/shop/accueil/AccueilPage'));
export const SousSectionPage = lazy(() => import('@/pages/shop/accueil/SousSectionPage'));
export const ProfilPage = lazy(() => import('@/pages/shop/profil/ProfilPage'));
export const RayonsPage = lazy(() => import('@/pages/shop/rayons/RayonsPage'));
export const SousRayonProduitsPage = lazy(() => import('@/pages/shop/rayons/SousRayonProduitsPage'));
export const ProductsPage = lazy(() => import('@/pages/shop/products/ProductsPage'));
export const ProductCreatePage = lazy(() => import('@/pages/shop/products/ProductCreatePage'));
export const ProductEditPage = lazy(() => import('@/pages/shop/products/ProductEditPage'));
export const ProductDetailPage = lazy(() => import('@/pages/shop/products/ProductDetailPage'));
export const OrdersPage = lazy(() => import('@/pages/shop/orders/OrdersPage'));
export const OrderCreatePage = lazy(() => import('@/pages/shop/orders/OrderCreatePage'));
export const OrderDetailPage = lazy(() => import('@/pages/shop/orders/OrderDetailPage'));
export const UsersPage = lazy(() => import('@/pages/shop/users/UsersPage'));
export const UserDetailPage = lazy(() => import('@/pages/shop/users/UserDetailPage'));
export const VendeursPage = lazy(() => import('@/pages/shop/vendeurs/VendeursPage'));
export const VendeurDetailPage = lazy(() => import('@/pages/shop/vendeurs/VendeurDetailPage'));
export const AdministrateursPage = lazy(() => import('@/pages/shop/administrateurs/AdministrateursPage'));
export const DemandesPage = lazy(() => import('@/pages/shop/demandes/DemandesPage'));
export const RetoursPage = lazy(() => import('@/pages/shop/retours/RetoursPage'));
export const PaymentsPage = lazy(() => import('@/pages/shop/payments/PaymentsPage'));
export const SettingsPage = lazy(() => import('@/pages/shop/settings/SettingsPage'));
export const AlertesPage = lazy(() => import('@/pages/shop/alertes/AlertesPage'));
export const StockPage = lazy(() => import('@/pages/shop/stock/StockPage'));
export const LivraisonPage = lazy(() => import('@/pages/shop/logistique/LivraisonPage'));
export const ReclamationsPage = lazy(() => import('@/pages/shop/reclamations/ReclamationsPage'));
export const SyntheseFinancePage = lazy(() => import('@/pages/shop/finance/SynthesePage'));
export const ComptesVendeursPage = lazy(() => import('@/pages/shop/finance/ComptesVendeursPage'));
export const ReversementsPage = lazy(() => import('@/pages/shop/finance/ReversementsPage'));
export const AnalyticsVentesPage = lazy(() => import('@/pages/shop/analytics/VentesPage'));
export const AnalyticsProduitsPage = lazy(() => import('@/pages/shop/analytics/ProduitsPage'));
export const AnalyticsClientsPage = lazy(() => import('@/pages/shop/analytics/ClientsPage'));
export const AnalyticsVendeursPage = lazy(() => import('@/pages/shop/analytics/VendeursPage'));
export const RentabilitePage = lazy(() => import('@/pages/shop/analytics/RentabilitePage'));
export const SuppressionComptePage = lazy(() => import('@/pages/public/SuppressionComptePage'));
export const PolitiqueConfidentialitePage = lazy(() => import('@/pages/public/PolitiqueConfidentialitePage'));
export const ChangerMotDePassePage = lazy(() =>
  import('@/pages/auth/ChangerMotDePassePage').then((m) => ({ default: m.ChangerMotDePassePage }))
);

/**
 * Enveloppe les pages chargées à la demande qui ne vivent PAS dans un layout
 * (celui-ci fournit déjà sa propre frontière Suspense). Sans elle, React
 * lèverait « A component suspended while responding to synchronous input ».
 */
const attendre = (element: ReactElement) => (
  <Suspense fallback={<AttentePage />}>{element}</Suspense>
);

/**
 * Écran d'erreur du routeur : page inconnue (404) OU composant qui plante.
 * Avant, toute exception de rendu s'affichait comme « 404 Page non trouvée »,
 * ce qui masquait le vrai problème ; le détail technique n'est jamais montré.
 */
const ErreurRoute = () => {
  const erreur = useRouteError();
  const introuvable = isRouteErrorResponse(erreur) && erreur.status === 404;
  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{introuvable ? '404' : 'Oups'}</h1>
        <p className="text-gray-600 mb-4">
          {introuvable
            ? 'Page non trouvée'
            : "Une erreur inattendue s'est produite. Rechargez la page ; si le problème persiste, contactez le support."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {!introuvable && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 text-white hover:bg-gray-800"
            >
              Recharger
            </button>
          )}
          <a href="/" className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
};

export const router = createBrowserRouter(
  [
    {
      path: '/',
      errorElement: <ErreurRoute />,
      children: [
        { index: true, element: <Navigate to="/login" replace /> },
        { path: 'login', element: <LoginPage /> },
        // Hors de PrivateRoute : celle-ci y renvoie tant que le mot de passe
        // temporaire n'a pas été remplacé. La page vérifie elle-même la session.
        { path: 'changer-mot-de-passe', element: attendre(<ChangerMotDePassePage />) },
        { path: 'suppression-compte', element: attendre(<SuppressionComptePage />) },
        { path: 'politique-confidentialite', element: attendre(<PolitiqueConfidentialitePage />) },
        {
          element: <PrivateRoute />,
          children: [
            {
              path: 'boutique',
              element: <ShopLayout />,
              children: [
                { index: true, element: <Navigate to="dashboard" replace /> },
                { path: 'dashboard', element: <ShopDashboard /> },
              { path: 'accueil', element: <AccueilPage /> },
              { path: 'accueil/sous-section/:id', element: <SousSectionPage /> },
              { path: 'profil', element: <ProfilPage /> },
                { path: 'rayons', element: <RayonsPage /> },
                { path: 'rayons/sous-rayon/:id', element: <SousRayonProduitsPage /> },
                { path: 'produits', element: <ProductsPage /> },
                { path: 'produits/nouveau', element: <ProductCreatePage /> },
                { path: 'produits/:id/modifier', element: <ProductEditPage /> },
                // Après `/modifier` : une route statique ne doit pas être
                // avalée par le paramètre. Couverte par la clé d'accès
                // « produits », qui porte déjà le préfixe /boutique/produits.
                { path: 'produits/:id', element: <ProductDetailPage /> },
                { path: 'commandes', element: <OrdersPage /> },
                { path: 'commandes/nouveau', element: <OrderCreatePage /> },
                { path: 'commandes/:id', element: <OrderDetailPage /> },
                { path: 'clients', element: <UsersPage /> },
                { path: 'clients/:id', element: <UserDetailPage /> },
                { path: 'vendeurs', element: <VendeursPage /> },
                // Fiche d'un vendeur. Même page d'accès (`vendeurs`) que la
                // liste : `cleDuChemin` retient le préfixe le plus long, donc
                // les droits par rôle déjà en place s'appliquent tels quels.
                { path: 'vendeurs/:id', element: <VendeurDetailPage /> },
                { path: 'administrateurs', element: <AdministrateursPage /> },
                { path: 'demandes', element: <DemandesPage /> },
                { path: 'retours', element: <RetoursPage /> },
                { path: 'paiements', element: <PaymentsPage /> },
                { path: 'parametres', element: <SettingsPage /> },

                // ── Surveillance, stock, logistique, réclamations ────────
                { path: 'alertes', element: <AlertesPage /> },
                // La vue (ruptures, surstock…) passe par `?vue=`, pas par le
                // chemin : un onglet n'est pas une page différente, et le lien
                // reste partageable.
                { path: 'stock', element: <StockPage /> },
                { path: 'livraison', element: <LivraisonPage /> },
                { path: 'reclamations', element: <ReclamationsPage /> },

                // ── Finance ─────────────────────────────────────────────
                { path: 'finance', element: <SyntheseFinancePage /> },
                { path: 'finance/commissions', element: <ComptesVendeursPage /> },
                { path: 'finance/reversements', element: <ReversementsPage /> },

                // ── Analytics ───────────────────────────────────────────
                { path: 'analytics', element: <Navigate to="ventes" replace /> },
                { path: 'analytics/ventes', element: <AnalyticsVentesPage /> },
                { path: 'analytics/produits', element: <AnalyticsProduitsPage /> },
                { path: 'analytics/clients', element: <AnalyticsClientsPage /> },
                { path: 'analytics/vendeurs', element: <AnalyticsVendeursPage /> },
                { path: 'analytics/rentabilite', element: <RentabilitePage /> },
              ],
            },
          ],
        },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  }
);
