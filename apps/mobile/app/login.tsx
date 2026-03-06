import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { showToast } from '../src/lib/toast';

export default function LoginPage() {
  const { token, requestOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('9999900001');
  const [requestId, setRequestId] = useState('');
  const [otp, setOtp] = useState('123456');
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  const onRequestOtp = async () => {
    try {
      setLoading(true);
      const data = await requestOtp(phone);
      setRequestId(data.requestId);
      Alert.alert('OTP Requested', `Use demo OTP: ${data.demoOtpHint ?? 'Check backend env'}`);
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    try {
      setLoading(true);
      await verifyOtp(phone, requestId, otp);
      setRequestId('');
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
      {!requestId ? (
        <Pressable style={styles.button} onPress={onRequestOtp} disabled={loading}>
          <Text style={styles.buttonText}>Request OTP</Text>
        </Pressable>
      ) : (
        <>
          <TextInput style={styles.input} value={otp} onChangeText={setOtp} placeholder="OTP" keyboardType="number-pad" />
          <Pressable style={[styles.button, styles.verify]} onPress={onVerify} disabled={loading || !requestId}>
            <Text style={styles.buttonText}>Verify & Login</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    paddingTop: 16,
    gap: 10
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff'
  },
  button: {
    backgroundColor: '#856d47',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center'
  },
  verify: {
    marginTop: 6
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  hint: {
    color: '#475569',
    fontSize: 12
  }
});
