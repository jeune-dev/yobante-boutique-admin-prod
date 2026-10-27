import type { ReactNode } from 'react';
import Icon from '@/shared/components/dashboard/Icon';
import Cliquable from '@/shared/components/dashboard/Cliquable';
import Puce from '@/shared/components/dashboard/Puce';

/* ──────────────────────────────────────────────────────────────────────────
   Briques de présentation du dashboard.

   Ces composants vivaient en double dans DashboardPage et dans chaque page
   d'indicateurs : la même carte y avait trois rayons de bordure différents.
   Un seul jeu, importé partout, pour que les écrans se ressemblent.
   ────────────────────────────────────────────────────────────────────────── */

export function Bloc({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`carte ${className}`}>
      {children}
    </div>
  );
}

export function Titre({ children, aide }: { children: ReactNode; aide?: string }) {
  return (
    <h2 className="text-base font-semibold leading-tight text-gray-900" title={aide}>
      {children}
    </h2>
  );
}

export function Vide({ texte }: { texte: string }) {
  return <p className="py-10 text-center text-sm text-gray-500">{texte}</p>;
}

/**
 * Entête de page : titre, sous-titre et zone d'actions.
 *
 * Chaque page le réécrivait avec des marges légèrement différentes, ce qui
 * décalait le titre d'un écran à l'autre pendant la navigation.
 */
export function EntetePage({
  titre,
  soustitre,
  children,
  className = '',
}: {
  titre: string;
  soustitre?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-4 gap-y-3 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-gray-900 sm:text-2xl">
          {titre}
        </h1>
        {soustitre && <p className="mt-1 text-sm text-gray-500">{soustitre}</p>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0">{children}</div>
      )}
    </div>
  );
}

/**
 * Teintes d'accent, volontairement pâles : une touche de couleur par
 * indicateur pour le repérer d'un coup d'œil, sans transformer l'écran en
 * arc-en-ciel.
 */
export const ACCENTS = {
  bleu: { pastille: 'bg-blue-50 text-blue-600', bord: 'hover:border-blue-200', barre: 'bg-blue-500' },
  vert: { pastille: 'bg-emerald-50 text-emerald-600', bord: 'hover:border-emerald-200', barre: 'bg-emerald-500' },
  violet: { pastille: 'bg-violet-50 text-violet-600', bord: 'hover:border-violet-200', barre: 'bg-violet-500' },
  ambre: { pastille: 'bg-amber-50 text-amber-600', bord: 'hover:border-amber-200', barre: 'bg-amber-500' },
  rose: { pastille: 'bg-rose-50 text-rose-600', bord: 'hover:border-rose-200', barre: 'bg-rose-500' },
  cyan: { pastille: 'bg-cyan-50 text-cyan-600', bord: 'hover:border-cyan-200', barre: 'bg-cyan-500' },
  orange: { pastille: 'bg-orange-50 text-orange-600', bord: 'hover:border-orange-200', barre: 'bg-orange-500' },
  indigo: { pastille: 'bg-indigo-50 text-indigo-600', bord: 'hover:border-indigo-200', barre: 'bg-indigo-500' },
} as const;
export type Accent = keyof typeof ACCENTS;

/** Titre de section précédé d'une pastille d'icône colorée. */
export function TitreIcone({
  icone,
  accent,
  children,
}: {
  icone: string;
  accent: Accent;
  children: ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-3 text-base font-semibold leading-tight text-gray-900">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACCENTS[accent].pastille}`}>
        <Icon name={icone} size={17} />
      </span>
      <span className="min-w-0">{children}</span>
    </h2>
  );
}

