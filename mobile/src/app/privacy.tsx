import { Pressable, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSaved } from '../state';
import { styles as s } from '../styles';
export default function Privacy() {
  const { saved, clear } = useSaved();
  return <SafeAreaView style={s.screen} edges={['bottom']}><ScrollView contentContainerStyle={s.content}><Text style={s.title}>Your demo data.</Text><Text style={s.subtitle}>This client uses fictional homes bundled with the app. Saved home selections are kept in memory during this app session and are not sent to a server.</Text><Text style={s.subtitle}>There is no account creation, payment collection, identity upload, advertising SDK or analytics integration added by Estate. Development tools and Expo services may make their own development-related network requests.</Text><Text style={s.note}>Saved this session: {saved.length}. Closing the app can clear these selections.</Text><Pressable style={s.button} accessibilityRole="button" onPress={clear}><Text style={s.buttonText}>Clear saved homes</Text></Pressable><Text style={s.subtitle}>A live service requires a reviewed privacy policy, accountable privacy contact, access controls and retention/deletion processes before real information is collected.</Text></ScrollView></SafeAreaView>;
}
