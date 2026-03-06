import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ProfileTab() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text>Name: {user?.name}</Text>
      <Text>Phone: {user?.phone}</Text>
      <Text>Email: {user?.email ?? 'Not set'}</Text>
      <Text>Address: {user?.address ?? 'Not set'}</Text>

      <Pressable style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  button: { backgroundColor: '#856d47', borderRadius: 10, padding: 12, marginTop: 14 },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase' }
});
