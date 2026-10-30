import { StyleSheet } from 'react-native';
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f7f1' },
  content: { padding: 22, paddingBottom: 55, gap: 16 },
  eyebrow: { color: '#657b49', fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#183f35', fontSize: 38, fontWeight: '600', lineHeight: 43, letterSpacing: -1.2 },
  subtitle: { color: '#606b62', fontSize: 14, lineHeight: 22 },
  note: { padding: 13, backgroundColor: '#e8edda', borderRadius: 8, color: '#344b34', fontSize: 12, lineHeight: 19 },
  input: { borderWidth: 1, borderColor: '#cbd4c2', backgroundColor: '#fff', borderRadius: 9, padding: 14, color: '#20372f', fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  card: { borderWidth: 1, borderColor: '#dce1d6', borderRadius: 14, padding: 21, backgroundColor: '#fff', gap: 12 },
  cardTitle: { color: '#20372f', fontSize: 20, fontWeight: '600' },
  price: { color: '#183f35', fontSize: 27, fontWeight: '700' },
  button: { padding: 14, backgroundColor: '#183f35', borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  link: { color: '#183f35', textDecorationLine: 'underline', fontWeight: '600', fontSize: 14, paddingVertical: 8 },
  label: { color: '#20372f', fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#dce1d6', marginVertical: 5 }
});
export const money = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
