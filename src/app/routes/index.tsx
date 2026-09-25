import { createBrowserRouter, Navigate, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import ShopLayout from '@/layouts/ShopLayout';
import ShipmentLayout from '@/layouts/ShipmentLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import SuppressionComptePage from '@/pages/public/SuppressionComptePage';
import PolitiqueConfidentialitePage from '@/pages/public/PolitiqueConfidentialitePage';
import ShopDashboard from '@/pages/shop/dashboard/DashboardPage';
import AccueilPage from '@/pages/shop/accueil/AccueilPage';
import SousSectionPage from '@/pages/shop/accueil/SousSectionPage';
import ProfilPage from '@/pages/shop/profil/ProfilPage';
import RayonsPage from '@/pages/shop/rayons/RayonsPage';
import SousRayonProduitsPage from '@/pages/shop/rayons/SousRayonProduitsPage';
import ProductsPage from '@/pages/shop/products/ProductsPage';
import ProductCreatePage from '@/pages/shop/products/ProductCreatePage';
import ProductEditPage from '@/pages/shop/products/ProductEditPage';
import OrdersPage from '@/pages/shop/orders/OrdersPage';
import OrderDetailPage from '@/pages/shop/orders/OrderDetailPage';
import UsersPage from '@/pages/shop/users/UsersPage';
import UserDetailPage from '@/pages/shop/users/UserDetailPage';
import VendeursPage from '@/pages/shop/vendeurs/VendeursPage';
import AdministrateursPage from '@/pages/shop/administrateurs/AdministrateursPage';
import { ChangerMotDePassePage } from '@/pages/auth/ChangerMotDePassePage';
import DemandesPage from '@/pages/shop/demandes/DemandesPage';
import ReviewsPage from '@/pages/shop/reviews/ReviewsPage';
import PaymentsPage from '@/pages/shop/payments/PaymentsPage';
import SettingsPage from '@/pages/shop/settings/SettingsPage';
import { ShipmentDashboard } from '@/pages/shipment/dashboard/DashboardPage';

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
        { path: 'changer-mot-de-passe', element: <ChangerMotDePassePage /> },
        { path: 'suppression-compte', element: <SuppressionComptePage /> },
        { path: 'politique-confidentialite', element: <PolitiqueConfidentialitePage /> },
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
                { path: 'commandes', element: <OrdersPage /> },
                { path: 'commandes/:id', element: <OrderDetailPage /> },
                { path: 'clients', element: <UsersPage /> },
                { path: 'clients/:id', element: <UserDetailPage /> },
                { path: 'vendeurs', element: <VendeursPage /> },
                { path: 'administrateurs', element: <AdministrateursPage /> },
                { path: 'demandes', element: <DemandesPage /> },
                { path: 'avis', element: <ReviewsPage /> },
                { path: 'paiements', element: <PaymentsPage /> },
                { path: 'parametres', element: <SettingsPage /> },
              ],
            },
            {
              path: 'colis',
              element: <ShipmentLayout />,
              children: [
                { index: true, element: <Navigate to="dashboard" replace /> },
                { path: 'dashboard', element: <ShipmentDashboard /> },
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
