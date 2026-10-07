import type { ReactNode } from 'react';
import Icon from '@/shared/components/dashboard/Icon';

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
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Titre({ children, aide }: { children: ReactNode; aide?: string }) {
  return (
    <h2 className="font-semibold text-gray-900" title={aide}>
      {children}
    </h2>
  );
}

export function Vide({ texte }: { texte: string }) {
  return <p className="text-sm text-gray-400 py-8 text-center">{texte}</p>;
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
}: {
  titre: string;
  soustitre?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-base sm:text-lg font-bold text-gray-900">{titre}</h1>
        {soustitre && <p className="text-sm text-gray-500 mt-0.5">{soustitre}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Indicateur chiffré sobre, pour les grilles denses de KPI. */
export function Chiffre({
  libelle,
  valeur,
  aide,
  ton = 'neutre',
}: {
  libelle: string;
  valeur: ReactNode;
  aide?: string;
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
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-2.5" title={aide}>
      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{libelle}</p>
      <p className={`text-base sm:text-lg font-bold mt-0.5 break-words tabular-nums ${TONS[ton]}`}>
        {valeur}
      </p>
      {aide && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{aide}</p>}
    </div>
  );
}

export function Tuile({
  icone,
  libelle,
  valeur,
  sous,
  teinte,
  aide,
}: {
  icone: string;
  libelle: string;
  valeur: ReactNode;
  sous?: string;
  teinte: string;
  aide?: string;
}) {
  return (
    <Bloc className="p-3.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${teinte}`}>
        <Icon name={icone} size={16} />
      </div>
      <p className="text-xl font-bold text-gray-900 mt-2 tabular-nums" title={aide}>
        {valeur}
      </p>
      <p className="text-[13px] text-gray-500 leading-tight">{libelle}</p>
      {sous && <p className="text-xs text-gray-400">{sous}</p>}
    </Bloc>
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
}: {
  libelle: ReactNode;
  detail?: ReactNode;
  valeur: ReactNode;
  max: number;
  couleur?: string;
}) {
  const brut = typeof valeur === 'number' ? valeur : Number(String(valeur).replace(/\D/g, ''));
  const part = max > 0 ? Math.min(100, (brut / max) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
        <span className="text-gray-700 truncate min-w-0">{libelle}</span>
        <span className="font-semibold text-gray-900 shrink-0 tabular-nums">{valeur}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${couleur}`} style={{ width: `${part}%` }} />
      </div>
      {detail && <p className="text-[11px] text-gray-400 mt-1">{detail}</p>}
    </div>
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
    <div className={`rounded-lg p-2.5 text-center ${teinte}`} title={aide}>
      <p className="text-base font-bold tabular-nums">{valeur}</p>
      <p className="text-[11px] leading-tight">
        {puce && <span aria-hidden="true">{puce} </span>}
        {libelle}
      </p>
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
    <p className="flex items-start gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-2">
      <Icon name="alert-triangle" size={13} className="mt-0.5 shrink-0" />
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
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
    >
      <Icon name="refresh-cw" size={15} />
      {enCours ? 'Actualisation…' : 'Actualiser'}
    </button>
  );
}

/** Silhouette de chargement : `tuiles` cartes puis un grand bloc. */
export function Squelette({ tuiles = 4 }: { tuiles?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-48 bg-gray-100 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: tuiles }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  );
}
