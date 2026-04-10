import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Pressable,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {colors} from '../../config/colors';

interface UpdateDialogProps {
  updateType: 'force' | 'optional';
  storeUrl: string;
  latestVersion: string;
  onDismiss: () => void;
}

export function UpdateDialog({
  updateType,
  storeUrl,
  latestVersion,
  onDismiss,
}: UpdateDialogProps) {
  const {t} = useTranslation();

  const handleUpdate = () => {
    Linking.openURL(storeUrl);
  };

  const handleBackdrop = () => {
    if (updateType === 'optional') {
      onDismiss();
    }
  };

  return (
    <Pressable style={styles.overlay} onPress={handleBackdrop}>
      <Pressable style={styles.dialog} onPress={e => e.stopPropagation()}>
        <Text style={styles.title}>{t('update.title')}</Text>
        <Text style={styles.message}>
          {updateType === 'force'
            ? t('update.forceMessage', {version: latestVersion})
            : t('update.optionalMessage', {version: latestVersion})}
        </Text>

        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleUpdate}
          activeOpacity={0.7}>
          <Text style={styles.updateButtonText}>{t('update.updateButton')}</Text>
        </TouchableOpacity>

        {updateType === 'optional' && (
          <TouchableOpacity onPress={onDismiss} activeOpacity={0.7}>
            <Text style={styles.laterText}>{t('update.later')}</Text>
          </TouchableOpacity>
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  dialog: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: 280,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  updateButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  laterText: {
    fontSize: 17,
    color: colors.primary,
  },
});
