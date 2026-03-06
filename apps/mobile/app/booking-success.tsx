import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function BookingSuccess() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Booking Confirmed</Text>
        <Text>Booking ID: {bookingId}</Text>
        <Link href="/(tabs)/properties" style={styles.link}>Go to My Properties</Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 10, padding: 16 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '700' },
  link: { color: '#0f766e', fontWeight: '700' }
});
