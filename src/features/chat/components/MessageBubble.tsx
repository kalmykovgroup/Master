import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {formatTime} from '../../../shared/utils/formatDate';
import {colors} from '../../../config/colors';
import {FileMessageContent} from './FileMessageContent';

interface MessageBubbleProps {
  text: string | null;
  createdAt: string;
  isMine: boolean;
  fileName?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  uploadProgress?: number;
  status?: 'sent' | 'read';
  testID?: string;
}

const EMOJI_REGEX = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f\s]+$/u;

function isEmojiOnly(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 20) return false;
  return EMOJI_REGEX.test(trimmed);
}

function isImage(type?: string | null) {
  return type?.startsWith('image/');
}

function CheckMark({status}: {status?: 'sent' | 'read'}) {
  if (!status) return null;
  const color = status === 'read' ? colors.checkBlue : colors.checkGrey;
  return (
    <View style={styles.checkWrap}>
      <Text style={[styles.check, {color}]}>{'\u2713'}</Text>
      <Text style={[styles.check, styles.checkSecond, {color}]}>{'\u2713'}</Text>
    </View>
  );
}

export function MessageBubble({text, createdAt, isMine, fileName, fileUrl, fileType, fileSize, uploadProgress, status, testID}: MessageBubbleProps) {
  const timeStr = formatTime(createdAt);
  const checkStr = isMine ? ' \u2713\u2713' : '';
  const metaText = ` ${timeStr}${checkStr}`;
  const emojiOnly = !!text && !fileUrl && uploadProgress === undefined && isEmojiOnly(text);

  // Emoji-only message
  if (emojiOnly) {
    const emojiProps = Platform.OS === 'web'
      ? {className: 'emoji-text'} as any
      : {};
    return (
      <View
        testID={testID}
        style={[styles.emojiContainer, isMine ? styles.mineAlign : styles.theirsAlign]}>
        <Text style={styles.emojiText} {...emojiProps}>{text}</Text>
        <View style={styles.emojiMeta}>
          <Text style={[styles.time, isMine && styles.mineTime]}>{timeStr}</Text>
          <CheckMark status={isMine ? status : undefined} />
        </View>
      </View>
    );
  }

  // File message (uploaded or uploading)
  const hasFile = fileUrl || uploadProgress !== undefined;
  if (hasFile) {
    return (
      <View
        testID={testID}
        style={[styles.container, isMine ? styles.mine : styles.theirs]}>
        {isImage(fileType) && fileUrl ? (
          <View style={styles.imageWrap}>
            {Platform.OS === 'web' ? (
              <img
                src={fileUrl}
                alt={fileName ?? ''}
                style={{maxWidth: '100%', maxHeight: 240, borderRadius: 8, display: 'block'}}
              />
            ) : (
              <Text style={styles.fileLabel}>{fileName ?? 'Image'}</Text>
            )}
          </View>
        ) : (
          <FileMessageContent
            fileUrl={fileUrl ?? null}
            fileName={fileName ?? 'File'}
            fileType={fileType ?? ''}
            fileSize={fileSize ?? 0}
            uploadProgress={uploadProgress}
          />
        )}
        {text ? (
          <Text style={styles.text}>
            {text}
            <Text style={styles.spacer}>{metaText}</Text>
          </Text>
        ) : null}
        <View style={styles.fileMeta}>
          <Text style={[styles.time, isMine && styles.mineTime]}>{timeStr}</Text>
          <CheckMark status={isMine ? status : undefined} />
        </View>
      </View>
    );
  }

  // Regular text message
  return (
    <View
      testID={testID}
      style={[styles.container, isMine ? styles.mine : styles.theirs]}>
      <Text style={styles.text}>
        {text}
        <Text style={styles.spacer}>{metaText}</Text>
      </Text>
      <View style={styles.meta as any}>
        <Text style={[styles.time, isMine && styles.mineTime]}>{timeStr}</Text>
        <CheckMark status={isMine ? status : undefined} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '75%',
    paddingHorizontal: 8,
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 12,
    marginBottom: 2,
  },
  mine: {
    backgroundColor: '#EFFFDE',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirs: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 20,
  },
  spacer: {
    fontSize: 11,
    color: 'transparent',
  },
  meta: {
    position: 'absolute',
    bottom: 4,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  time: {
    fontSize: 11,
    color: '#8E8E93',
  },
  mineTime: {
    color: '#6CC264',
  },
  checkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  check: {
    fontSize: 11,
  },
  checkSecond: {
    marginLeft: -4,
  },
  // emoji-only
  emojiContainer: {
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  mineAlign: {
    alignSelf: 'flex-end',
  },
  theirsAlign: {
    alignSelf: 'flex-start',
  },
  emojiText: {
    fontSize: 40,
    lineHeight: 48,
  },
  emojiMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    marginTop: -2,
  },
  // file message
  imageWrap: {
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fileLabel: {
    fontSize: 14,
    color: '#007AFF',
    flex: 1,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
});
