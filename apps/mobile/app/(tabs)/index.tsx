import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { listMyBookings } from '../../src/services/bookingService';
import { getApiBaseUrl } from '../../src/lib/api';
import { BookingDTO } from '../../src/types';
import { showToast } from '../../src/lib/toast';

export default function HomeTab() {
  const { token, user } = useAuth();
  const [latest, setLatest] = useState<BookingDTO | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) {
        return;
      }
      try {
        setLoading(true);
        const bookings = await listMyBookings(token);
        setLatest(bookings[0] ?? null);
      } catch (error) {
        showToast((error as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const downloadBrochure = async () => {
    await Linking.openURL(`${getApiBaseUrl()}/brochure`);
  };

  const profileFields = [user?.name, user?.phone, user?.email, user?.address];
  const profileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);
  const latestUnit = latest?.unit ? `${latest.unit.tower} - ${latest.unit.unitNumber}` : 'N/A';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name?.[0] ?? 'C').toUpperCase()}</Text>
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>WELCOME BACK</Text>
            <Text style={styles.heading}>{user?.name ?? 'CUSTOMER'}</Text>
          </View>
        </View>
        <Text style={styles.sub}>Track your booking journey, documents, and units in one place.</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>PROFILE</Text>
          <Text style={styles.statValue}>{profileCompletion}%</Text>
          <Text style={styles.statHint}>COMPLETED</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>BOOKING</Text>
          <Text style={styles.statValue}>{latest ? '1' : '0'}</Text>
          <Text style={styles.statHint}>ACTIVE</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>QUICK ACTIONS</Text>
        <View style={styles.actionsGrid}>
          <Pressable style={styles.action} onPress={() => router.push('/(tabs)/units')}>
            <Feather name="grid" size={16} color="#fff" />
            <Text style={styles.actionText}>VIEW UNITS</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={downloadBrochure}>
            <Feather name="download" size={16} color="#fff" />
            <Text style={styles.actionText}>BROCHURE</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => router.push('/(tabs)/documents')}>
            <Feather name="file-text" size={16} color="#fff" />
            <Text style={styles.actionText}>KYC DETAILS</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>LATEST BOOKING</Text>
        {loading && <Text style={styles.muted}>Loading latest booking...</Text>}
        {!loading && !latest && <Text style={styles.muted}>No bookings yet.</Text>}
        {latest && (
          <View style={styles.bookingWrap}>
            <View style={styles.bookingHead}>
              <Text style={styles.bookingUnit}>{latestUnit}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{latest.bookingStatus}</Text>
              </View>
            </View>
            <Text style={styles.bookingAmount}>AMOUNT: {latest.bookingAmount}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, backgroundColor: '#f8fafc' },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#856d47',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  heroTextWrap: { gap: 2 },
  eyebrow: { fontSize: 11, letterSpacing: 1, color: '#64748b', fontWeight: '700' },
  heading: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  sub: { color: '#475569' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', letterSpacing: 0.7 },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  statHint: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, gap: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  actionsGrid: { gap: 8 },
  action: {
    backgroundColor: '#856d47',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  actionText: { color: '#fff', fontWeight: '700', textTransform: 'uppercase' },
  muted: { color: '#64748b' },
  bookingWrap: { gap: 8 },
  bookingHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  bookingUnit: { fontWeight: '800', fontSize: 16, color: '#0f172a' },
  statusPill: { backgroundColor: '#f3efe7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: '#856d47', fontWeight: '700', fontSize: 11, textTransform: 'uppercase' },
  bookingAmount: { color: '#334155', fontWeight: '700', textTransform: 'uppercase' }
});
