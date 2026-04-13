import {colors} from '../../config/colors';
import {useAuthStore} from '../../stores/authStore';

/** Returns role-aware accent color */
export function useAccent(): string {
  const role = useAuthStore(s => s.role);
  return role === 'master' ? colors.masterAccent : colors.clientAccent;
}
