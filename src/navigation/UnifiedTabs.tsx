import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {useAuthStore} from '../stores/authStore';
import {useUnreadCount} from '../features/chat/hooks/useUnreadCount';
import {useNewMasterOrdersCount, useNewClientResponsesCount} from '../features/orders/hooks/useOrderBadges';

import {RoleBanner} from '../shared/components/RoleBanner';

// Screens
import {MyProfileScreen} from '../features/profile/screens/MyProfileScreen';
import {ReviewsListScreen} from '../features/reviews/screens/ReviewsListScreen';
import {MyResponsesScreen} from '../features/orders/screens/MyResponsesScreen';
import {MasterOnboardingScreen} from '../features/auth/screens/MasterOnboardingScreen';
import {ChatListScreen} from '../features/chat/screens/ChatListScreen';
import {ChatScreen} from '../features/chat/screens/ChatScreen';
import {ChatWebLayout} from '../features/chat/screens/ChatWebLayout';
import {MyOrdersScreen} from '../features/orders/screens/MyOrdersScreen';
import {CreateOrderScreen} from '../features/orders/screens/CreateOrderScreen';
import {OrderDetailScreen} from '../features/orders/screens/OrderDetailScreen';
import {SpecialistsListScreen} from '../features/specialists/screens/SpecialistsListScreen';
import {SpecialistProfileScreen} from '../features/specialists/screens/SpecialistProfileScreen';
import {OrderFeedScreen} from '../features/orders/screens/OrderFeedScreen';
import {ResponsesListScreen} from '../features/orders/screens/ResponsesListScreen';
import {EditOrderScreen} from '../features/orders/screens/EditOrderScreen';
import {MasterOrdersScreen} from '../features/orders/screens/MasterOrdersScreen';

import type {
  UnifiedTabParamList,
  ProfileStackParamList,
  ChatStackParamList,
  ClientOrdersStackParamList,
  MasterOrdersStackParamList,
  SpecialistsStackParamList,
  OrderFeedStackParamList,
} from '../types/navigation';

const Tab = createBottomTabNavigator<UnifiedTabParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const ChatStackNav = createNativeStackNavigator<ChatStackParamList>();
const ClientOrdersStack =
  createNativeStackNavigator<ClientOrdersStackParamList>();
const SpecialistsStack =
  createNativeStackNavigator<SpecialistsStackParamList>();
const MasterOrdersStack =
  createNativeStackNavigator<MasterOrdersStackParamList>();
const OrderFeedStack = createNativeStackNavigator<OrderFeedStackParamList>();

const noHeader = {headerShown: false} as const;

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={noHeader}>
      <ProfileStack.Screen name="MyProfile" component={MyProfileScreen} />
      <ProfileStack.Screen name="ReviewsList" component={ReviewsListScreen} />
      <ProfileStack.Screen name="MyResponses" component={MyResponsesScreen} />
      <ProfileStack.Screen name="MasterOnboarding" component={MasterOnboardingScreen} />
    </ProfileStack.Navigator>
  );
}

function ChatsNavigator() {
  if (Platform.OS === 'web') {
    return <ChatWebLayout />;
  }
  return (
    <ChatStackNav.Navigator screenOptions={noHeader}>
      <ChatStackNav.Screen name="ChatList" component={ChatListScreen} />
      <ChatStackNav.Screen name="Chat" component={ChatScreen} />
    </ChatStackNav.Navigator>
  );
}

function MyOrdersNavigator() {
  return (
    <ClientOrdersStack.Navigator screenOptions={noHeader}>
      <ClientOrdersStack.Screen name="MyOrders" component={MyOrdersScreen} />
      <ClientOrdersStack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
      />
      <ClientOrdersStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
      />
      <ClientOrdersStack.Screen
        name="ResponsesList"
        component={ResponsesListScreen}
      />
      <ClientOrdersStack.Screen
        name="EditOrder"
        component={EditOrderScreen}
      />
      <ClientOrdersStack.Screen
        name="SpecialistProfile"
        component={SpecialistProfileScreen}
      />
    </ClientOrdersStack.Navigator>
  );
}

function SpecialistsNavigator() {
  return (
    <SpecialistsStack.Navigator screenOptions={noHeader}>
      <SpecialistsStack.Screen
        name="SpecialistsList"
        component={SpecialistsListScreen}
      />
      <SpecialistsStack.Screen
        name="SpecialistProfile"
        component={SpecialistProfileScreen}
      />
    </SpecialistsStack.Navigator>
  );
}

function MasterOrdersNavigator() {
  return (
    <MasterOrdersStack.Navigator screenOptions={noHeader}>
      <MasterOrdersStack.Screen
        name="MasterOrders"
        component={MasterOrdersScreen}
      />
      <MasterOrdersStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
      />
    </MasterOrdersStack.Navigator>
  );
}

function OrderFeedNavigator() {
  return (
    <OrderFeedStack.Navigator screenOptions={noHeader}>
      <OrderFeedStack.Screen name="OrderFeed" component={OrderFeedScreen} />
      <OrderFeedStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
      />
    </OrderFeedStack.Navigator>
  );
}

export function UnifiedTabs() {
  const {t} = useTranslation();
  const role = useAuthStore(s => s.role);
  const unreadCount = useUnreadCount();
  const {count: masterBadge} = useNewMasterOrdersCount();
  const {count: clientBadge} = useNewClientResponsesCount();

  return (
    <View style={styles.root}>
      <RoleBanner />
      <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarActiveBackgroundColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: () => null,
        tabBarIconStyle: {height: 0, width: 0, margin: 0, padding: 0},
      }}>
      <Tab.Screen
        name="OrderFeedTab"
        component={OrderFeedNavigator}
        options={{
          tabBarLabel: t('tabs.orderFeed'),
        }}
      />
      <Tab.Screen
        name="SpecialistsTab"
        component={SpecialistsNavigator}
        options={{
          tabBarLabel: t('tabs.specialists'),
        }}
      />
      {role === 'client' && (
        <Tab.Screen
          name="MyOrdersTab"
          component={MyOrdersNavigator}
          options={{
            tabBarLabel: t('tabs.myOrders'),
            tabBarBadge: clientBadge > 0 ? clientBadge : undefined,
            tabBarBadgeStyle: styles.tabBadge,
          }}
        />
      )}
      {role === 'master' && (
        <Tab.Screen
          name="MasterOrdersTab"
          component={MasterOrdersNavigator}
          options={{
            tabBarLabel: t('tabs.inProgress'),
            tabBarBadge: masterBadge > 0 ? masterBadge : undefined,
            tabBarBadgeStyle: styles.tabBadge,
          }}
        />
      )}
      <Tab.Screen
        name="ChatsTab"
        component={ChatsNavigator}
        options={{
          tabBarLabel: t('tabs.chats'),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: styles.tabBadge,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          tabBarLabel: t('tabs.profile'),
        }}
      />
    </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#F8F8F8',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    ...(Platform.OS === 'web' ? {height: 56} : {}),
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabItem: {
    borderRadius: 16,
    marginHorizontal: 2,
    marginVertical: 6,
    justifyContent: 'center' as const,
  },
  tabBadge: {
    backgroundColor: '#FF3B30',
    fontSize: 11,
    fontWeight: '600',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
  },
});
