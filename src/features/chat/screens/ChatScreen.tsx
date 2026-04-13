import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, ImageBackground, Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import type {ViewToken} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMessages} from '../hooks/useMessages';
import {useMarkAsRead} from '../hooks/useMarkAsRead';
import {useFileUpload} from '../hooks/useFileUpload';
import {useArchiveConversation} from '../hooks/useConversations';
import {useAuthStore} from '../../../stores/authStore';
import {MessageBubble} from '../components/MessageBubble';
import {ChatInput} from '../components/ChatInput';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {supabase} from '../../../config/supabase';
import {colors} from '../../../config/colors';
import type {ChatStackParamList} from '../../../types/navigation';
import type {Message, DisplayMessage, PendingUploadMessage} from '../../../types/database';
import {useTranslation} from 'react-i18next';

const chatBgImage = require('../../../assets/chat-bg.jpg');

type Props = NativeStackScreenProps<ChatStackParamList, 'Chat'>;

export function ChatScreen({route, navigation}: Props) {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {conversationId} = route.params;
  const userId = useAuthStore(s => s.session?.user.id);
  const {messages, loading, sendMessage, sendFileMessage} = useMessages(conversationId);
  const {archiveConversation} = useArchiveConversation();
  const listRef = useRef<FlatList>(null);
  const [chatBlocked, setChatBlocked] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUploadMessage[]>([]);
  const {uploadFile} = useFileUpload();
  const markRead = useMarkAsRead(conversationId);
  const [showMenu, setShowMenu] = useState(false);
  const [convStatus, setConvStatus] = useState<string>('active');

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

  // Check if chat is blocked + load conversation status
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const {data: conv} = await supabase
        .from('conversations')
        .select('order_id, master_id, status')
        .eq('id', conversationId)
        .single();
      if (!conv) return;
      setConvStatus(conv.status);

      const {data: response} = await supabase
        .from('responses')
        .select('chat_blocked')
        .eq('order_id', conv.order_id)
        .eq('master_id', conv.master_id)
        .single();
      if (response?.chat_blocked) {
        setChatBlocked(true);
      }
    })();
  }, [conversationId, userId]);

  const handleArchive = async () => {
    const newStatus = convStatus === 'archived' ? 'active' : 'archived';
    await archiveConversation(conversationId, newStatus);
    setShowMenu(false);
    navigation.goBack();
  };

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

  if (loading) {
    return <LoadingScreen />;
  }

  const renderItem = ({item}: {item: DisplayMessage}) => {
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
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        {/* Header with menu button */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{'\u2190'}</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {route.params.title ?? t('chat.chats')}
          </Text>
          <View style={styles.menuContainer}>
            <Pressable onPress={() => setShowMenu(!showMenu)} style={styles.menuBtn}>
              <Text style={styles.menuBtnText}>{'\u22EE'}</Text>
            </Pressable>
            {showMenu && (
              <View style={styles.dropdown}>
                <Pressable
                  style={styles.dropdownItem}
                  onPress={handleArchive}>
                  <Text style={styles.dropdownText}>
                    {convStatus === 'archived'
                      ? t('chat.fromArchive')
                      : t('chat.toArchive')}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {Platform.OS === 'web' ? (
          <View style={styles.chatBg}>
            <View style={styles.centerColumn}>
              <FlatList
                ref={listRef}
                data={displayMessages}
                keyExtractor={item => item.id}
                renderItem={renderItem}
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
        ) : (
          <ImageBackground source={chatBgImage} style={styles.chatBg} resizeMode="cover">
            <FlatList
              ref={listRef}
              data={displayMessages}
              keyExtractor={item => item.id}
              renderItem={renderItem}
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
          </ImageBackground>
        )}
        <View style={{height: insets.bottom}} />
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
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
    backgroundColor: colors.bg,
    zIndex: 10,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  backBtnText: {
    fontSize: 22,
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  menuContainer: {
    position: 'relative',
    zIndex: 20,
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
    zIndex: 30,
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
    ...(Platform.OS === 'web'
      ? {
          backgroundImage: 'linear-gradient(180deg, #D1E8FF 0%, #E8F0FE 40%, #F7ECDE 100%)',
          alignItems: 'center',
        }
      : {}),
  } as any,
  centerColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 700,
  } as any,
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
});
