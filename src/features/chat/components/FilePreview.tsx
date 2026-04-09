import React, {useEffect, useState} from 'react';
import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import {formatFileSize} from '../../../shared/utils/formatFileSize';

interface FilePreviewProps {
  file: File;
  onCancel: () => void;
}

function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

export function FilePreview({file, onCancel}: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && isImageFile(file)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            style={{width: 48, height: 48, borderRadius: 6, objectFit: 'cover' as any}}
          />
        ) : (
          <View style={styles.fileIcon}>
            <Text style={styles.fileIconText}>{'\uD83D\uDCC4'}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
          <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
        </View>
        <Pressable onPress={onCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>{'\u2715'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    backgroundColor: '#F8F8F8',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    gap: 10,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileIconText: {
    fontSize: 24,
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
    marginTop: 2,
  },
  cancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
});
