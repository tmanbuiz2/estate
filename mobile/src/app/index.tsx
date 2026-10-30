import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, Switch } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { demoListings } from '../../../packages/domain/demo.mjs';
import { filterListings, monthlyCost } from '../../../packages/domain/index.mjs';
import { useSaved } from '../state';
import { styles as s, money } from '../styles';

export default function Discover() {
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState('');
  const [onlySaved, setOnlySaved] = useState(false);
  const { saved, toggle } = useSaved();
  const homes = useMemo(() => filterListings(demoListings, { query, maxTotal: budget, sort: 'price' }).filter(l => !onlySaved || saved.includes(l.id)), [query, budget, onlySaved, saved]);
  return <SafeAreaView style={s.screen} edges={['bottom']}><ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><Text style={s.eyebrow}>NEW BRUNSWICK · PROTOTYPE</Text><Text style={s.title}>A better place{ '\n' }to begin.</Text><Text style={s.subtitle}>Clearer costs. A simpler way to explore your next home.</Text><Text style={s.note}>Fictional inventory. No live listings, applications, bookings or payments. Saved homes last for this app session only.</Text><Text style={s.label}>City or neighbourhood</Text><TextInput style={s.input} accessibilityLabel="Search city or neighbourhood" value={query} onChangeText={setQuery} placeholder="Fredericton or Northside" /><Text style={s.label}>Maximum monthly total · CAD</Text><TextInput style={s.input} accessibilityLabel="Maximum estimated monthly total in Canadian dollars" keyboardType="number-pad" value={budget} onChangeText={v => setBudget(v.replace(/[^0-9]/g, '').slice(0, 7))} placeholder="Any budget" /><View style={s.row}><Text style={s.label}>Saved homes only ({saved.length})</Text><Switch accessibilityLabel="Show saved homes only" value={onlySaved} onValueChange={setOnlySaved} trackColor={{ true: '#849c58' }} /></View><Text style={s.subtitle}>{homes.length} sample homes · estimates included</Text>{homes.map(l => <View key={l.id} style={s.card}><Text style={s.eyebrow}>SAMPLE HOME · {l.neighbourhood.toUpperCase()}</Text><Text style={s.cardTitle}>{l.title}</Text><Text style={s.subtitle}>{l.bedrooms} bedrooms · {l.bathrooms} bathroom{l.bathrooms > 1 ? 's' : ''}</Text><Text style={s.price}>{money(monthlyCost(l).total ?? l.rent)}<Text style={s.subtitle}> / month est.</Text></Text><Text style={s.subtitle}>{money(l.rent)} rent + itemized extra costs</Text><View style={s.row}><Link href={{ pathname: '/home/[id]', params: { id: l.id } }} style={s.link}>View cost breakdown</Link><Pressable onPress={() => toggle(l.id)} accessibilityRole="button" accessibilityLabel={`${saved.includes(l.id) ? 'Unsave' : 'Save'} ${l.title}`} accessibilityState={{ selected: saved.includes(l.id) }} style={s.button}><Text style={s.buttonText}>{saved.includes(l.id) ? 'Saved ♥' : 'Save ♡'}</Text></Pressable></View></View>)}{!homes.length && <Text style={s.note}>No sample homes match. Try changing the budget or search.</Text>}<Link href="/privacy" style={s.link}>Privacy & demo data</Link></ScrollView></SafeAreaView>;
}
