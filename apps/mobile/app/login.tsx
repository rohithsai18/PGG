import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { showToast } from '../src/lib/toast';

const PHONE_LENGTH = 10;
const OTP_LENGTH = 6;

export default function LoginPage() {
  const { token, requestOtp, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('9999900001');
  const [requestId, setRequestId] = useState('');
  const [otp, setOtp] = useState('123456');
  const [otpHint, setOtpHint] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  const sanitizedPhone = phone.replace(/\D/g, '').slice(0, PHONE_LENGTH);
  const sanitizedOtp = otp.replace(/\D/g, '').slice(0, OTP_LENGTH);
  const maskedPhone = sanitizedPhone ? `+91 ${sanitizedPhone}` : '+91';
  const canRequestOtp = sanitizedPhone.length === PHONE_LENGTH && !loading;
  const canVerifyOtp = Boolean(requestId) && sanitizedOtp.length === OTP_LENGTH && !loading;

  const onRequestOtp = async () => {
    if (sanitizedPhone.length !== PHONE_LENGTH) {
      showToast('Enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      const data = await requestOtp(sanitizedPhone);
      setRequestId(data.requestId);
      setOtp('');
      setOtpHint(data.demoOtpHint ? `Demo OTP: ${data.demoOtpHint}` : 'OTP sent. Check backend env for the demo code.');
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (!requestId || sanitizedOtp.length !== OTP_LENGTH) {
      showToast('Enter the 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      await verifyOtp(sanitizedPhone, requestId, sanitizedOtp);
      setRequestId('');
      setOtpHint('');
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onEditPhone = () => {
    setRequestId('');
    setOtp('');
    setOtpHint('');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>Use your mobile number to receive a one-time password.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mobile number</Text>
              <TextInput
                style={[styles.input, requestId ? styles.inputReadonly : null]}
                value={sanitizedPhone}
                onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, PHONE_LENGTH))}
                placeholder="10-digit mobile number"
                keyboardType="phone-pad"
                maxLength={PHONE_LENGTH}
                editable={!requestId && !loading}
              />
            </View>

            {requestId ? (
              <>
                <View style={styles.inlineRow}>
                  <Text style={styles.metaText}>Code sent to {maskedPhone}</Text>
                  <Pressable onPress={onEditPhone} hitSlop={8}>
                    <Text style={styles.linkText}>Change</Text>
                  </Pressable>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>OTP</Text>
                  <TextInput
                    style={styles.input}
                    value={sanitizedOtp}
                    onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                    placeholder="6-digit OTP"
                    keyboardType="number-pad"
                    maxLength={OTP_LENGTH}
                    editable={!loading}
                  />
                </View>

                <Text style={styles.hint}>{otpHint || 'Demo mode shows the OTP here. Production should deliver it by SMS.'}</Text>

                <Pressable style={[styles.primaryButton, !canVerifyOtp ? styles.buttonDisabled : null]} onPress={onVerify} disabled={!canVerifyOtp}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify and Login</Text>}
                </Pressable>

                <Pressable onPress={onRequestOtp} disabled={loading} hitSlop={8}>
                  <Text style={[styles.secondaryText, loading ? styles.linkDisabled : null]}>Resend OTP</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={[styles.primaryButton, !canRequestOtp ? styles.buttonDisabled : null]} onPress={onRequestOtp} disabled={!canRequestOtp}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center'
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 32
  },
  header: {
    gap: 10
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    color: '#111827'
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6b7280'
  },
  form: {
    gap: 18
  },
  fieldGroup: {
    gap: 8
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#111827'
  },
  inputReadonly: {
    backgroundColor: '#f9fafb',
    color: '#6b7280'
  },
  inlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  metaText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563'
  },
  primaryButton: {
    backgroundColor: '#856d47',
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonDisabled: {
    opacity: 0.45
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700'
  },
  hint: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 19
  },
  linkText: {
    color: '#111827',
    fontWeight: '600'
  },
  secondaryText: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center'
  },
  linkDisabled: {
    opacity: 0.4
  }
});
