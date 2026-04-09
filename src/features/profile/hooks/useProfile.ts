import {useCallback} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import {useSupabaseQuery} from '../../../shared/hooks/useSupabaseQuery';
import type {UpdateTables} from '../../../types/database';

export function useProfile(userId?: string) {
  const currentUserId = useAuthStore(s => s.session?.user.id);
  const targetId = userId ?? currentUserId;

  const profileQuery = useSupabaseQuery(
    () =>
      supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId!)
        .single(),
    [targetId],
  );

  const masterProfileQuery = useSupabaseQuery(
    () =>
      supabase
        .from('master_profiles')
        .select('*')
        .eq('user_id', targetId!)
        .single(),
    [targetId],
  );

  const updateProfile = useCallback(
    async (updates: UpdateTables<'profiles'>) => {
      if (!currentUserId) {
        return {error: 'Not authenticated'};
      }
      const {data, error} = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUserId)
        .select()
        .single();
      if (data) {
        useAuthStore.getState().setProfile(data);
      }
      return {data, error: error?.message ?? null};
    },
    [currentUserId],
  );

  const updateMasterProfile = useCallback(
    async (updates: UpdateTables<'master_profiles'>) => {
      if (!currentUserId) {
        return {error: 'Not authenticated'};
      }
      const {data, error} = await supabase
        .from('master_profiles')
        .update(updates)
        .eq('user_id', currentUserId)
        .select()
        .single();
      if (data) {
        useAuthStore.getState().setMasterProfile(data);
      }
      return {data, error: error?.message ?? null};
    },
    [currentUserId],
  );

  const uploadAvatar = useCallback(
    async (filePath: string, fileBase64: string) => {
      if (!currentUserId) {
        return {error: 'Not authenticated'};
      }
      const fileName = `${currentUserId}/${Date.now()}.jpg`;
      const {error: uploadError} = await supabase.storage
        .from('avatars')
        .upload(fileName, decode(fileBase64), {contentType: 'image/jpeg'});
      if (uploadError) {
        return {error: uploadError.message};
      }
      const {data: urlData} = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      await updateProfile({avatar_url: urlData.publicUrl});
      return {error: null, url: urlData.publicUrl};
    },
    [currentUserId, updateProfile],
  );

  return {
    data: profileQuery.data,
    masterData: masterProfileQuery.data,
    loading: profileQuery.loading,
    error: profileQuery.error,
    refetch: profileQuery.refetch,
    updateProfile,
    updateMasterProfile,
    uploadAvatar,
  };
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
