import { Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/auth/store/auth.store';
import { peutOuvrir, premierCheminAutorise } from '@/shared/accesAdmin';
import ShopHeader from './components/Header';
import { AttentePage } from '@/shared/components/feedback/AttentePage';

export default function ShopLayout() {
  const location = useLocation();
  const permissions = useAuthStore((s) => s.user?.permissions);

  // Page non attribuée à cet administrateur (lien direct, favori, ancien
  // onglet) : renvoi vers sa première page autorisée. Le backend refuse de
  // toute façon les données correspondantes.
  if (!peutOuvrir(permissions, location.pathname)) {
    return <Navigate to={premierCheminAutorise(permissions)} replace />;
  }

  return (
    // `h-screen` + `overflow-hidden` : seul le contenu défile, la barre du
    // haut reste en place.
    //
    // La navigation tient sur cette unique barre, avec le logo et le menu de
    // compte — ni colonne latérale, ni seconde ligne en dessous.
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <ShopHeader />
      {/* `overflow-x-hidden` : sur mobile, la page ne doit jamais glisser
          latéralement, même si un contenu inattendu dépasse. */}
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
        {/* Les pages sont chargées à la demande (voir app/routes) : la barre
            du haut reste affichée pendant le chargement du module, au lieu
            d'un écran vide. */}
        <Suspense fallback={<AttentePage />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
