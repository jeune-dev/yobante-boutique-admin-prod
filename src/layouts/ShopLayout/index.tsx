import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ShopSidebar from './components/Sidebar';
import ShopHeader from './components/Header';

const CLE_REPLI = 'yobante.sidebar.replie';

export default function ShopLayout() {
  // L'état du menu est conservé d'une visite à l'autre : le rouvrir à chaque
  // navigation serait pénible pour qui l'a volontairement replié.
  const [replie, setReplie] = useState(
    () => localStorage.getItem(CLE_REPLI) === 'true'
  );

  // Sur écran étroit (< lg), la barre latérale devient un tiroir ouvert par
  // le bouton du header ; il se referme à chaque navigation.
  const [tiroirOuvert, setTiroirOuvert] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    localStorage.setItem(CLE_REPLI, String(replie));
  }, [replie]);

  useEffect(() => {
    setTiroirOuvert(false);
  }, [pathname]);

  // Échap referme le tiroir ; le fond ne défile pas tant qu'il est ouvert.
  useEffect(() => {
    if (!tiroirOuvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTiroirOuvert(false);
    };
    document.addEventListener('keydown', surTouche);
    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = overflowInitial;
    };
  }, [tiroirOuvert]);

  return (
    // `h-screen` + `overflow-hidden` : seule la zone de droite défile, la
    // barre latérale et l'entête restent en place.
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <ShopSidebar
        replie={replie}
        onBasculer={() => setReplie((v) => !v)}
        tiroirOuvert={tiroirOuvert}
        onFermerTiroir={() => setTiroirOuvert(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <ShopHeader onOuvrirMenu={() => setTiroirOuvert(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
