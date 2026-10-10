import { describe, it, expect } from 'vitest';
import { lireOrigine, etatRetour } from './useRetour';

describe('etatRetour', () => {
  it('conserve le chemin et les filtres de la page d’origine', () => {
    expect(etatRetour({ pathname: '/boutique/produits', search: '?page=3&rayonId=7' })).toEqual({
      retour: '/boutique/produits?page=3&rayonId=7',
    });
  });
});

describe('lireOrigine', () => {
  it('accepte une adresse interne', () => {
    expect(lireOrigine({ retour: '/boutique/commandes?page=2' })).toBe(
      '/boutique/commandes?page=2'
    );
  });

  it.each([
    ['//exemple.test/phishing', 'URL protocol-relative'],
    ['/\\exemple.test/phishing', 'antislash normalisé en // par react-router 6'],
    ['https://exemple.test', 'URL absolue'],
    ['javascript:alert(1)', 'pseudo-protocole'],
    ['boutique/produits', 'chemin relatif sans /'],
  ])('refuse %s (%s)', (valeur) => {
    expect(lireOrigine({ retour: valeur })).toBeNull();
  });

  it.each([null, undefined, {}, { retour: 42 }, { retour: null }])(
    'état inexploitable %o → null',
    (state) => {
      expect(lireOrigine(state)).toBeNull();
    }
  );
});
