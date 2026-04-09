import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useConversations, fetchLastMessage} from '../hooks/useConversations';
import {useAuthStore} from '../../../stores/authStore';
import {useUnreadStore} from '../../../stores/unreadStore';
import {ConversationItem} from '../components/ConversationItem';
import {LoadingScreen} from '../../../shared/components/LoadingScreen';
import {EmptyState} from '../../../shared/components/EmptyState';
import {ScreenWrapper} from '../../../shared/components/ScreenWrapper';
import type {ChatStackParamList} from '../../../types/navigation';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

export function ChatListScreen() {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const role = useAuthStore(s => s.role);
  const {data, loading, refetch} = useConversations();
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const counts = useUnreadStore(s => s.counts);

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

  if (loading && !data) {
    return <LoadingScreen />;
  }

  return (
    <ScreenWrapper>
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <Text style={styles.title}>{t('chat.chats')}</Text>
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
                onPress={() =>
                  navigation.navigate('Chat', {
                    conversationId: item.id,
                    title: name,
                  })
                }
              />
            );
          }}
          ListEmptyComponent={<EmptyState message={t('chat.noChats')} />}
          onRefresh={refetch}
          refreshing={loading}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
});
