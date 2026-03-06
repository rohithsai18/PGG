import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import AppHeader from '../../src/components/AppHeader';

export default function TabsLayout() {
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  if (!token) {
    return <Redirect href="/login" />;
  }

  const getTabIcon = (routeName: string, focused: boolean) => {
    switch (routeName) {
      case 'index':
        return <Feather name="home" size={20} color={focused ? '#856d47' : '#64748b'} />;
      case 'units':
        return <Feather name="grid" size={20} color={focused ? '#856d47' : '#64748b'} />;
      case 'properties':
        return <Feather name="briefcase" size={20} color={focused ? '#856d47' : '#64748b'} />;
      case 'documents':
        return <Feather name="file-text" size={20} color={focused ? '#856d47' : '#64748b'} />;
      case 'profile':
        return <Feather name="user" size={20} color={focused ? '#856d47' : '#64748b'} />;
      default:
        return <Feather name="circle" size={20} color={focused ? '#856d47' : '#64748b'} />;
    }
  };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        header: ({ options, navigation, back }) => {
          const isHomeTab = route.name === 'index';
          const canGoBack = Boolean(back) || !isHomeTab;
          const onBack = () => {
            if (back) {
              navigation.goBack();
              return;
            }
            if (!isHomeTab) {
              (navigation as any).navigate('index');
            }
          };

          return (
            <AppHeader
              title={(options.title as string) ?? ''}
              subtitle="Real Estate Dashboard"
              canGoBack={canGoBack}
              onBack={onBack}
            />
          );
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#856d47',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 0
        },
        tabBarIconStyle: {
          marginTop: 0
        },
        tabBarItemStyle: {
          borderRadius: 10,
          marginHorizontal: 3,
          marginTop: 4
        },
        tabBarActiveBackgroundColor: '#f6f1e8',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: 58 + Math.max(insets.bottom, 6),
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 6),
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          backgroundColor: '#ffffff',
          elevation: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#0f172a',
              shadowOpacity: 0.08,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: -3 }
            }
          })
        },
        tabBarIcon: ({ focused }) => getTabIcon(route.name, focused)
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="units" options={{ title: 'Available Units', tabBarLabel: 'Units' }} />
      <Tabs.Screen name="properties" options={{ title: 'My Properties', tabBarLabel: 'Properties' }} />
      <Tabs.Screen name="documents" options={{ title: 'KYC Details', tabBarLabel: 'Documents' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
    </Tabs>
  );
}
