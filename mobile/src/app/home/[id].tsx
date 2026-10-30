import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoListings } from '../../../../packages/domain/demo.mjs';
import { monthlyCost } from '../../../../packages/domain/index.mjs';
import { styles as s, money } from '../../styles';
export default function Home() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const home = demoListings.find(l => l.id === id);
  if (!home) return <View style={s.content}><Text style={s.title}>Home not found</Text><Link href="/" style={s.link}>Back to homes</Link></View>;
  const cost = monthlyCost(home);
  return <SafeAreaView style={s.screen} edges={['bottom']}><ScrollView contentContainerStyle={s.content}><Text style={s.eyebrow}>FICTIONAL HOME · FREDERICTON</Text><Text style={s.title}>{home.title}</Text><Text style={s.subtitle}>{home.description}</Text><View style={s.card}><Text style={s.cardTitle}>The whole monthly picture</Text><View style={s.row}><Text style={s.subtitle}>Base rent</Text><Text style={s.label}>{money(home.rent)}</Text></View>{Object.entries(home.costs).map(([name, item]) => <View key={name} style={s.row}><Text style={s.subtitle}>{name}{'estimated' in item && item.estimated ? ' · estimate' : ''}</Text><Text style={s.label}>{'included' in item && item.included ? 'Included' : 'amount' in item && typeof item.amount === 'number' ? money(item.amount) : 'Not provided'}</Text></View>)}<View style={s.divider} /><Text style={s.price}>{money(cost.total ?? home.rent)} CAD</Text><Text style={s.subtitle}>Estimated monthly total. Personal insurance, internet and moving costs are excluded.</Text></View><Text style={s.note}>Identity: sample only. Authority to rent: not checked. Safety: not inspected. No viewing can be booked through this prototype.</Text><Link href="/" style={s.link}>Back to homes</Link></ScrollView></SafeAreaView>;
}
