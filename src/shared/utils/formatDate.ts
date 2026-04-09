import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ru';

dayjs.extend(relativeTime);

export function formatDate(date: string): string {
  return dayjs(date).format('DD.MM.YYYY');
}

export function formatDateTime(date: string): string {
  return dayjs(date).format('DD.MM.YYYY HH:mm');
}

export function formatRelative(date: string, locale: string = 'ru'): string {
  return dayjs(date).locale(locale).fromNow();
}

export function formatTime(date: string): string {
  return dayjs(date).format('HH:mm');
}
