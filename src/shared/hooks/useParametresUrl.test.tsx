import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { lirePage, useParametresUrl } from './useParametresUrl';

let modifier: ReturnType<typeof useParametresUrl<{ q: string; page: string }>>[1];

const Page = () => {
  const [valeurs, maj] = useParametresUrl({ q: '', page: '1' });
  modifier = maj;
  const location = useLocation();
  return (
    <>
      <output data-testid="valeurs">{JSON.stringify(valeurs)}</output>
      <output data-testid="search">{location.search}</output>
      <output data-testid="state">{JSON.stringify(location.state)}</output>
    </>
  );
};

const rendre = (entree: string | { pathname: string; search?: string; state?: unknown }) => {
  const router = createMemoryRouter([{ path: '/liste', element: <Page /> }], { initialEntries: [entree] });
  render(<RouterProvider router={router} />);
  return router;
};

describe('useParametresUrl', () => {
  it('lit les valeurs de l’URL et applique les défauts', () => {
    rendre('/liste?q=Dakar');
    expect(JSON.parse(screen.getByTestId('valeurs').textContent!)).toEqual({ q: 'Dakar', page: '1' });
  });

  it('écrit dans l’URL, retire les valeurs par défaut et remplace l’entrée d’historique', () => {
    const router = rendre('/liste');
    act(() => modifier({ q: 'riz', page: '3' }));
    expect(screen.getByTestId('search').textContent).toBe('?q=riz&page=3');
    expect(router.state.historyAction).toBe('REPLACE');

    act(() => modifier({ q: '', page: '1' }));
    expect(screen.getByTestId('search').textContent).toBe('');
  });

  it('conserve l’origine du « Retour » lors d’un changement de filtre', () => {
    rendre({ pathname: '/liste', state: { retour: '/boutique/rayons' } });
    act(() => modifier({ q: 'riz' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toEqual({ retour: '/boutique/rayons' });
  });
});

describe('lirePage', () => {
  it.each([
    ['4', 4],
    ['1', 1],
    ['0', 1],
    ['-2', 1],
    ['abc', 1],
    ['', 1],
  ])('%s → %i', (valeur, attendu) => {
    expect(lirePage(valeur)).toBe(attendu);
  });
});
