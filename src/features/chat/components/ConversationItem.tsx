import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {formatRelative} from '../../../shared/utils/formatDate';

interface ConversationItemProps {
  name: string;
  lastMessageAt: string | null;
  orderTitle?: string;
  lastMessage?: string;
  unreadCount?: number;
  active?: boolean;
  onPress: () => void;
  testID?: string;
}

export function ConversationItem({
  name,
  lastMessageAt,
  orderTitle,
  lastMessage,
  unreadCount,
  active,
  onPress,
  testID,
}: ConversationItemProps) {
  const hasUnread = (unreadCount ?? 0) > 0;

  return (
    <Pressable
      style={({pressed}) => [styles.container, active && styles.active, pressed && styles.pressed]}
      onPress={onPress}
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
            <Text style={[styles.preview, hasUnread && styles.previewUnread]} numberOfLines={1}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    backgroundColor: '#F2F2F7',
  },
  active: {
    backgroundColor: '#E5F2FF',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
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
    color: '#000000',
    flex: 1,
  },
  nameBold: {
    fontWeight: '600',
  },
  date: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 8,
  },
  dateUnread: {
    color: '#007AFF',
  },
  orderTitle: {
    fontSize: 13,
    color: '#007AFF',
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
    color: '#8E8E93',
    flex: 1,
  },
  previewUnread: {
    color: '#000000',
  },
  badge: {
    backgroundColor: '#007AFF',
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
