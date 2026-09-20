import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sweetalert2', () => ({ default: { fire: vi.fn(async () => ({ isConfirmed: true })) } }));

import Swal from 'sweetalert2';
import { showError, showSuccess, showConfirm } from './alert';

const fire = Swal.fire as unknown as ReturnType<typeof vi.fn>;
const XSS = 'Produit <img src=x onerror="alert(1)"> supprimé';

describe('alert — les messages sont affichés comme du texte, jamais comme du HTML', () => {
  beforeEach(() => fire.mockClear());

  it('showError : message du backend en titleText, pas en title/html', () => {
    showError({ status: 400, message: XSS });
    const opts = fire.mock.calls[0][0];
    expect(opts.titleText).toBe(XSS);
    expect(opts.title).toBeUndefined();
    expect(opts.html).toBeUndefined();
  });

  it('showSuccess : lit _message attaché par le client HTTP', () => {
    const donnees: Record<string, unknown> = { id: 1 };
    Object.defineProperty(donnees, '_message', { value: XSS, enumerable: false });
    showSuccess(donnees);
    const opts = fire.mock.calls[0][0];
    expect(opts.titleText).toBe(XSS);
    expect(opts.title).toBeUndefined();
  });

  it('showSuccess : texte par défaut si aucun message', () => {
    showSuccess(undefined, 'Enregistré');
    expect(fire.mock.calls[0][0].titleText).toBe('Enregistré');
  });

  it('showConfirm : le message (qui reprend des saisies) passe par text, résout true/false', async () => {
    const ok = await showConfirm({ message: XSS, titre: 'Supprimer' });
    const opts = fire.mock.calls[0][0];
    expect(opts.text).toBe(XSS);
    expect(opts.html).toBeUndefined();
    expect(ok).toBe(true);
  });
});
