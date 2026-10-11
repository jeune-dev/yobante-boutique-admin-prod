import { describe, it, expect } from 'vitest';
import { peutOuvrir, premierCheminAutorise, cleDuChemin } from './accesAdmin';
import { navPourAcces } from '@/layouts/ShopLayout/navigation';

describe('accès administrateur (dashboard)', () => {
  it('accès complet : tout s’ouvre', () => {
    expect(peutOuvrir(null, '/boutique/finance/reversements')).toBe(true);
    expect(premierCheminAutorise(undefined)).toBe('/boutique/dashboard');
  });

  it('le préfixe le plus long l’emporte (commissions ≠ synthèse finance)', () => {
    expect(cleDuChemin('/boutique/finance/commissions')).toBe('commissions');
    expect(cleDuChemin('/boutique/finance')).toBe('finance');
    expect(cleDuChemin('/boutique/produits/12/modifier')).toBe('produits');
  });

  it('accès restreint : seules les pages cochées (et le profil)', () => {
    const p = ['commandes', 'commissions'];
    expect(peutOuvrir(p, '/boutique/commandes/abc')).toBe(true);
    expect(peutOuvrir(p, '/boutique/finance/commissions')).toBe(true);
    expect(peutOuvrir(p, '/boutique/finance')).toBe(false);
    expect(peutOuvrir(p, '/boutique/dashboard')).toBe(false);
    expect(peutOuvrir(p, '/boutique/profil')).toBe(true);
    expect(premierCheminAutorise(p)).toBe('/boutique/commandes');
  });

  it('la navigation masque les pages et les groupes vides', () => {
    const nav = navPourAcces(['produits', 'clients']);
    const libelles = nav.map((e) => e.label);
    expect(libelles).toEqual(['Commerce', 'Clients']);
    expect(nav[0].enfants?.map((e) => e.label)).toEqual(['Produits']);
    expect(nav[1].enfants?.map((e) => e.label)).toEqual(['Clients']);
  });
});
