/**
 * EATECH Mobile App - Root Navigator
 * Version: 25.0.0
 * Description: Haupt-Navigation für die EATECH Admin Mobile App
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/navigation/RootNavigator.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';

// Screens
import LoginScreen from '../screens/LoginScreen';
import WebViewScreen from '../screens/WebViewScreen';
import OfflineScreen from '../screens/OfflineScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Theme
import { THEME } from '../config/constants';

// Create Stack Navigator
const Stack = createStackNavigator();

// ============================================================================
// ROOT NAVIGATOR COMPONENT
// ============================================================================
const RootNavigator = ({ isAuthenticated }) => {
  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? 'WebView' : 'Login'}
      screenOptions={{
        headerStyle: {
          backgroundColor: THEME.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
        },
        headerTintColor: THEME.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        cardStyle: {
          backgroundColor: THEME.colors.background,
        },
        headerBackTitleVisible: false,
      }}
    >
      {/* Authentication Screens */}
      {!isAuthenticated ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false,
              animationTypeForReplace: 'pop',
            }}
          />
        </>
      ) : (
        <>
          {/* Main App Screens */}
          <Stack.Screen
            name="WebView"
            component={WebViewScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          
          <Stack.Screen
            name="Offline"
            component={OfflineScreen}
            options={{
              title: 'Offline Daten',
              presentation: 'modal',
            }}
          />
          
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{
              title: 'Einstellungen',
              presentation: Platform.OS === 'ios' ? 'modal' : 'card',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default RootNavigator;