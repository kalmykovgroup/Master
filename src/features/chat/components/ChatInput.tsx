import React, {useCallback, useRef, useState} from 'react';
import {Platform, Pressable, StyleSheet, TextInput, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Smile, Paperclip, ArrowUp} from 'lucide-react-native';
import {FilePreview} from './FilePreview';

interface ChatInputProps {
  onSend: (text: string) => void;
  onSendFileStart?: (file: File, text: string | null) => void;
}

let EmojiPicker: any = null;
if (Platform.OS === 'web') {
  try {
    EmojiPicker = require('emoji-picker-react').default;
  } catch {}
}

const ACCEPTED_FILES = 'image/*,.pdf,.xlsx,.xls,.doc,.docx,.csv,.txt,.zip,.rar';

/* ── Web-only editable div ── */
function WebEditableInput({
  value,
  onChange,
  onSubmit,
  onFocus,
  placeholder,
}: {
  value: string;
  onChange: (t: string) => void;
  onSubmit: () => void;
  onFocus?: () => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isComposing = useRef(false);

  React.useEffect(() => {
    if (!ref.current) return;
    if (ref.current.textContent !== value) {
      ref.current.textContent = value;
      if (value) {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(ref.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [value]);

  return (
    <div
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      onInput={() => {
        const txt = ref.current?.textContent ?? '';
        onChange(txt);
      }}
      onKeyDown={(e: any) => {
        if (e.key === 'Enter' && !e.shiftKey && !isComposing.current) {
          e.preventDefault();
          onSubmit();
        }
      }}
      onCompositionStart={() => { isComposing.current = true; }}
      onCompositionEnd={() => { isComposing.current = false; }}
      onFocus={onFocus}
      data-placeholder={placeholder}
      style={{
        flex: 1,
        fontSize: 15,
        lineHeight: '20px',
        color: '#000000',
        outline: 'none',
        minHeight: 20,
        maxHeight: 120,
        overflowY: 'auto' as any,
        wordBreak: 'break-word' as any,
        caretColor: '#007AFF',
        whiteSpace: 'pre-wrap' as any,
      }}
    />
  );
}

export function ChatInput({onSend, onSendFileStart}: ChatInputProps) {
  const {t} = useTranslation();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleSend = useCallback(() => {
    if (selectedFile && onSendFileStart) {
      onSendFileStart(selectedFile, text.trim() || null);
      setSelectedFile(null);
      setText('');
      setShowEmoji(false);
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
    setShowEmoji(false);
  }, [text, onSend, onSendFileStart, selectedFile]);

  const onEmojiClick = useCallback((emojiData: any) => {
    setText(prev => prev + emojiData.emoji);
  }, []);

  const handleFilePick = useCallback(() => {
    if (Platform.OS === 'web' && fileRef.current) {
      fileRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((e: any) => {
    const file = e.target?.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }, []);

  const handleCancelFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <View>
      {/* ── Панель emoji-picker (появляется над input bar) ── */}
      {showEmoji && EmojiPicker && (
        <View style={styles.emojiPanel}>
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            width="100%"
            height={320}
            searchDisabled
            skinTonesDisabled
            previewConfig={{showPreview: false}}
          />
        </View>
      )}

      {/* ── Превью выбранного файла (над input bar) ── */}
      {selectedFile && (
        <FilePreview
          file={selectedFile}
          onCancel={handleCancelFile}
        />
      )}

      {/* ── Input bar: [☺] [текстовое поле] [📎]  [▲ send] ── */}
      <View style={styles.bar}>

        {/* ── Ряд: кнопка-смайлик + поле ввода + кнопка-скрепка ── */}
        <View style={styles.inputRow}>

          {/* ── Кнопка ☺ (открыть/закрыть emoji-picker) ── */}
          {/* Web: inline div, Native: Pressable+Text */}
          {/* width=H, alignSelf=stretch — растягивается по высоте inputRow */}
          {/* fontSize/lineHeight — размер глифа ☺, для центрирования lineHeight = fontSize */}
          {Platform.OS === 'web' ? (
            <div
              onClick={() => setShowEmoji(v => !v)}
              style={{
                width: H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'stretch',
                cursor: 'pointer',
                flexShrink: 0,
                userSelect: 'none',
              }}>
              <Smile size={24} color={showEmoji ? '#007AFF' : '#8E8E93'} />
            </div>
          ) : (
            <Pressable
              style={styles.sideBtn}
              onPress={() => setShowEmoji(v => !v)}>
              <Smile size={24} color={showEmoji ? '#007AFF' : '#8E8E93'} />
            </Pressable>
          )}

          {/* ── Текстовое поле ввода сообщения ── */}
          {/* Web: contentEditable div (WebEditableInput), Native: TextInput */}
          {Platform.OS === 'web' ? (
            <WebEditableInput
              value={text}
              onChange={setText}
              onSubmit={handleSend}
              onFocus={() => setShowEmoji(false)}
              placeholder={t('chat.inputPlaceholder')}
            />
          ) : (
            <TextInput
              style={styles.nativeInput}
              value={text}
              onChangeText={setText}
              placeholder={t('chat.inputPlaceholder')}
              placeholderTextColor="#8E8E93"
              multiline
              testID="chat-input"
              onFocus={() => setShowEmoji(false)}
            />
          )}

          {/* ── Кнопка 📎 (выбор файла) ── */}
          {/* Аналогична кнопке ☺ по структуре */}
          {Platform.OS === 'web' ? (
            <div
              onClick={handleFilePick}
              style={{
                width: H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'stretch',
                cursor: 'pointer',
                flexShrink: 0,
                userSelect: 'none',
              }}>
              <Paperclip size={24} color="#8E8E93" />
            </div>
          ) : (
            <Pressable style={styles.sideBtn} onPress={handleFilePick}>
              <Paperclip size={24} color="#8E8E93" />
            </Pressable>
          )}
        </View>

        {/* ── Кнопка «Отправить» (синий круг со стрелкой ▲) ── */}
        <View style={styles.sendWrap}>
          <Pressable
            onPress={handleSend}
            style={({pressed}) => [
              styles.sendBtn,
              pressed && styles.sendPressed,
            ]}
            testID="send-btn">
            <ArrowUp size={20} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      {/* ── Скрытый <input type="file"> для web (открывается по клику на 📎) ── */}
      {Platform.OS === 'web' && (
        <input
          ref={fileRef as any}
          type="file"
          accept={ACCEPTED_FILES}
          onChange={handleFileChange}
          style={{display: 'none'}}
        />
      )}
    </View>
  );
}

const H = 40;

const styles = StyleSheet.create({
  /* Весь нижний бар: [inputRow] [sendBtn] */
  bar: {
    flexDirection: 'row',      // inputRow + sendBtn в строку
    alignItems: 'flex-end',    // прижать к низу (когда текстовое поле растёт вверх)
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'transparent',
    gap: 6,                    // отступ между inputRow и sendBtn
  },
  /* Скруглённая капсула: [☺] [поле ввода] [📎] */
  inputRow: {
    flex: 1,                   // занять всё доступное пространство (минус sendBtn)
    flexDirection: 'row',      // элементы в строку
    alignItems: 'center',      // центрировать по вертикали (важно для ☺ и 📎)
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
    borderRadius: H / 2,       // скругление = половина высоты → капсула
    minHeight: H,              // минимальная высота 40
    paddingVertical: 10,       // внутренний отступ сверху/снизу
  },
  /* Кнопка ☺/📎 для Native (Pressable обёртка) */
  sideBtn: {
    width: H,                  // ширина кнопки = H (40)
    alignSelf: 'stretch',      // растянуть на высоту родителя
    justifyContent: 'center',  // центр глифа по вертикали
    alignItems: 'center',      // центр глифа по горизонтали
    flexShrink: 0,
  },
  /* Текстовое поле (Native) */
  nativeInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    maxHeight: 120,            // максимальная высота перед скроллом
    lineHeight: 20,
    textAlignVertical: 'center',
  },
  /* Обёртка кнопки «Отправить» — центрирует кнопку вертикально */
  sendWrap: {
    minHeight: H,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  /* Синяя круглая кнопка «Отправить» */
  sendBtn: {
    width: H,
    height: H,
    borderRadius: H / 2,       // круг
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendPressed: {
    opacity: 0.7,
  },
  /* Панель emoji-picker (над input bar) */
  emojiPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
  },
});
