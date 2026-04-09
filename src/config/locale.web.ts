export function getDeviceLanguage(): string {
  const lang = navigator.language?.split('-')[0];
  return lang === 'ru' ? 'ru' : 'en';
}
