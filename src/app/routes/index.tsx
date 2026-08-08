import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import ShopLayout from '@/layouts/ShopLayout';
import ShipmentLayout from '@/layouts/ShipmentLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
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
import DemandesPage from '@/pages/shop/demandes/DemandesPage';
import ReviewsPage from '@/pages/shop/reviews/ReviewsPage';
import PaymentsPage from '@/pages/shop/payments/PaymentsPage';
import SettingsPage from '@/pages/shop/settings/SettingsPage';
import { ShipmentDashboard } from '@/pages/shipment/dashboard/DashboardPage';

const NotFound = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-600 mb-4">Page non trouvée</p>
      <a href="/" className="text-blue-600 hover:text-blue-700">
        Retour à l'accueil
      </a>
    </div>
  </div>
);

export const router = createBrowserRouter(
  [
    {
      path: '/',
      errorElement: <NotFound />,
      children: [
        { index: true, element: <Navigate to="/login" replace /> },
        { path: 'login', element: <LoginPage /> },
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
