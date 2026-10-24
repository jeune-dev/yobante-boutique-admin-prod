import { Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/auth/store/auth.store';
import { peutOuvrir, premierCheminAutorise } from '@/shared/accesAdmin';
import ShopHeader from './components/Header';
import ShopSidebar from './components/Sidebar';
import { AttentePage } from '@/shared/components/feedback/AttentePage';

const CLE_REPLI = 'yobante.sidebar.replie';

export default function ShopLayout() {
  const location = useLocation();
  const permissions = useAuthStore((s) => s.user?.permissions);

  // L'état de la colonne est conservé d'une visite à l'autre : la rouvrir à
  // chaque navigation serait pénible pour qui l'a volontairement repliée.
  const [replie, setReplie] = useState(() => localStorage.getItem(CLE_REPLI) === 'true');
  // Sous `md`, la colonne devient un tiroir ouvert depuis l'entête.
  const [tiroirOuvert, setTiroirOuvert] = useState(false);

  useEffect(() => {
    localStorage.setItem(CLE_REPLI, String(replie));
  }, [replie]);

  // Le tiroir se referme à chaque navigation, sinon il recouvrirait l'écran
  // d'arrivée.
  useEffect(() => setTiroirOuvert(false), [location.pathname]);

  useEffect(() => {
    if (!tiroirOuvert) return;
    const auClavier = (e: KeyboardEvent) => e.key === 'Escape' && setTiroirOuvert(false);
    document.addEventListener('keydown', auClavier);
    // Le fond ne défile pas sous le tiroir : sans ce verrou, faire glisser le
    // doigt dans le tiroir entraîne la page derrière lui.
    const overflowInitial = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', auClavier);
      document.body.style.overflow = overflowInitial;
    };
  }, [tiroirOuvert]);

  // Page non attribuée à cet administrateur (lien direct, favori, ancien
  // onglet) : renvoi vers sa première page autorisée. Le backend refuse de
  // toute façon les données correspondantes.
  if (!peutOuvrir(permissions, location.pathname)) {
    return <Navigate to={premierCheminAutorise(permissions)} replace />;
  }

  return (
    // `h-screen` + `overflow-hidden` : seul le contenu défile, la colonne de
    // navigation et l'entête restent en place.
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <ShopSidebar
        replie={replie}
        onBasculer={() => setReplie((v) => !v)}
        tiroirOuvert={tiroirOuvert}
        onFermerTiroir={() => setTiroirOuvert(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <ShopHeader onOuvrirMenu={() => setTiroirOuvert(true)} tiroirOuvert={tiroirOuvert} />
        {/* `overflow-x-hidden` : sur mobile, la page ne doit jamais glisser
            latéralement, même si un contenu inattendu dépasse. */}
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          {/* Les pages sont chargées à la demande (voir app/routes) : l'entête
              reste affichée pendant le chargement du module, au lieu d'un
              écran vide. */}
          <Suspense fallback={<AttentePage />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
