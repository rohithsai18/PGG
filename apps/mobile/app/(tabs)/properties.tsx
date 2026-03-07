import { useEffect, useState } from 'react';
import { FlatList, Linking, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../src/contexts/AuthContext';
import { downloadReceiptPdf, listMyBookings } from '../../src/services/bookingService';
import { BookingDTO } from '../../src/types';
import { showToast } from '../../src/lib/toast';

export default function MyPropertiesTab() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = async (isPullToRefresh = false) => {
    if (!token) {
      return;
    }

    try {
      if (isPullToRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await listMyBookings(token);
      setBookings(data);
    } catch (error) {
      const fallbackMessage = 'Could not load your properties right now. Please try again shortly.';
      showToast((error as Error)?.message || fallbackMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [token]);

  const onGetReceipt = async (bookingId: string) => {
    if (!token) {
      return;
    }

    try {
      const fileUri = await downloadReceiptPdf(token, bookingId);
      const openUri = Platform.OS === 'android'
        ? await FileSystem.getContentUriAsync(fileUri)
        : fileUri;

      await Linking.openURL(openUri);
    } catch (error) {
      showToast((error as Error).message || 'Could not download the receipt PDF.');
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBookings(true)}
            tintColor="#856d47"
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No properties yet</Text>
              <Text style={styles.emptyHint}>Your confirmed bookings will appear here.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.strong}>{item.unit?.tower} - {item.unit?.unitNumber}</Text>
            <Text style={styles.muted}>Status: {item.bookingStatus}</Text>
            <Text style={styles.muted}>Amount: {item.bookingAmount}</Text>
            <Pressable style={styles.button} onPress={() => onGetReceipt(item.id)}>
              <Text style={styles.buttonText}>Download Receipt PDF</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#f8fafc' },
  listContent: { paddingVertical: 14, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  button: { marginTop: 6, backgroundColor: '#856d47', borderRadius: 8, padding: 8 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase' },
  strong: { fontWeight: '700', color: '#0f172a' },
  muted: { color: '#475569' },
  emptyWrap: { paddingTop: 40, alignItems: 'center', gap: 6 },
  emptyTitle: { fontWeight: '700', color: '#0f172a', fontSize: 16 },
  emptyHint: { color: '#64748b' }
});
