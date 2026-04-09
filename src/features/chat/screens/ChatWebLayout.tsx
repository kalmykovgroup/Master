import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import type {ViewToken} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useConversations, fetchLastMessage} from '../hooks/useConversations';
import {useMessages} from '../hooks/useMessages';
import {useMarkAsRead} from '../hooks/useMarkAsRead';
import {useFileUpload} from '../hooks/useFileUpload';
import {useAuthStore} from '../../../stores/authStore';
import {useUnreadStore} from '../../../stores/unreadStore';
import {ConversationItem} from '../components/ConversationItem';
import {MessageBubble} from '../components/MessageBubble';
import {ChatInput} from '../components/ChatInput';
import {EmptyState} from '../../../shared/components/EmptyState';
import {supabase} from '../../../config/supabase';
import type {Message, DisplayMessage, PendingUploadMessage} from '../../../types/database';

const chatBgImage = require('../../../assets/chat-bg.jpg');

const SPLIT_BREAKPOINT = 600;

interface SelectedChat {
  conversationId: string;
  title: string;
}

function ChatPanel({
  conversationId,
  title,
  onBack,
}: {
  conversationId: string;
  title: string;
  onBack?: () => void;
}) {
  const {t} = useTranslation();
  const userId = useAuthStore(s => s.session?.user.id);
  const role = useAuthStore(s => s.role);
  const {messages, loading, sendMessage, sendFileMessage} = useMessages(conversationId);
  const listRef = useRef<FlatList>(null);
  const [chatBlocked, setChatBlocked] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadMessage[]>([]);
  const {uploadFile} = useFileUpload();
  const markRead = useMarkAsRead(conversationId);

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
    if (role !== 'master' || !userId) return;
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
  }, [conversationId, userId, role]);

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

  return (
    <View style={styles.chatPanel}>
      <View style={styles.chatHeader}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>{'\u2039'}</Text>
          </Pressable>
        )}
        <Text style={styles.chatHeaderTitle} numberOfLines={1}>{title}</Text>
      </View>
      <View style={styles.chatBg as any}>
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
      </View>
      {chatBlocked ? (
        <View style={styles.blockedBar}>
          <Text style={styles.blockedText}>{t('orders.chatBlocked')}</Text>
        </View>
      ) : (
        <ChatInput onSend={sendMessage} onSendFileStart={handleSendFileStart} />
      )}
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
}: {
  data: any[] | null;
  loading: boolean;
  refetch: () => void;
  lastMessages: Record<string, string>;
  selected: SelectedChat | null;
  onSelect: (chat: SelectedChat) => void;
}) {
  const {t} = useTranslation();
  const role = useAuthStore(s => s.role);
  const counts = useUnreadStore(s => s.counts);

  return (
    <>
      <Text style={styles.title}>{t('chat.chats')}</Text>
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
              onPress={() =>
                onSelect({conversationId: item.id, title: name})
              }
            />
          );
        }}
        ListEmptyComponent={<EmptyState message={t('chat.noChats')} />}
        onRefresh={refetch}
        refreshing={loading}
      />
    </>
  );
}

export function ChatWebLayout() {
  const {t} = useTranslation();
  const {width} = useWindowDimensions();
  const {data, loading, refetch} = useConversations();
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<SelectedChat | null>(null);

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
        />
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
        />
      </View>

      {selected ? (
        <ChatPanel
          key={selected.conversationId}
          conversationId={selected.conversationId}
          title={selected.title}
        />
      ) : (
        <View style={styles.emptyPanel}>
          <View style={styles.emptyBg as any}>
            <Text style={styles.emptyText}>{t('chat.selectChat')}</Text>
          </View>
        </View>
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
    backgroundColor: '#FFFFFF',
  },
  splitRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: 340,
    backgroundColor: '#FFFFFF',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#C6C6C8',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  chatPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
    backgroundColor: '#FFFFFF',
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
    color: '#007AFF',
    lineHeight: 28,
    marginTop: -2,
  },
  chatHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  chatBg: {
    flex: 1,
    backgroundImage: `url(${chatBgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
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
    color: '#FF3B30',
    fontWeight: '500',
  },
  emptyPanel: {
    flex: 1,
  },
  emptyBg: {
    flex: 1,
    backgroundImage: `url(${chatBgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
