import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider, Link, useLocation, useNavigate } from 'react-router-dom';

vi.mock('@/shared/utils/alert', () => ({ showConfirm: vi.fn(), showError: vi.fn(), showSuccess: vi.fn() }));

import { showConfirm } from '@/shared/utils/alert';
import { useAuthStore } from '@/auth/store/auth.store';
import AdminBackButton from '@/shared/components/AdminBackButton';
import { etatRetour, useRetour } from './useRetour';
import { useConfirmationSortie } from './useConfirmationSortie';

const confirmer = showConfirm as unknown as ReturnType<typeof vi.fn>;

const Liste = () => {
  const location = useLocation();
  return (
    <div>
      <h1>LISTE</h1>
      <Link to="/boutique/produits/nouveau" state={etatRetour(location)}>
        Nouveau
      </Link>
    </div>
  );
};

/** Formulaire minimal câblé comme les pages de création/modification. */
const Formulaire = () => {
  const [nom, setNom] = useState('');
  const retour = useRetour('/boutique/produits');
  const navigate = useNavigate();
  const { autoriserSortie } = useConfirmationSortie(nom !== '');
  return (
    <div>
      <h1>FORMULAIRE</h1>
      <AdminBackButton parent="/boutique/produits" />
      <input aria-label="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
      <button type="button" onClick={retour}>
        Annuler
      </button>
      <button
        type="button"
        onClick={() => {
          autoriserSortie();
          navigate('/boutique/produits');
        }}
      >
        Enregistrer
      </button>
      <Link to="/boutique/dashboard">Menu Dashboard</Link>
    </div>
  );
};

const rendre = () => {
  const router = createMemoryRouter(
    [
      { path: '/boutique/dashboard', element: <h1>DASHBOARD</h1> },
      { path: '/boutique/produits', element: <Liste /> },
      { path: '/boutique/produits/nouveau', element: <Formulaire /> },
    ],
    { initialEntries: ['/boutique/produits'] }
  );
  render(<RouterProvider router={router} />);
  return router;
};

const ouvrirFormulaire = async () => {
  await userEvent.click(screen.getByText('Nouveau'));
  expect(screen.getByRole('heading', { name: 'FORMULAIRE' })).toBeInTheDocument();
};

describe('useConfirmationSortie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
  });

  it('formulaire intact : Retour quitte sans confirmation', async () => {
    rendre();
    await ouvrirFormulaire();
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));
    expect(screen.getByRole('heading', { name: 'LISTE' })).toBeInTheDocument();
    expect(confirmer).not.toHaveBeenCalled();
  });

  it('formulaire modifié + Retour → confirmation ; « Continuer l’édition » garde la saisie', async () => {
    confirmer.mockResolvedValue(false);
    rendre();
    await ouvrirFormulaire();
    await userEvent.type(screen.getByLabelText('Nom'), 'Riz');
    await userEvent.click(screen.getByRole('button', { name: 'Retour' }));

    await waitFor(() => expect(confirmer).toHaveBeenCalledTimes(1));
    expect(confirmer.mock.calls[0][0]).toMatchObject({
      confirmText: 'Quitter sans enregistrer',
      cancelText: "Continuer l'édition",
    });
    expect(screen.getByRole('heading', { name: 'FORMULAIRE' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nom')).toHaveValue('Riz');
  });

  it('formulaire modifié + Annuler → « Quitter sans enregistrer » ramène à la liste', async () => {
    confirmer.mockResolvedValue(true);
    rendre();
    await ouvrirFormulaire();
    await userEvent.type(screen.getByLabelText('Nom'), 'Riz');
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(await screen.findByRole('heading', { name: 'LISTE' })).toBeInTheDocument();
    expect(confirmer).toHaveBeenCalledTimes(1);
  });

  it('formulaire modifié : le menu et le bouton Précédent du navigateur sont aussi interceptés', async () => {
    confirmer.mockResolvedValue(false);
    const router = rendre();
    await ouvrirFormulaire();
    await userEvent.type(screen.getByLabelText('Nom'), 'Riz');

    await userEvent.click(screen.getByText('Menu Dashboard'));
    await waitFor(() => expect(confirmer).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('heading', { name: 'FORMULAIRE' })).toBeInTheDocument();

    await act(() => router.navigate(-1));
    await waitFor(() => expect(confirmer).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('heading', { name: 'FORMULAIRE' })).toBeInTheDocument();
  });

  it('enregistrement réussi : la redirection n’est pas bloquée', async () => {
    rendre();
    await ouvrirFormulaire();
    await userEvent.type(screen.getByLabelText('Nom'), 'Riz');
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByRole('heading', { name: 'LISTE' })).toBeInTheDocument();
    expect(confirmer).not.toHaveBeenCalled();
  });

  it('session fermée (déconnexion / expiration) : la sortie n’est jamais retenue', async () => {
    const router = rendre();
    await ouvrirFormulaire();
    await userEvent.type(screen.getByLabelText('Nom'), 'Riz');
    useAuthStore.setState({ isAuthenticated: false });
    await act(() => router.navigate('/boutique/dashboard'));
    expect(screen.getByRole('heading', { name: 'DASHBOARD' })).toBeInTheDocument();
    expect(confirmer).not.toHaveBeenCalled();
  });

  it('formulaire modifié : fermeture / rechargement de l’onglet déclenche l’alerte native', async () => {
    rendre();
    await ouvrirFormulaire();
    const vierge = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(vierge);
    expect(vierge.defaultPrevented).toBe(false);

    await userEvent.type(screen.getByLabelText('Nom'), 'Riz');
    const modifie = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(modifie);
    expect(modifie.defaultPrevented).toBe(true);
  });
});
