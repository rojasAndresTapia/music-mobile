import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AudioProvider } from './src/context/AudioContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AudioProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AudioProvider>
    </SafeAreaProvider>
  );
}
