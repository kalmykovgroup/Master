/**
 * Telegram-style color palette (iOS)
 */
export const colors = {
  // Role-based accent (single source of truth)
  clientAccent: '#007AFF',
  masterAccent: '#0055CC',

  // Primary (alias — use accent() for role-aware code)
  primary: '#007AFF',
  primaryDark: '#0055CC',
  primaryLight: '#E5F1FF',

  // Text
  text: '#000000',
  textSecondary: '#8E8E93',
  textTertiary: '#AEAEB2',

  // Backgrounds
  bg: '#FFFFFF',
  bgSecondary: '#F2F2F7',
  bgPressed: '#E5E5EA',

  // Borders
  separator: '#C6C6C8',
  separatorLight: '#E5E5EA',

  // Status
  green: '#34C759',
  red: '#FF3B30',
  orange: '#FF9500',
  yellow: '#FFCC00',

  // Chat
  chatBgNative: '#C8DFE8',
  outgoingBubble: '#EFFFDE',
  outgoingTime: '#6CC264',
  incomingBubble: '#FFFFFF',
  checkGrey: '#8E8E93',
  checkBlue: '#4DA6FF',

  // Badges
  badge: '#007AFF',
  badgeRed: '#FF3B30',

  // Status badges
  statusPendingBg: '#E5F1FF',
  statusPendingText: '#007AFF',
  statusAcceptedBg: '#E8FAE8',
  statusAcceptedText: '#34C759',
  statusRejectedBg: '#FFEEEE',
  statusRejectedText: '#FF3B30',
} as const;
