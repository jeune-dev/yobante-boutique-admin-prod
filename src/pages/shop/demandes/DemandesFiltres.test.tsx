import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/shared/utils/alert', () => ({
  showConfirm: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));
vi.mock('@/infrastructure/http/shop.client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));
vi.mock('@/shared/utils/exportExcel', async (original) => ({
  ...(await original<typeof import('@/shared/utils/exportExcel')>()),
  exporterExcel: vi.fn(async () => undefined),
}));

import shopClient from '@/infrastructure/http/shop.client';
import { exporterExcel } from '@/shared/utils/exportExcel';
import { showWarning } from '@/shared/utils/alert';
import DemandesPage from './DemandesPage';

const shopGet = shopClient.get as unknown as ReturnType<typeof vi.fn>;
const exporter = exporterExcel as unknown as ReturnType<typeof vi.fn>;

const demande = (id: string, prix: number, vendeurId: string, page: number) => ({
  id,
  nom: `Produit ${id}`,
  prix,
  stock: 0,
  vendeurId,
  createdAt: '2026-10-01T10:00:00Z',
  statutValidation: 'en_attente',
  vendeur: { id: vendeurId, prenom: 'V', nom: vendeurId, profilVendeur: { nomBoutique: `Boutique ${vendeurId}` } },
  _page: page,
});

const rendre = (entree = '/boutique/demandes') => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[entree]}>
        <DemandesPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Demandes de publication : filtres et export Excel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    shopGet.mockImplementation((url: string, config?: any) => {
      if (url === '/admin/vendeurs') {
        return Promise.resolve({ vendeurs: [{ id: 'v1', nomBoutique: 'Boutique v1' }, { id: 'v2', nomBoutique: 'Boutique v2' }] });
      }
      if (url === '/admin/produits') {
        const page = config?.params?.page ?? 1;
        // Deux pages côté serveur : le filtre local doit voir les deux.
        const lignes =
          page === 1
            ? [demande('a', 1000, 'v1', 1), demande('b', 9000, 'v2', 1)]
            : [demande('c', 5000, 'v1', 2)];
        return Promise.resolve({ produits: lignes, pagination: { totalPages: 2, total: 3 } });
      }
      return Promise.resolve({});
    });
  });

  it('sans filtre avancé : pagination serveur', async () => {
    rendre();
    expect(await screen.findByText('Produit a')).toBeInTheDocument();
    expect(shopGet).toHaveBeenCalledWith('/admin/produits', {
      params: { statutValidation: 'en_attente', search: '', page: 1, limit: 20 },
    });
    expect(screen.queryByText('Produit c')).not.toBeInTheDocument();
  });

  it('filtre vendeur + prix : appliqué sur toutes les pages', async () => {
    rendre('/boutique/demandes?vendeur=v1&prixMin=2000');
    expect(await screen.findByText('Produit c')).toBeInTheDocument();
    expect(screen.queryByText('Produit a')).not.toBeInTheDocument();
    expect(screen.queryByText('Produit b')).not.toBeInTheDocument();
  });

  it('export : toutes les lignes filtrées, avec les filtres dans le résumé', async () => {
    rendre('/boutique/demandes?vendeur=v1');
    await screen.findByText('Produit c');
    await userEvent.click(screen.getByRole('button', { name: 'Exporter Excel' }));
    await waitFor(() => expect(exporter).toHaveBeenCalledTimes(1));
    const options = exporter.mock.calls[0][0];
    expect(options.lignes.map((l: any) => l.id)).toEqual(['a', 'c']);
    expect(options.nomFichier).toBe('demandes-publication_en_attente');
    expect(options.filtres.Statut).toBe('En attente');
  });

  it('aucun résultat : pas de fichier vide', async () => {
    rendre('/boutique/demandes?prixMin=100000');
    expect(await screen.findByText('Aucune demande ne correspond aux filtres.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Exporter Excel' }));
    await waitFor(() => expect(showWarning).toHaveBeenCalled());
    expect(exporter).not.toHaveBeenCalled();
  });
});
