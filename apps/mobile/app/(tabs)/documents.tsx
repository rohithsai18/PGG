import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { pickDocument, uploadKycDocument, upsertKyc } from '../../src/services/kycService';
import { showToast } from '../../src/lib/toast';

export default function DocumentsTab() {
  const { token, user } = useAuth();
  const [fullName, setFullName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [address, setAddress] = useState(user?.address ?? '');
  const [panNumber, setPanNumber] = useState('ABCDE1234F');
  const [aadhaarNumber, setAadhaarNumber] = useState('123412341234');
  const [busy, setBusy] = useState(false);

  const saveKyc = async () => {
    if (!token) {
      return;
    }
    try {
      setBusy(true);
      await upsertKyc(token, { fullName, phone, email, address, panNumber, aadhaarNumber });
      Alert.alert('Success', 'KYC saved successfully');
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const uploadDoc = async (type: 'PAN' | 'AADHAAR') => {
    if (!token) {
      return;
    }

    try {
      const doc = await pickDocument();
      if (!doc) {
        return;
      }
      setBusy(true);
      await uploadKycDocument(token, type, doc);
      Alert.alert('Uploaded', `${type} document uploaded`);
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Full Name" />
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" />
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Address" />
      <TextInput style={styles.input} value={panNumber} onChangeText={setPanNumber} placeholder="PAN Number" />
      <TextInput style={styles.input} value={aadhaarNumber} onChangeText={setAadhaarNumber} placeholder="Aadhaar Number" />

      <Pressable style={styles.primaryButton} onPress={saveKyc} disabled={busy}>
        <Text style={styles.primaryText}>Save KYC</Text>
      </Pressable>

      <View style={styles.row}>
        <Pressable style={styles.secondaryButton} onPress={() => uploadDoc('PAN')} disabled={busy}>
          <Text style={styles.secondaryText}>Upload PAN</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => uploadDoc('AADHAAR')} disabled={busy}>
          <Text style={styles.secondaryText}>Upload Aadhaar</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', borderRadius: 10, padding: 10 },
  primaryButton: { backgroundColor: '#856d47', borderRadius: 10, padding: 12, marginTop: 8 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10 },
  secondaryButton: { backgroundColor: '#856d47', borderRadius: 8, padding: 10, flex: 1, alignItems: 'center' },
  secondaryText: { color: '#fff', fontWeight: '700', textTransform: 'uppercase' }
});
