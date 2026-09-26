import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, Link, useLocation } from 'react-router-dom';
import AdminBackButton from './AdminBackButton';
import { etatRetour } from '@/shared/hooks/useRetour';

/** Affiche l'adresse courante pour vérifier où mène le retour. */
const Adresse = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="adresse">{`${pathname}${search}`}</output>;
};

const Liste = () => {
  const location = useLocation();
  return (
    <div>
      <h1>LISTE</h1>
      <Adresse />
      <Link to="/boutique/commandes/12" state={etatRetour(location)}>
        Voir la commande
      </Link>
    </div>
  );
};

const Detail = () => {
  const location = useLocation();
  return (
    <div>
      <h1>DETAIL</h1>
      <Adresse />
      <AdminBackButton parent="/boutique/commandes" />
      <Link to="/boutique/commandes/12/modifier" state={etatRetour(location)}>
        Modifier
      </Link>
    </div>
  );
};

const Edition = () => (
  <div>
    <h1>EDITION</h1>
    <Adresse />
    <AdminBackButton parent="/boutique/commandes/12" />
  </div>
);

const rendre = (entrees: (string | { pathname: string; state?: unknown })[]) => {
  const router = createMemoryRouter(
    [
      { path: '/boutique/dashboard', element: <h1>DASHBOARD</h1> },
      { path: '/boutique/commandes', element: <Liste /> },
      { path: '/boutique/commandes/:id', element: <Detail /> },
      { path: '/boutique/commandes/:id/modifier', element: <Edition /> },
    ],
    { initialEntries: entrees, initialIndex: entrees.length - 1 }
  );
  render(<RouterProvider router={router} />);
  return router;
};

const adresse = () => screen.getByTestId('adresse').textContent;

describe('AdminBackButton', () => {
  it('liste filtrée → détail → Retour : revient à la liste avec recherche, filtre et page', async () => {
    const router = rendre(['/boutique/commandes?q=Dakar&statut=en_attente&page=4']);
    await userEvent.click(screen.getByText('Voir la commande'));
    expect(screen.getByRole('heading', { name: 'DETAIL' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));

    expect(screen.getByRole('heading', { name: 'LISTE' })).toBeInTheDocument();
    expect(adresse()).toBe('/boutique/commandes?q=Dakar&statut=en_attente&page=4');
    // Retour natif : l'historique est dépilé, pas rallongé.
    expect(router.state.historyAction).toBe('POP');
  });

  it('URL ouverte directement (aucun historique) → page parente du module', async () => {
    rendre(['/boutique/commandes/12']);
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('heading', { name: 'LISTE' })).toBeInTheDocument();
    expect(adresse()).toBe('/boutique/commandes');
  });

  it('page précédente hors contexte (autre module, sans origine) → page parente, pas navigate(-1)', async () => {
    rendre(['/boutique/dashboard', '/boutique/commandes/12']);
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(adresse()).toBe('/boutique/commandes');
  });

  it('origine connue mais historique perdu → navigation vers l’origine', async () => {
    rendre([{ pathname: '/boutique/commandes/12', state: { retour: '/boutique/commandes?page=2' } }]);
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(adresse()).toBe('/boutique/commandes?page=2');
  });

  it('origine externe ou invalide ignorée → page parente', async () => {
    rendre([{ pathname: '/boutique/commandes/12', state: { retour: '//evil.example/phishing' } }]);
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(adresse()).toBe('/boutique/commandes');
  });

  it('liste → détail → modification → Retour → détail → Retour → liste', async () => {
    rendre(['/boutique/commandes?page=3']);
    await userEvent.click(screen.getByText('Voir la commande'));
    await userEvent.click(screen.getByText('Modifier'));
    expect(screen.getByRole('heading', { name: 'EDITION' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('heading', { name: 'DETAIL' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(adresse()).toBe('/boutique/commandes?page=3');
  });
});
