import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { showError } from '@/shared/utils/alert';
import { authService, LoginPayload } from '@/auth/services/auth.service';
import { useAuthStore } from '@/auth/store/auth.store';

export const useLogin = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setShopAvailable = useAuthStore((state) => state.setShopAvailable);
  const setLoading = useAuthStore((state) => state.setLoading);

  return useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onMutate: () => {
      setLoading(true);
    },
    onSuccess: (result) => {
      if (!result.user) {
        const message = result.shop.error?.message || 'Identifiant ou mot de passe incorrect';
        showError(message);
        setLoading(false);
        return;
      }

      setUser(result.user);
      setAuthenticated(true);
      setShopAvailable(result.shop.success);

      // Première connexion (ou identifiants renvoyés) : le mot de passe
      // temporaire doit être remplacé avant toute autre action.
      const aChanger = Boolean(result.shop.success && result.shop.data?.mustChangePassword);
      useAuthStore.getState().setMustChangePassword(aChanger);
      if (aChanger) {
        navigate('/changer-mot-de-passe');
        setLoading(false);
        return;
      }

      navigate('/boutique/dashboard');
      setLoading(false);
    },
    onError: () => {
      showError('Connexion impossible. Réessayez.');
      setLoading(false);
    },
  });
};
