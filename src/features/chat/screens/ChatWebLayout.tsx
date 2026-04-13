import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import type {ViewToken} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useConversations, useArchiveConversation, fetchLastMessage} from '../hooks/useConversations';
import {useMessages} from '../hooks/useMessages';
import {useMarkAsRead} from '../hooks/useMarkAsRead';
import {useFileUpload} from '../hooks/useFileUpload';
import {useAuthStore} from '../../../stores/authStore';
import {useUnreadStore} from '../../../stores/unreadStore';
import {useUnreadCount} from '../hooks/useUnreadCount';
import {ConversationItem} from '../components/ConversationItem';
import {MessageBubble} from '../components/MessageBubble';
import {ChatInput} from '../components/ChatInput';
import {EmptyState} from '../../../shared/components/EmptyState';
import {supabase} from '../../../config/supabase';
import {colors} from '../../../config/colors';
import type {Message, DisplayMessage, PendingUploadMessage} from '../../../types/database';


const SPLIT_BREAKPOINT = 600;

interface SelectedChat {
  conversationId: string;
  title: string;
}

function ChatPanel({
  conversationId,
  title,
  onBack,
  onArchive,
  isArchived,
}: {
  conversationId: string;
  title: string;
  onBack?: () => void;
  onArchive?: () => void;
  isArchived?: boolean;
}) {
  const {t} = useTranslation();
  const userId = useAuthStore(s => s.session?.user.id);
  const {messages, loading, sendMessage, sendFileMessage} = useMessages(conversationId);
  const listRef = useRef<FlatList>(null);
  const [chatBlocked, setChatBlocked] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadMessage[]>([]);
  const {uploadFile} = useFileUpload();
  const markRead = useMarkAsRead(conversationId);
  const [showMenu, setShowMenu] = useState(false);

  // Stable refs for viewability callback
  const markReadRef = useRef(markRead);
  markReadRef.current = markRead;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const viewabilityConfig = useRef({itemVisiblePercentThreshold: 50}).current;

  const onViewableItemsChanged = useRef(
    ({viewableItems}: {viewableItems: ViewToken[]}) => {
      const hasUnread = viewableItems.some(({item}: {item: Message}) =>
        item.sender_id !== userIdRef.current && !item.read_at,
      );
      if (hasUnread) {
        markReadRef.current();
      }
    },
  ).current;

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const {data: conv} = await supabase
        .from('conversations')
        .select('order_id, master_id')
        .eq('id', conversationId)
        .single();
      if (!conv) return;
      const {data: response} = await supabase
        .from('responses')
        .select('chat_blocked')
        .eq('order_id', conv.order_id)
        .eq('master_id', conv.master_id)
        .single();
      if (response?.chat_blocked) {
        setChatBlocked(true);
      } else {
        setChatBlocked(false);
      }
    })();
  }, [conversationId, userId]);

  const handleSendFileStart = useCallback(
    (file: File, text: string | null) => {
      if (!userId) return;
      const tempId = `temp-${Date.now()}`;
      const pending: PendingUploadMessage = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: userId,
        text,
        file_url: null,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        read_at: null,
        created_at: new Date().toISOString(),
        _uploading: true,
        _progress: 0,
      };
      setPendingUploads(prev => [...prev, pending]);

      uploadFile(file, conversationId, (pct) => {
        setPendingUploads(prev =>
          prev.map(p => (p.id === tempId ? {...p, _progress: pct} : p)),
        );
      }).then(result => {
        setPendingUploads(prev => prev.filter(p => p.id !== tempId));
        if (result) {
          sendFileMessage({
            text,
            fileUrl: result.fileUrl,
            fileName: result.fileName,
            fileType: result.fileType,
            fileSize: result.fileSize,
          });
        }
      });
    },
    [conversationId, userId, uploadFile, sendFileMessage],
  );

  const displayMessages: DisplayMessage[] = [...messages, ...pendingUploads];

  // Auto-scroll when new messages arrive
  const prevCount = useRef(0);
  useEffect(() => {
    if (displayMessages.length > prevCount.current) {
      setTimeout(() => listRef.current?.scrollToEnd({animated: true}), 50);
    }
    prevCount.current = displayMessages.length;
  }, [displayMessages.length]);

  return (
    <View style={styles.chatPanel}>
      <View style={styles.chatHeader}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>{'\u2039'}</Text>
          </Pressable>
        )}
        <Text style={styles.chatHeaderTitle} numberOfLines={1}>{title}</Text>
        {onArchive && (
          <View style={styles.menuContainer}>
            <Pressable onPress={() => setShowMenu(!showMenu)} style={styles.menuBtn}>
              <Text style={styles.menuBtnText}>{'\u22EE'}</Text>
            </Pressable>
            {showMenu && (
              <View style={styles.dropdown}>
                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowMenu(false);
                    onArchive();
                  }}>
                  <Text style={styles.dropdownText}>
                    {isArchived ? t('chat.fromArchive') : t('chat.toArchive')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.chatBg as any}>
        <View style={styles.centerColumn}>
          <FlatList
            ref={listRef}
            data={displayMessages}
            keyExtractor={item => item.id}
            renderItem={({item}: {item: DisplayMessage}) => {
              const isUploading = '_uploading' in item;
              return (
                <MessageBubble
                  text={item.text}
                  createdAt={item.created_at}
                  isMine={item.sender_id === userId}
                  fileName={item.file_name}
                  fileUrl={item.file_url}
                  fileType={item.file_type}
                  fileSize={item.file_size}
                  uploadProgress={isUploading ? item._progress : undefined}
                  status={item.sender_id === userId ? (item.read_at ? 'read' : 'sent') : undefined}
                />
              );
            }}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<EmptyState message={t('chat.noMessages')} />}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({animated: false})
            }
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />

          {chatBlocked ? (
            <View style={styles.blockedBar}>
              <Text style={styles.blockedText}>{t('chat.chatClosed')}</Text>
            </View>
          ) : (
            <ChatInput onSend={sendMessage} onSendFileStart={handleSendFileStart} />
          )}
        </View>
      </View>
    </View>
  );
}

