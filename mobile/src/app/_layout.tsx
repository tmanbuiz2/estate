import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SavedProvider } from '../state';
export default function Layout() {
  return <SafeAreaProvider><SavedProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: '#f7f7f1' }, headerTintColor: '#183f35', headerTitleStyle: { fontWeight: '700' } }}><Stack.Screen name="index" options={{ title: 'estate. by WianTribe' }} /><Stack.Screen name="home/[id]" options={{ title: 'Sample home' }} /><Stack.Screen name="privacy" options={{ title: 'Your demo data' }} /></Stack></SavedProvider></SafeAreaProvider>;
}
