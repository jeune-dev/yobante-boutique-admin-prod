import shopClient from '@/infrastructure/http/shop.client';

/**
 * Ancienne action du serveur pour chaque statut, utilisée si le serveur n'a
 * pas encore la route générique `/statut` (serveur pas encore redéployé).
 */
const ANCIENNES_ACTIONS: Record<string, string> = {
  validee: 'valider',
  en_preparation: 'preparation',
  expediee: 'expedier',
  livree: 'livrer',
};

/**
 * Change le statut d'une commande. Le serveur prévient le client (e-mail,
 * notification push, application), sauf pour un statut interne.
 */
export async function changerStatutCommande(id: string, statut: string, note?: string) {
  try {
    return await shopClient.patch(`/admin/commandes/${id}/statut`, { statut, note });
  } catch (erreur: any) {
    const introuvable = erreur?.response?.status === 404 || erreur?.status === 404;
    const action = ANCIENNES_ACTIONS[statut];
    if (introuvable && action) {
      return shopClient.patch(`/admin/commandes/${id}/${action}`, note ? { noteAdmin: note } : {});
    }
    if (introuvable) {
      throw new Error(
        "Le serveur n'est pas encore à jour : déployez-le pour utiliser le statut « En modification »."
      );
    }
    throw erreur;
  }
}
