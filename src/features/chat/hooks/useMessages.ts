import {useCallback, useEffect, useState} from 'react';
import {supabase} from '../../../config/supabase';
import {useAuthStore} from '../../../stores/authStore';
import type {Message} from '../../../types/database';

export function useMessages(conversationId: string) {
  const userId = useAuthStore(s => s.session?.user.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    const {data} = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', {ascending: true});
    if (data) {
      setMessages(data);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          setMessages(prev => [...prev, payload.new as Message]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        payload => {
          const updated = payload.new as Message;
          setMessages(prev =>
            prev.map(m => (m.id === updated.id ? updated : m)),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!userId) {
        return;
      }
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        text,
      });
    },
    [conversationId, userId],
  );

  const sendFileMessage = useCallback(
    async (params: {
      text?: string | null;
      fileUrl: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    }) => {
      if (!userId) return;
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        text: params.text || null,
        file_url: params.fileUrl,
        file_name: params.fileName,
        file_type: params.fileType,
        file_size: params.fileSize,
      });
    },
    [conversationId, userId],
  );

  return {messages, loading, sendMessage, sendFileMessage, refetch: fetchMessages};
}
