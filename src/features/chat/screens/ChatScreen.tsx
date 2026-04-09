import React, {useCallback, useEffect, useRef, useState} from 'react';
import {FlatList, ImageBackground, Platform, StyleSheet, Text, View} from 'react-native';
import type {ViewToken} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useMessages} from '../hooks/useMessages';
import {useMarkAsRead} from '../hooks/useMarkAsRead';
import {useFileUpload} from '../hooks/useFileUpload';
import {useAuthStore} from '../../../stores/authStore';
import {MessageBubble} from '../components/MessageBubble';
import {ChatInput} from '../components/ChatInput';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import {supabase} from '../../../config/supabase';
import type {ChatStackParamList} from '../../../types/navigation';
import type {Message, DisplayMessage, PendingUploadMessage} from '../../../types/database';
import {useTranslation} from 'react-i18next';

const chatBgImage = require('../../../assets/chat-bg.jpg');

type Props = NativeStackScreenProps<ChatStackParamList, 'Chat'>;

export function ChatScreen({route}: Props) {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {conversationId} = route.params;
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

  // Check if chat is blocked for this master
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
        {Platform.OS === 'web' ? (
          <View style={styles.chatBg}>
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
          </ImageBackground>
        )}
        {chatBlocked ? (
          <View style={styles.blockedBar}>
            <Text style={styles.blockedText}>{t('orders.chatBlocked')}</Text>
          </View>
        ) : (
          <ChatInput onSend={sendMessage} onSendFileStart={handleSendFileStart} />
        )}
        <View style={{height: insets.bottom}} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatBg: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? {
          backgroundImage: `url(${chatBgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : {}),
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
    color: '#FF3B30',
    fontWeight: '500',
  },
});
