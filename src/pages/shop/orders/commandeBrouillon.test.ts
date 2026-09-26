import { describe, it, expect } from 'vitest';
import {
  ajouterAuPanier,
  construirePayload,
  erreurLigne,
  lireQuantite,
  MESSAGES,
  modifierQuantite,
  premiereErreur,
  retirerDuPanier,
  sousTotalLigne,
  totalArticles,
  validerBrouillon,
  type LignePanier,
} from './commandeBrouillon';

const A = { id: 'a', nom: 'Produit A', prix: '5000.00', stock: 5 };
const B = { id: 'b', nom: 'Produit B', prix: 7500, stock: 3 };

describe('lireQuantite', () => {
  it.each([
    ['1', 1],
    ['12', 12],
    [' 3 ', 3],
  ])('%s → %d', (saisie, attendu) => expect(lireQuantite(saisie)).toBe(attendu));

  it.each(['0', '-1', 'abc', '1.5', '1,5', '', '1e3', '+2'])('%s → invalide', (saisie) =>
    expect(lireQuantite(saisie)).toBeNull()
  );
});

describe('panier', () => {
  it('ajoute un produit avec quantité 1 et son prix réel', () => {
    const p = ajouterAuPanier([], A);
    expect(p).toEqual([expect.objectContaining({ produitId: 'a', prix: 5000, quantite: '1', stock: 5 })]);
  });

  it('un produit ajouté deux fois ne crée pas de doublon : la quantité augmente', () => {
    const p = ajouterAuPanier(ajouterAuPanier([], A), A);
    expect(p).toHaveLength(1);
    expect(p[0].quantite).toBe('2');
  });

  it('modifie et supprime une ligne', () => {
    let p = ajouterAuPanier(ajouterAuPanier([], A), B);
    p = modifierQuantite(p, 'b', '3');
    expect(p.find((l) => l.produitId === 'b')!.quantite).toBe('3');
    p = retirerDuPanier(p, 'a');
    expect(p.map((l) => l.produitId)).toEqual(['b']);
  });

  it('calcule sous-totaux et total (en centimes, sans erreur flottante)', () => {
    let p = ajouterAuPanier(ajouterAuPanier([], A), B);
    p = modifierQuantite(p, 'a', '2');
    expect(sousTotalLigne(p[0])).toBe(10000);
    expect(sousTotalLigne(p[1])).toBe(7500);
    expect(totalArticles(p)).toBe(17500);
    const flottant: LignePanier = { produitId: 'x', nom: 'x', prix: 0.1, stock: null, quantite: '3' };
    expect(totalArticles([flottant])).toBe(0.3);
  });

  it('une quantité invalide compte pour 0 dans le total', () => {
    const p = modifierQuantite(ajouterAuPanier([], A), 'a', 'abc');
    expect(totalArticles(p)).toBe(0);
  });
});

describe('validation', () => {
  const ligne = (quantite: string, stock: number | null = 5): LignePanier => ({
    produitId: 'a',
    nom: 'A',
    prix: 100,
    stock,
    quantite,
  });

  it('quantité supérieure au stock → message avec le stock disponible', () => {
    expect(erreurLigne(ligne('7'))).toBe('Stock insuffisant : 5 disponibles.');
    expect(erreurLigne(ligne('1', 0))).toBe('Produit en rupture de stock.');
    expect(erreurLigne(ligne('5'))).toBeNull();
  });

  it('client manquant, panier vide', () => {
    const e = validerBrouillon({ clientId: '', adresseId: '', panier: [] });
    expect(e.client).toBe(MESSAGES.client);
    expect(e.panier).toBe(MESSAGES.panierVide);
    expect(premiereErreur(e)).toBe(MESSAGES.client);
  });

  it('adresse manquante une fois le client choisi', () => {
    const e = validerBrouillon({ clientId: 'c', adresseId: '', panier: [ligne('1')] });
    expect(premiereErreur(e)).toBe(MESSAGES.adresse);
  });

  it.each(['0', '-1', 'abc', '1.5'])('quantité %s → erreur', (q) => {
    const e = validerBrouillon({ clientId: 'c', adresseId: 'ad', panier: [ligne(q)] });
    expect(premiereErreur(e)).toBe(MESSAGES.quantite);
  });

  it('brouillon complet → aucune erreur', () => {
    expect(premiereErreur(validerBrouillon({ clientId: 'c', adresseId: 'ad', panier: [ligne('2')] }))).toBeNull();
  });
});

describe('construirePayload', () => {
  it("n'envoie ni prix ni total : seulement produitId et quantité entière", () => {
    const panier = modifierQuantite(ajouterAuPanier([], A), 'a', '2');
    const payload = construirePayload({
      clientId: 'c',
      adresseId: 'ad',
      panier,
      methode: 'wave',
      note: '  ',
      dateLivraisonSouhaitee: '',
    });
    expect(payload).toEqual({
      userId: 'c',
      adresseId: 'ad',
      methode: 'wave',
      note: null,
      dateLivraisonSouhaitee: null,
      items: [{ produitId: 'a', quantite: 2 }],
    });
  });
});
