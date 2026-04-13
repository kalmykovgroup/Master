import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  useConversations,
  useArchiveConversation,
  fetchLastMessage,
} from '../hooks/useConversations';
import {useAuthStore} from '../../../stores/authStore';
import {useUnreadStore} from '../../../stores/unreadStore';
import {useUnreadCount} from '../hooks/useUnreadCount';
import {ConversationItem} from '../components/ConversationItem';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {colors} from '../../../config/colors';
import type {ChatStackParamList} from '../../../types/navigation';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

export function ChatListScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const role = useAuthStore(s => s.role);
  const [showArchived, setShowArchived] = useState(false);
  const {data, loading, refetch} = useConversations(
    showArchived ? 'archived' : 'active',
  );
  const {archiveConversation} = useArchiveConversation();
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const counts = useUnreadStore(s => s.counts);
  const {archivedTotal} = useUnreadCount();

  // Context menu state
  const [menuConvId, setMenuConvId] = useState<string | null>(null);

  const loadLastMessages = useCallback(async (conversations: any[]) => {
    const msgs: Record<string, string> = {};
    await Promise.all(
      conversations.map(async (conv: any) => {
        const text = await fetchLastMessage(conv.id);
        if (text) {
          msgs[conv.id] = text;
        }
      }),
    );
    setLastMessages(msgs);
  }, []);

  useEffect(() => {
    if (data && Array.isArray(data) && data.length > 0) {
      loadLastMessages(data);
    }
  }, [data, loadLastMessages]);

  const handleArchive = async (conversationId: string) => {
    const newStatus = showArchived ? 'active' : 'archived';
    await archiveConversation(conversationId, newStatus);
    setMenuConvId(null);
    refetch();
  };

  if (loading && !data) {
    return <LoadingScreen />;
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        {/* Header */}
        <View style={styles.header}>
          {showArchived && (
            <Pressable onPress={() => setShowArchived(false)} style={styles.backBtn}>
              <Text style={styles.backText}>{'\u2190'}</Text>
            </Pressable>
          )}
          <Text style={styles.title}>
            {showArchived ? t('chat.archived') : t('chat.chats')}
          </Text>
        </View>

        <FlatList
          data={data as any[] | null}
          keyExtractor={item => item.id}
          renderItem={({item}) => {
            const other = role === 'client' ? item.master : item.client;
            const name = other?.display_name ?? t('profile.profile');
            const orderTitle = item.order?.title;
            return (
              <ConversationItem
                name={name}
                lastMessageAt={item.last_message_at}
                orderTitle={orderTitle}
                lastMessage={lastMessages[item.id]}
                unreadCount={counts[item.id] ?? 0}
                isArchived={showArchived}
                onPress={() =>
                  navigation.navigate('Chat', {
                    conversationId: item.id,
                    title: name,
                  })
                }
                onArchive={() => handleArchive(item.id)}
                onLongPress={() => setMenuConvId(item.id)}
              />
            );
          }}
          ListEmptyComponent={
            <EmptyState
              message={
                showArchived ? t('chat.noArchivedChats') : t('chat.noChats')
              }
            />
          }
          ListFooterComponent={
            !showArchived ? (
              <Pressable
                style={styles.archiveBtn}
                onPress={() => setShowArchived(true)}>
                <Text style={styles.archiveBtnText}>{t('chat.archive')}</Text>
                {archivedTotal > 0 && (
                  <View style={styles.archiveBadge}>
                    <Text style={styles.archiveBadgeText}>{archivedTotal}</Text>
                  </View>
                )}
              </Pressable>
            ) : null
          }
          onRefresh={refetch}
          refreshing={loading}
        />

        {/* Context menu (no Modal to avoid aria-hidden) */}
        {!!menuConvId && (
          <Pressable
            style={styles.overlay}
            onPress={() => setMenuConvId(null)}>
            <View style={styles.menuCard}>
              <Pressable
                style={styles.menuItem}
                onPress={() => menuConvId && handleArchive(menuConvId)}>
                <Text style={styles.menuItemText}>
                  {showArchived ? t('chat.fromArchive') : t('chat.toArchive')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.menuItem, styles.menuItemLast]}
                onPress={() => setMenuConvId(null)}>
                <Text style={[styles.menuItemText, styles.cancelText]}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: {
    marginRight: 8,
    padding: 4,
  },
  backText: {
    fontSize: 22,
    color: colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  archiveBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  archiveBtnText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '500',
  },
  archiveBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  archiveBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  // Context menu
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  menuCard: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    width: 260,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
  },
});
