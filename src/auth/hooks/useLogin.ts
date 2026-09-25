import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { showError } from '@/shared/utils/alert';
import { authService, LoginPayload } from '@/auth/services/auth.service';
import { useAuthStore } from '@/auth/store/auth.store';

export const useLogin = (onBothAvailable?: () => void) => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setTokenAvailability = useAuthStore((state) => state.setTokenAvailability);
  const setLoading = useAuthStore((state) => state.setLoading);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: (result) => {
      if (!result.user) {
        const message =
          result.shop.error?.message ||
          result.shipment.error?.message ||
          'Identifiant ou mot de passe incorrect';
        showError(message);
        setLoading(false);
        return;
      }

      setUser(result.user);
      setAuthenticated(true);
      setTokenAvailability(result.shop.success, result.shipment.success);

      // Première connexion (ou identifiants renvoyés) : le mot de passe
      // temporaire doit être remplacé avant toute autre action.
      const aChanger = Boolean(result.shop.success && result.shop.data?.mustChangePassword);
      useAuthStore.getState().setMustChangePassword(aChanger);
      if (aChanger) {
        useAuthStore.getState().setSelectedApp('shop');
        navigate('/changer-mot-de-passe');
        setLoading(false);
        return;
      }

      if (result.shop.success && result.shipment.success) {
        // Les 2 backs ont répondu → ouvrir le modal de choix
        useAuthStore.getState().setSelectedApp(null);
        onBothAvailable?.();
      } else if (result.shop.success) {
        // Seulement la boutique → redirection directe
        useAuthStore.getState().setSelectedApp('shop');
        navigate('/boutique/dashboard');
      } else {
        // Seulement le colis → redirection directe
        useAuthStore.getState().setSelectedApp('shipment');
        navigate('/colis/dashboard');
      }

      setLoading(false);
    },
    onError: () => {
      showError('Connexion impossible. Réessayez.');
      setLoading(false);
    },
  });
};
