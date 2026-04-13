// Jest mock for @react-native-firebase/messaging
const messaging = () => ({
  requestPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
  onTokenRefresh: jest.fn().mockReturnValue(jest.fn()),
  onMessage: jest.fn().mockReturnValue(jest.fn()),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  onNotificationOpenedApp: jest.fn().mockReturnValue(jest.fn()),
  setBackgroundMessageHandler: jest.fn(),
});

messaging.AuthorizationStatus = {
  AUTHORIZED: 1,
  PROVISIONAL: 2,
  DENIED: 0,
  NOT_DETERMINED: -1,
};

module.exports = messaging;
module.exports.default = messaging;
