import React, {useCallback, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {FileText, Download, Check} from 'lucide-react-native';
import {formatFileSize} from '../../../shared/utils/formatFileSize';
import {colors} from '../../../config/colors';
import {SUPABASE_ANON_KEY} from '../../../config/supabase';

interface FileMessageContentProps {
  fileUrl: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadProgress?: number;
}

type Status = 'idle' | 'downloading' | 'done';

export function FileMessageContent({
  fileUrl,
  fileName,
  fileType,
  fileSize,
  uploadProgress,
}: FileMessageContentProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const blobRef = useRef<Blob | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const isUploading = uploadProgress !== undefined;
  const progress = isUploading ? uploadProgress : downloadProgress;
  const showProgress = isUploading || status === 'downloading';

  const handleDownload = useCallback(() => {
    if (!fileUrl || status !== 'idle') return;
    setStatus('downloading');
    setDownloadProgress(0);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.responseType = 'blob';

    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        setDownloadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        blobRef.current = xhr.response;
        setStatus('done');
      } else {
        setStatus('idle');
      }
      xhrRef.current = null;
    };

    xhr.onerror = () => {
      setStatus('idle');
      xhrRef.current = null;
    };

    xhr.open('GET', fileUrl);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.send();
  }, [fileUrl, status]);

  const handleSave = useCallback(() => {
    if (!blobRef.current) return;
    const url = URL.createObjectURL(blobRef.current);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [fileName]);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <FileText size={28} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
          <Text style={styles.fileSize}>{formatFileSize(fileSize)}</Text>
        </View>
      </View>

      {showProgress && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, {width: `${progress}%`} as any]} />
        </View>
      )}

      {!isUploading && status === 'idle' && fileUrl && (
        <Pressable style={styles.actionBtn} onPress={handleDownload}>
          <Download size={16} color={colors.primary} />
          <Text style={styles.actionText}>Скачать</Text>
        </Pressable>
      )}

      {!isUploading && status === 'done' && (
        <Pressable style={styles.actionBtn} onPress={handleSave}>
          <Check size={16} color={colors.primary} />
          <Text style={styles.actionText}>Сохранить</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(0,122,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  fileSize: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
});
