import {useCallback, useRef, useState} from 'react';
import {SUPABASE_URL, SUPABASE_ANON_KEY, supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';

interface UploadResult {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const getAuthToken = useCallback(async () => {
    const {data} = await supabase.auth.getSession();
    return data.session?.access_token ?? SUPABASE_ANON_KEY;
  }, []);

  const uploadFile = useCallback(
    async (
      file: File,
      conversationId: string,
      onProgress?: (pct: number) => void,
    ): Promise<UploadResult | null> => {
      setUploading(true);
      setProgress(0);

      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${conversationId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const token = await getAuthToken();

      return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
            onProgress?.(pct);
          }
        });

        xhr.addEventListener('load', () => {
          setUploading(false);
          setProgress(100);
          xhrRef.current = null;

          if (xhr.status >= 200 && xhr.status < 300) {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/chat-files/${path}`;
            resolve({
              fileUrl: publicUrl,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
            });
          } else {
            resolve(null);
          }
        });

        xhr.addEventListener('error', () => {
          setUploading(false);
          setProgress(0);
          xhrRef.current = null;
          resolve(null);
        });

        xhr.addEventListener('abort', () => {
          setUploading(false);
          setProgress(0);
          xhrRef.current = null;
          resolve(null);
        });

        xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/chat-files/${path}`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });
    },
    [getAuthToken],
  );

  const cancelUpload = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
  }, []);

  return {uploadFile, uploading, progress, cancelUpload};
}
