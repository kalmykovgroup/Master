import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import {getDeviceLanguage} from '../config/locale';
import en from './locales/en.json';
import ru from './locales/ru.json';

const deviceLanguage = getDeviceLanguage();

i18n.use(initReactI18next).init({
  resources: {
    ru: {translation: ru},
    en: {translation: en},
  },
  lng: deviceLanguage === 'ru' ? 'ru' : 'en',
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
