import React, {useRef} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {formatRelative} from '../../../shared/utils/formatDate';
import {colors} from '../../../config/colors';

interface ConversationItemProps {
  name: string;
  lastMessageAt: string | null;
  orderTitle?: string;
  lastMessage?: string;
  unreadCount?: number;
  active?: boolean;
  isArchived?: boolean;
  onPress: () => void;
  onArchive?: () => void;
  onLongPress?: () => void;
  testID?: string;
}

export function ConversationItem({
  name,
  lastMessageAt,
  orderTitle,
  lastMessage,
  unreadCount,
  active,
  isArchived,
  onPress,
  onArchive,
  onLongPress,
  testID,
}: ConversationItemProps) {
  const {t} = useTranslation();
  const hasUnread = (unreadCount ?? 0) > 0;
  const translateX = useRef(new Animated.Value(0)).current;
  const startX = useRef(0);
  const isDragging = useRef(false);

  const archiveButtonWidth = 80;

  const onTouchStart = (e: any) => {
    startX.current = e.nativeEvent.pageX;
    isDragging.current = false;
  };

  const onTouchMove = (e: any) => {
    if (!onArchive) return;
    const dx = e.nativeEvent.pageX - startX.current;
    if (dx < -10) {
      isDragging.current = true;
      const clamped = Math.max(dx, -archiveButtonWidth);
      translateX.setValue(clamped);
    }
  };

  const onTouchEnd = () => {
    if (!isDragging.current) return;
    // @ts-ignore — Animated.Value internal
    const current = (translateX as any).__getValue?.() ?? 0;
    if (current < -archiveButtonWidth / 2) {
      Animated.spring(translateX, {
        toValue: -archiveButtonWidth,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleArchivePress = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    onArchive?.();
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Archive action behind */}
      {onArchive && (
        <Pressable
          style={styles.archiveAction}
          onPress={handleArchivePress}>
          <Text style={styles.archiveActionText}>
            {isArchived ? t('chat.fromArchive') : t('chat.toArchive')}
          </Text>
        </Pressable>
      )}

      <Animated.View
        style={[styles.animatedRow, {transform: [{translateX}]}]}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}>
        <Pressable
          style={({pressed}) => [
            styles.container,
            active && styles.active,
            pressed && styles.pressed,
          ]}
          onPress={() => {
            if (isDragging.current) return;
            onPress();
          }}
          onLongPress={onLongPress}
          testID={testID}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.info}>
            <View style={styles.topRow}>
              <Text style={[styles.name, hasUnread && styles.nameBold]} numberOfLines={1}>
                {name}
              </Text>
              {lastMessageAt && (
                <Text style={[styles.date, hasUnread && styles.dateUnread]}>
                  {formatRelative(lastMessageAt)}
                </Text>
              )}
            </View>
            {orderTitle && (
              <Text style={styles.orderTitle} numberOfLines={1}>
                {orderTitle}
              </Text>
            )}
            <View style={styles.bottomRow}>
              {lastMessage ? (
                <Text
                  style={[styles.preview, hasUnread && styles.previewUnread]}
                  numberOfLines={1}>
                  {lastMessage}
                </Text>
              ) : (
                <View />
              )}
              {hasUnread && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    overflow: 'hidden',
  },
  animatedRow: {
    backgroundColor: colors.bg,
  },
  archiveAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archiveActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    backgroundColor: colors.bg,
  },
  pressed: {
    backgroundColor: colors.bgSecondary,
  },
  active: {
    backgroundColor: colors.primaryLight,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
    flex: 1,
  },
  nameBold: {
    fontWeight: '600',
  },
  date: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  dateUnread: {
    color: colors.primary,
  },
  orderTitle: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  preview: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  previewUnread: {
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.badge,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
