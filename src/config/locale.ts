import {getLocales} from 'react-native-localize';

export function getDeviceLanguage(): string {
  return getLocales()[0]?.languageCode ?? 'ru';
}