/** Indicateur chiffré sobre, pour les grilles denses de KPI. */
export function Chiffre({
  libelle,
  valeur,
  aide,
  ton = 'neutre',
  vers,
  icone,
  accent,
}: {
  libelle: string;
  /** Petite icône colorée devant le libellé (tableau de bord). */
  icone?: string;
  accent?: Accent;
  valeur: ReactNode;
  aide?: string;
  /** Page qui détaille ce que compte l'indicateur (liste filtrée…). */
  vers?: string;
  /** Colore la valeur quand elle porte un jugement (bon, à surveiller, grave). */
  ton?: 'neutre' | 'bon' | 'attention' | 'critique';
}) {
  const TONS = {
    neutre: 'text-gray-900',
    bon: 'text-green-700',
    attention: 'text-orange-700',
    critique: 'text-red-700',
  } as const;

  return (
    <Cliquable
      vers={vers}
      titre={aide}
      survol={`hover:shadow-survol ${accent ? ACCENTS[accent].bord : 'hover:border-gray-300'}`}
      className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-carte"
    >
      <div className="flex items-center gap-2.5">
        {icone && accent && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACCENTS[accent].pastille}`}>
            <Icon name={icone} size={16} />
          </span>
        )}
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-gray-500">{libelle}</p>
        {vers && <Icon name="chevron-right" size={16} className="shrink-0 text-gray-300 transition-colors group-hover:text-gray-600" />}
      </div>
      <p className={`mt-3 break-words text-2xl font-semibold leading-tight tracking-tight tabular-nums ${TONS[ton]}`}>
        {valeur}
      </p>
      {aide && <p className="mt-1 text-[13px] leading-snug text-gray-500">{aide}</p>}
    </Cliquable>
  );
}

export function Tuile({
  icone,
  libelle,
  valeur,
  sous,
  teinte,
  aide,
  vers,
}: {
  icone: string;
  libelle: string;
  valeur: ReactNode;
  sous?: string;
  teinte: string;
  aide?: string;
  /** Page qui détaille ce que compte la tuile. */
  vers?: string;
}) {
  return (
    <Cliquable
      vers={vers}
      titre={aide}
      survol="hover:shadow-survol hover:border-gray-300"
      className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-carte sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${teinte}`}>
          <Icon name={icone} size={20} />
        </div>
        {vers && <Icon name="chevron-right" size={16} className="shrink-0 text-gray-300 transition-colors group-hover:text-gray-600" />}
      </div>
      <p className="mt-4 text-[26px] font-semibold leading-none tracking-tight text-gray-900 tabular-nums">{valeur}</p>
      <p className="mt-2 text-sm font-medium text-gray-500">{libelle}</p>
      {sous && <p className="text-[13px] text-gray-400">{sous}</p>}
    </Cliquable>
  );
}

/**
 * Ligne d'un classement : libellé, barre proportionnelle, valeur.
 *
 * `max` est fourni par l'appelant, qui connaît la plus grande valeur de sa
 * liste : calculer le maximum ligne par ligne donnerait des barres toutes
 * pleines.
 */
export function Barre({
  libelle,
  detail,
  valeur,
  max,
  couleur = 'bg-gray-900',
  vers,
}: {
  libelle: ReactNode;
  detail?: ReactNode;
  valeur: ReactNode;
  max: number;
  couleur?: string;
  /** Page qui liste ce que compte la barre (ex. les clients fidèles). */
  vers?: string;
}) {
  const brut = typeof valeur === 'number' ? valeur : Number(String(valeur).replace(/\D/g, ''));
  const part = max > 0 ? Math.min(100, (brut / max) * 100) : 0;

  return (
    <Cliquable vers={vers} className={vers ? '-mx-2 px-2 py-1 rounded-lg border border-transparent' : ''}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-gray-700 truncate min-w-0">{libelle}</span>
        <span className="font-semibold text-gray-900 shrink-0 tabular-nums flex items-center gap-1">
          {valeur}
          {vers && <Icon name="chevron-right" size={12} className="text-gray-300 group-hover:text-gray-600" />}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${couleur}`} style={{ width: `${part}%` }} />
      </div>
      {detail && <p className="text-xs text-gray-500 mt-1">{detail}</p>}
    </Cliquable>
  );
}

/** Pastille de comptage colorée, avec repère non chromatique. */
export function Pastille({
  libelle,
  valeur,
  teinte,
  puce,
  aide,
}: {
  libelle: string;
  valeur: ReactNode;
  teinte: string;
  puce?: string;
  aide?: string;
}) {
  return (
    <div className={`rounded-xl px-3 py-3.5 text-center ${teinte}`} title={aide}>
      <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums">{valeur}</p>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[13px] font-medium leading-tight">
        <Puce valeur={puce} />
        {libelle}
      </p>
      {aide && <p className="mt-1 text-xs leading-tight opacity-75">{aide}</p>}
    </div>
  );
}

/**
 * Avertissement discret affiché sous un chiffre dont la base de calcul est
 * incomplète — une marge sans prix d'achat, un coût de livraison qui n'est
 * que le prix facturé. Mieux vaut le dire que laisser croire à un chiffre exact.
 */
export function Reserve({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-orange-200/70 bg-orange-50 px-3 py-2.5 text-sm text-orange-800">
      <Icon name="alert-triangle" size={15} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Bouton d'actualisation manuelle, identique sur toutes les pages. */
export function BoutonActualiser({
  onClick,
  enCours,
}: {
  onClick: () => void;
  enCours?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={enCours}
      className="btn-secondaire"
    >
      <Icon name="refresh-cw" size={15} className={enCours ? 'animate-spin' : ''} />
      {enCours ? 'Actualisation…' : 'Actualiser'}
    </button>
  );
}

/** Silhouette de chargement : `tuiles` cartes puis un grand bloc. */
export function Squelette({ tuiles = 4 }: { tuiles?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-48 rounded-md bg-gray-200/70" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: tuiles }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-200/60" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-gray-200/60" />
    </div>
  );
}
