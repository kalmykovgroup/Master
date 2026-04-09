import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {createStorage} from '../config/storage';
import type {Session} from '@supabase/supabase-js';
import type {Profile, MasterProfile} from '../types/database';
import type {UserRole} from '../config/constants';

const storageAdapter = createStorage('auth-store');

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  masterProfile: MasterProfile | null;
  role: UserRole | null;
  initialized: boolean;

  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setMasterProfile: (masterProfile: MasterProfile | null) => void;
  setRole: (role: UserRole | null) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      session: null,
      profile: null,
      masterProfile: null,
      role: null,
      initialized: false,

      setSession: session => set({session}),
      setProfile: profile => set({profile, role: (profile?.role as UserRole) ?? null}),
      setMasterProfile: masterProfile => set({masterProfile}),
      setRole: role => set({role}),
      setInitialized: initialized => set({initialized}),
      reset: () =>
        set({session: null, profile: null, masterProfile: null, role: null, initialized: false}),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => storageAdapter),
      partialize: state => ({
        session: state.session,
        profile: state.profile,
        masterProfile: state.masterProfile,
        role: state.role,
      }),
    },
  ),
);
