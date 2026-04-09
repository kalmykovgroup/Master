import type {NavigatorScreenParams} from '@react-navigation/native';

export type AuthStackParamList = {
  PhoneEntry: undefined;
  OtpVerify: {phone: string};
};

export type OrderFeedStackParamList = {
  OrderFeed: undefined;
  OrderDetail: {orderId: string};
};

export type ClientOrdersStackParamList = {
  MyOrders: undefined;
  CreateOrder: undefined;
  OrderDetail: {orderId: string};
  ResponsesList: {orderId: string; orderTitle: string};
  EditOrder: {orderId: string};
  SpecialistProfile: {userId: string};
};

export type MasterOrdersStackParamList = {
  MasterOrders: undefined;
  OrderDetail: {orderId: string};
};

export type SpecialistsStackParamList = {
  SpecialistsList: undefined;
  SpecialistProfile: {userId: string};
};

export type ChatStackParamList = {
  ChatList: undefined;
  Chat: {conversationId: string; title?: string};
};

export type ProfileStackParamList = {
  MyProfile: undefined;
  ReviewsList: {userId: string};
  MyResponses: undefined;
  MasterOnboarding: undefined;
};

export type UnifiedTabParamList = {
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
  ChatsTab: NavigatorScreenParams<ChatStackParamList>;
  MyOrdersTab: NavigatorScreenParams<ClientOrdersStackParamList>;
  MasterOrdersTab: NavigatorScreenParams<MasterOrdersStackParamList>;
  SpecialistsTab: NavigatorScreenParams<SpecialistsStackParamList>;
  OrderFeedTab: NavigatorScreenParams<OrderFeedStackParamList>;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<UnifiedTabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
