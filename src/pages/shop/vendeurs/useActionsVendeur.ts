import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showConfirm, showError, showSuccess } from '@/shared/utils/alert';
import {
  estBloque,
  nomBoutique,
  nomComplet,
  vendeursApi,
  type Vendeur,
} from '@/domains/shop/api/vendeurs.api';

/**
 * Actions d'un compte vendeur : blocage, renvoi des identifiants, édition du
 * profil et suppression.
 *
 * Réunies ici pour que la liste et la fiche d'un vendeur posent exactement la
 * même question de confirmation et invalident les mêmes caches. Dupliquées,
 * les deux écrans finissaient par ne plus dire la même chose avant de bloquer
 * un vendeur, et la fiche gardait l'ancien statut après une action lancée
 * depuis la liste.
 */
export function useActionsVendeur() {
  const qc = useQueryClient();

  /** La liste paginée et la fiche d'un vendeur montrent le même statut. */
  const rafraichir = (id?: string) => {
    qc.invalidateQueries({ queryKey: ['vendeurs'] });
    if (id) qc.invalidateQueries({ queryKey: ['vendeur', id] });
  };

  const statut = useMutation({
    mutationFn: ({ id, bloquer }: { id: string; bloquer: boolean }) =>
      bloquer ? vendeursApi.bloquer(id) : vendeursApi.debloquer(id),
    onSuccess: (reponse, { id }) => {
      rafraichir(id);
      showSuccess(reponse);
    },
    onError: (e: unknown) => showError(e),
  });

  const renvoyer = useMutation({
    mutationFn: (id: string) => vendeursApi.renvoyerIdentifiants(id),
    onSuccess: (reponse, id) => {
      rafraichir(id);
      showSuccess(reponse);
    },
    onError: (e: unknown) => showError(e),
  });

  const modifier = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      vendeursApi.modifier(id, payload),
    onSuccess: (reponse, { id }) => {
      rafraichir(id);
      showSuccess(reponse);
    },
    onError: (e: unknown) => showError(e),
  });

  const supprimer = useMutation({
    mutationFn: (id: string) => vendeursApi.supprimer(id),
    onSuccess: (reponse) => {
      rafraichir();
      showSuccess(reponse);
    },
    onError: (e: unknown) => showError(e),
  });

  /** Bascule le statut après confirmation ; ne fait rien si l'admin annule. */
  const demanderStatut = async (v: Vendeur) => {
    const bloquer = !estBloque(v);
    const confirme = await showConfirm({
      titre: bloquer ? 'Bloquer le vendeur' : 'Débloquer le vendeur',
      message: bloquer
        ? `Êtes-vous sûr de vouloir bloquer ${nomComplet(v)} ? Il ne pourra plus accéder à son espace vendeur.`
        : `Êtes-vous sûr de vouloir débloquer ${nomComplet(v)} ? Il retrouvera l'accès à son espace vendeur.`,
      confirmText: bloquer ? 'Bloquer' : 'Débloquer',
      danger: bloquer,
    });
    if (!confirme) return;
    statut.mutate({ id: v.id, bloquer });
  };

  const demanderRenvoi = async (v: Vendeur) => {
    const destEmail = v.email ? v.email.trim() : 'aucun email';
    const confirme = await showConfirm({
      titre: 'Renvoyer les identifiants',
      message: `Générer un nouveau mot de passe temporaire pour ${nomComplet(v)} ?\nLes identifiants seront envoyés par email à : ${destEmail}\nLe vendeur devra le changer à sa prochaine connexion dans l'application mobile.`,
      confirmText: 'Renvoyer',
    });
    if (!confirme) return;
    renvoyer.mutate(v.id);
  };

  const demanderSuppression = async (v: Vendeur) => {
    const boutique = nomBoutique(v);
    const confirme = await showConfirm({
      titre: 'Supprimer le compte vendeur',
      message: `Supprimer définitivement le compte de ${nomComplet(v)}${
        boutique !== '—' ? ` (${boutique})` : ''
      } ?\nIl ne pourra plus se connecter et ses produits seront retirés du catalogue. L'historique de ses commandes et reversements est conservé.\nCette action est irréversible.`,
      confirmText: 'Supprimer',
      danger: true,
    });
    if (!confirme) return;
    supprimer.mutate(v.id);
  };

  return {
    statut,
    renvoyer,
    modifier,
    supprimer,
    demanderStatut,
    demanderRenvoi,
    demanderSuppression,
  };
}
