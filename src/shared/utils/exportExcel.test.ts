import { describe, it, expect, vi } from 'vitest';
import { construireFeuilles, enDate, enNombre, nomFichierExport } from './exportExcel';
import { contientTexte, dansIntervalle, dansPeriode, libelleIntervalle, libellePeriode } from './filtres';
import { chargerToutesLesPages } from '@/shared/hooks/useListeFiltree';

describe('filtres partagés', () => {
  it('recherche insensible aux accents et à la casse', () => {
    expect(contientTexte(['Élégant Sac'], 'elegant')).toBe(true);
    expect(contientTexte(['Sac', null], 'chaussure')).toBe(false);
    expect(contientTexte(['x'], '  ')).toBe(true);
  });

  it('période : bornes incluses, au jour près', () => {
    expect(dansPeriode('2026-10-01T10:00:00', '2026-10-01', '2026-10-01')).toBe(true);
    expect(dansPeriode('2026-09-30T10:00:00', '2026-10-01', '')).toBe(false);
    expect(dansPeriode('2026-10-02T10:00:00', '', '2026-10-01')).toBe(false);
    expect(dansPeriode(null, '', '')).toBe(true);
    expect(dansPeriode(null, '2026-10-01', '')).toBe(false);
  });

  it('intervalle numérique : bornes incluses, vide = pas de filtre', () => {
    expect(dansIntervalle(5000, '5000', '5000')).toBe(true);
    expect(dansIntervalle(4999, '5000', '')).toBe(false);
    expect(dansIntervalle('12000', '', '10000')).toBe(false);
    expect(dansIntervalle(undefined, '', '')).toBe(true);
    expect(dansIntervalle(undefined, '1', '')).toBe(false);
  });

  it('libellés lisibles pour la feuille « Filtres »', () => {
    expect(libellePeriode('2026-10-01', '2026-10-24')).toBe('du 01/10/2026 au 24/10/2026');
    expect(libellePeriode('', '')).toBe('');
    expect(libelleIntervalle('1000', '')).toMatch(/^≥ 1/);
  });
});

describe('export Excel', () => {
  it('nom de fichier horodaté', () => {
    expect(nomFichierExport('commandes', new Date(2026, 9, 4, 9, 5))).toBe('commandes_2026-10-04_09h05.xlsx');
  });

  it('valeurs absentes : cellule vide plutôt que 0 ou « Invalid Date »', () => {
    expect(enNombre(null)).toBeNull();
    expect(enNombre('')).toBeNull();
    expect(enNombre('12.5')).toBe(12.5);
    expect(enDate('pas une date')).toBeNull();
    expect(enDate('2026-10-01T00:00:00Z')).toBeInstanceOf(Date);
  });

  it('feuille Données (en-têtes + lignes typées) et feuille Filtres', () => {
    const maintenant = new Date(2026, 9, 24, 14, 0);
    const [donnees, filtres] = construireFeuilles(
      {
        nomFichier: 'x',
        lignes: [{ ref: 'CMD-1', montant: 5000, le: '2026-10-01T10:00:00Z', actif: true, vide: null }],
        colonnes: [
          { titre: 'Réf', valeur: (l) => l.ref },
          { titre: 'Montant', valeur: (l) => l.montant, montant: true },
          { titre: 'Date', valeur: (l) => enDate(l.le) },
          { titre: 'Actif', valeur: (l) => l.actif },
          { titre: 'Vide', valeur: (l) => l.vide },
        ],
        filtres: { Statut: 'Livrée', Vendeur: '', Période: undefined },
      },
      maintenant
    );

    expect(donnees.sheet).toBe('Données');
    expect(donnees.stickyRowsCount).toBe(1);
    const [entetes, ligne] = donnees.data as any[];
    expect(entetes.map((c: any) => c.value)).toEqual(['Réf', 'Montant', 'Date', 'Actif', 'Vide']);
    expect(entetes[0].fontWeight).toBe('bold');
    expect(ligne[0]).toEqual({ value: 'CMD-1', type: String });
    expect(ligne[1]).toMatchObject({ value: 5000, type: Number, format: '#,##0' });
    expect(ligne[2]).toMatchObject({ type: Date, format: 'dd/mm/yyyy hh:mm' });
    expect(ligne[3]).toEqual({ value: 'Oui', type: String });
    expect(ligne[4]).toBeNull();

    // Seuls les filtres renseignés figurent dans le résumé.
    const resume = (filtres.data as any[]).slice(5);
    expect(resume).toEqual([['Statut', 'Livrée']]);
    expect((filtres.data as any[])[2][1]).toMatchObject({ value: 1 });
  });

  it('sans filtre : « Aucun filtre » dans le résumé', () => {
    const [, filtres] = construireFeuilles({ nomFichier: 'x', lignes: [], colonnes: [] });
    expect((filtres.data as any[]).slice(5)).toEqual([['Aucun filtre', 'Toutes les données']]);
  });
});

describe('chargerToutesLesPages', () => {
  it('parcourt toutes les pages et écarte les doublons', async () => {
    const charger = vi.fn(async (page: number) => ({
      lignes: page === 3 ? [{ id: 'b' }, { id: 'c' }] : [{ id: page === 1 ? 'a' : 'b' }],
      totalPages: 3,
    }));
    const r = await chargerToutesLesPages(charger);
    expect(charger).toHaveBeenCalledTimes(3);
    expect(r.lignes.map((l) => l.id)).toEqual(['a', 'b', 'c']);
    expect(r.tronque).toBe(false);
  });

  it('s’arrête à la limite et le signale', async () => {
    const charger = vi.fn(async (page: number) => ({
      lignes: [{ id: `p${page}-1` }, { id: `p${page}-2` }],
      totalPages: 50,
    }));
    const r = await chargerToutesLesPages(charger, 3);
    expect(r.lignes).toHaveLength(3);
    expect(r.tronque).toBe(true);
    expect(charger.mock.calls.length).toBeLessThan(50);
  });
});
