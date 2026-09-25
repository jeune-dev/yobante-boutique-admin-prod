import { describe, it, expect } from 'vitest';
import { erreurMotDePasse } from './motDePasse';

describe('erreurMotDePasse', () => {
  it('accepte un mot de passe conforme et confirmé', () => {
    expect(erreurMotDePasse('Nouveau2026', 'Nouveau2026', 'Tmp9xYzAbCdE')).toBeNull();
  });

  it('refuse moins de 8 caractères', () => {
    expect(erreurMotDePasse('Ab1', 'Ab1', 'x')).toMatch(/8 caractères/);
  });

  it('exige une majuscule et un chiffre', () => {
    expect(erreurMotDePasse('toutminuscule1', 'toutminuscule1', 'x')).toMatch(/majuscule/);
    expect(erreurMotDePasse('SansChiffre', 'SansChiffre', 'x')).toMatch(/chiffre/);
  });

  it('refuse de réutiliser le mot de passe temporaire', () => {
    expect(erreurMotDePasse('Tmp9xYzAbCdE', 'Tmp9xYzAbCdE', 'Tmp9xYzAbCdE')).toMatch(/différent/);
  });

  it('refuse une confirmation différente', () => {
    expect(erreurMotDePasse('Nouveau2026', 'Nouveau2027', 'x')).toMatch(/confirmation/);
  });
});
