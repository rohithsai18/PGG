import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { createBooking, confirmPayment, initPayment } from '../../src/services/bookingService';
import { getUnitCostSheet } from '../../src/services/unitService';
import { showToast } from '../../src/lib/toast';

export default function UnitBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [cost, setCost] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token || !id) {
        return;
      }
      const data = await getUnitCostSheet(token, id);
      setCost(data);
    })();
  }, [token, id]);

  const runBooking = async () => {
    if (!token || !id || !cost) {
      return;
    }

    try {
      setLoading(true);
      const bookingRes = await createBooking(token, id, 200000);
      const paymentInit = await initPayment(token, bookingRes.booking.id);
      await confirmPayment(token, bookingRes.booking.id, paymentInit.paymentRef);
      router.replace({ pathname: '/booking-success', params: { bookingId: bookingRes.booking.id } });
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!cost) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text>Loading unit details...</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Unit {cost.unit.tower} - {cost.unit.unitNumber}</Text>
      <Text>Base Price: {cost.basePrice}</Text>
      <Text>GST: {cost.gst}</Text>
      <Text>Registration: {cost.registration}</Text>
      <Text>Other Charges: {cost.otherCharges}</Text>
      <Text style={styles.total}>Total: {cost.total}</Text>

      <Pressable style={styles.button} onPress={runBooking} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Processing...' : 'Pay Booking Amount & Confirm'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  total: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  button: { backgroundColor: '#856d47', borderRadius: 10, padding: 12, marginTop: 14 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase' }
});
