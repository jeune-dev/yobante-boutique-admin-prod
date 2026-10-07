import { Outlet } from 'react-router-dom';
import ShopHeader from './components/Header';

export default function ShopLayout() {
  return (
    // `h-screen` + `overflow-hidden` : seul le contenu défile, la barre du
    // haut reste en place.
    //
    // La navigation tient sur cette unique barre, avec le logo et le menu de
    // compte — ni colonne latérale, ni seconde ligne en dessous.
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <ShopHeader />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
