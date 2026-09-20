import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from './Pagination';

describe('Pagination', () => {
  it('ne rend rien pour une seule page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('affiche une fenêtre de pages, pas la liste complète', () => {
    render(<Pagination page={20} totalPages={57} onChange={() => {}} />);
    const boutons = screen.getAllByRole('button').map((b) => b.textContent);
    // 1 … 18 19 20 21 22 … 57 (+ précédent / suivant)
    expect(boutons).toEqual(expect.arrayContaining(['1', '18', '19', '20', '21', '22', '57']));
    expect(boutons).not.toContain('30');
    expect(screen.getByText('Page 20 / 57')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '20' })).toHaveAttribute('aria-current', 'page');
  });

  it('précédent désactivé en page 1, suivant désactivé en dernière page', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Page précédente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Page suivante' })).not.toBeDisabled();
    rerender(<Pagination page={3} totalPages={3} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Page suivante' })).toBeDisabled();
  });

  it('remonte la page choisie', () => {
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: 'Page suivante' }));
    fireEvent.click(screen.getByRole('button', { name: 'Page précédente' }));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([4, 3, 1]);
  });
});
