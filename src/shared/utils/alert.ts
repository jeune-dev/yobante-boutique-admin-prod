// ─────────────────────────────────────────────────────────────
// shared/utils/alert.ts — Notifications & confirmations SweetAlert2
//
// Fichier unique pour TOUTES les alertes de l'application.
// Les messages de succès/erreur viennent du backend (enveloppe
// { success, message, data }) — jamais codés en dur côté admin.
// L'intercepteur HTTP attache la propriété non-énumérable `_message`
// sur la donnée résolue ; ces helpers la relisent pour afficher le
// message exact renvoyé par le backend.
// ─────────────────────────────────────────────────────────────
import Swal, { type SweetAlertOptions } from 'sweetalert2';

// ── Charte visuelle du dashboard (ambre de la marque) ─────────
const STYLE = {
  confirm: '#f59e0b',
  danger: '#dc2626',
  neutre: '#6b7280',
} as const;

const BASE: SweetAlertOptions = {
  background: '#ffffff',
  color: '#111827',
  confirmButtonColor: STYLE.confirm,
  cancelButtonColor: STYLE.neutre,
  confirmButtonText: 'OK',
  cancelButtonText: 'Annuler',
  buttonsStyling: true,
  reverseButtons: true,
  customClass: {
    popup: 'swal2-yobante',
    title: 'swal2-yobante__titre',
    htmlContainer: 'swal2-yobante__corps',
  },
};

// ── Lecture du message du backend ─────────────────────────────
const messageBackend = (donnees: unknown): string | undefined => {
  if (donnees && typeof donnees === 'object' && !Array.isArray(donnees)) {
    const msg = (donnees as any)._message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return undefined;
};

// Extrait un message lisible depuis une erreur (client HTTP normalisé)
// ou depuis un texte passé tel quel.
const texteErreur = (erreur: unknown, defaut: string): string => {
  if (typeof erreur === 'string' && erreur.trim()) return erreur;
  if (erreur && typeof erreur === 'object') {
    const e = erreur as any;
    if (typeof e.message === 'string' && e.message.trim()) return e.message;
    if (typeof e.error === 'string' && e.error.trim()) return e.error;
  }
  return defaut;
};

// Normalise le message affiché : un texte l'emporte, sinon le message
// du backend, sinon le message par défaut.
const texteAffiche = (message: unknown, defaut: string): string => {
  if (typeof message === 'string' && message.trim()) return message;
  return messageBackend(message) ?? defaut;
};

// ── Succès ────────────────────────────────────────────────────
/** Toast de succès. `message` peut être le résultat du mutation
 *  (le message du backend est alors lu via `_message`) ou un texte. */
export const showSuccess = (message?: unknown, defaut = 'Opération réussie') =>
  Swal.fire({
    ...BASE,
    icon: 'success',
    title: texteAffiche(message, defaut),
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
  });

// ── Erreur ────────────────────────────────────────────────────
/** Toast d'erreur. Le message vient du backend (erreur rejetée par
 *  l'intercepteur : `{ status, message, data }`) ou d'un texte local. */
export const showError = (erreur?: unknown, defaut = 'Une erreur est survenue') =>
  Swal.fire({
    ...BASE,
    icon: 'error',
    title: texteErreur(erreur, defaut),
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
  });

// ── Info / Avertissement ──────────────────────────────────────
export const showInfo = (message?: unknown, defaut = 'Information') =>
  Swal.fire({
    ...BASE,
    icon: 'info',
    title: texteAffiche(message, defaut),
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

export const showWarning = (message?: unknown, defaut = 'Attention') =>
  Swal.fire({
    ...BASE,
    icon: 'warning',
    title: texteAffiche(message, defaut),
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

// ── Confirmation (modale bloquante) ───────────────────────────
/** Ouvre une modale de confirmation et résout `true` si l'utilisateur
 *  confirme. À utiliser avant toute action destructive. */
export const showConfirm = ({
  titre = 'Confirmer',
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  danger = false,
}: {
  titre?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}): Promise<boolean> =>
  Swal.fire({
    ...BASE,
    icon: danger ? 'warning' : 'question',
    title: titre,
    text: message,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: danger ? STYLE.danger : STYLE.confirm,
    showCloseButton: true,
  }).then((resultat) => resultat.isConfirmed);