function ConversationList({
  data,
  loading,
  refetch,
  lastMessages,
  selected,
  onSelect,
  showArchived,
  onToggleArchived,
  onArchive,
  onLongPress,
  archivedTotal,
}: {
  data: any[] | null;
  loading: boolean;
  refetch: () => void;
  lastMessages: Record<string, string>;
  selected: SelectedChat | null;
  onSelect: (chat: SelectedChat) => void;
  showArchived: boolean;
  onToggleArchived: () => void;
  onArchive: (id: string) => void;
  onLongPress: (id: string) => void;
  archivedTotal: number;
}) {
  const {t} = useTranslation();
  const role = useAuthStore(s => s.role);
  const counts = useUnreadStore(s => s.counts);

  return (
    <>
      <View style={styles.listHeader}>
        {showArchived && (
          <Pressable onPress={onToggleArchived} style={styles.listBackBtn}>
            <Text style={styles.listBackText}>{'\u2190'}</Text>
          </Pressable>
        )}
        <Text style={styles.title}>
          {showArchived ? t('chat.archived') : t('chat.chats')}
        </Text>
      </View>
      <FlatList
        data={data}
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
              active={selected?.conversationId === item.id}
              isArchived={showArchived}
              onPress={() =>
                onSelect({conversationId: item.id, title: name})
              }
              onArchive={() => onArchive(item.id)}
              onLongPress={() => onLongPress(item.id)}
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            message={showArchived ? t('chat.noArchivedChats') : t('chat.noChats')}
          />
        }
        ListFooterComponent={
          !showArchived ? (
            <Pressable style={styles.archiveListBtn} onPress={onToggleArchived}>
              <Text style={styles.archiveListBtnText}>{t('chat.archive')}</Text>
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
    </>
  );
}

export function ChatWebLayout() {
  const {t} = useTranslation();
  const {width} = useWindowDimensions();
  const {archivedTotal} = useUnreadCount();
  const [showArchived, setShowArchived] = useState(false);
  const {data, loading, refetch} = useConversations(
    showArchived ? 'archived' : 'active',
  );
  const {archiveConversation} = useArchiveConversation();
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<SelectedChat | null>(null);
  const [menuConvId, setMenuConvId] = useState<string | null>(null);

  const isSplit = width >= SPLIT_BREAKPOINT;

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
    if (selected?.conversationId === conversationId) {
      setSelected(null);
    }
    refetch();
  };

  const toggleArchived = () => {
    setShowArchived(prev => !prev);
    setSelected(null);
  };

  // Narrow screen — mobile-like layout
  if (!isSplit) {
    if (selected) {
      return (
        <View style={styles.root}>
          <ChatPanel
            key={selected.conversationId}
            conversationId={selected.conversationId}
            title={selected.title}
            onBack={() => setSelected(null)}
            onArchive={() => handleArchive(selected.conversationId)}
            isArchived={showArchived}
          />
        </View>
      );
    }
    return (
      <View style={styles.mobileRoot}>
        <ConversationList
          data={data as any[] | null}
          loading={loading}
          refetch={refetch}
          lastMessages={lastMessages}
          selected={selected}
          onSelect={setSelected}
          showArchived={showArchived}
          onToggleArchived={toggleArchived}
          onArchive={handleArchive}
          onLongPress={setMenuConvId}
          archivedTotal={archivedTotal}
        />
        {/* Context menu (no Modal to avoid aria-hidden) */}
        {!!menuConvId && (
          <Pressable style={styles.overlay} onPress={() => setMenuConvId(null)}>
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
    );
  }

  // Wide screen — split-view
  return (
    <View style={styles.splitRoot}>
      <View style={styles.leftPanel}>
        <ConversationList
          data={data as any[] | null}
          loading={loading}
          refetch={refetch}
          lastMessages={lastMessages}
          selected={selected}
          onSelect={setSelected}
          showArchived={showArchived}
          onToggleArchived={toggleArchived}
          onArchive={handleArchive}
          onLongPress={setMenuConvId}
          archivedTotal={archivedTotal}
        />
      </View>

      {selected ? (
        <ChatPanel
          key={selected.conversationId}
          conversationId={selected.conversationId}
          title={selected.title}
          onArchive={() => handleArchive(selected.conversationId)}
          isArchived={showArchived}
        />
      ) : (
        <View style={styles.emptyPanel}>
          <View style={styles.emptyBg as any}>
            <Text style={styles.emptyText}>{t('chat.selectChat')}</Text>
          </View>
        </View>
      )}

      {/* Context menu (no Modal to avoid aria-hidden) */}
      {!!menuConvId && (
        <Pressable style={styles.overlay} onPress={() => setMenuConvId(null)}>
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
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  mobileRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  splitRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: 340,
    backgroundColor: colors.bg,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.separator,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listBackBtn: {
    marginRight: 8,
    padding: 4,
  },
  listBackText: {
    fontSize: 22,
    color: colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  archiveListBtn: {
    flexDirection: 'row',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  archiveListBtnText: {
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
  chatPanel: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    backgroundColor: colors.bg,
  },
  backButton: {
    marginRight: 8,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 28,
    color: colors.primary,
    lineHeight: 28,
    marginTop: -2,
  },
  chatHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  menuContainer: {
    position: 'relative',
  },
  menuBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBtnText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  dropdown: {
    position: 'absolute',
    top: 34,
    right: 0,
    backgroundColor: colors.bg,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 140,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 15,
    color: colors.text,
  },
  chatBg: {
    flex: 1,
    backgroundImage: 'linear-gradient(180deg, #D1E8FF 0%, #E8F0FE 40%, #F7ECDE 100%)',
    alignItems: 'center',
  },
  centerColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 700,
  },
  list: {
    padding: 12,
    paddingBottom: 4,
    flexGrow: 1,
  },
  blockedBar: {
    padding: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#FECACA',
  },
  blockedText: {
    fontSize: 14,
    color: colors.red,
    fontWeight: '500',
  },
  emptyPanel: {
    flex: 1,
  },
  emptyBg: {
    flex: 1,
    backgroundImage: 'linear-gradient(180deg, #D1E8FF 0%, #E8F0FE 40%, #F7ECDE 100%)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
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
