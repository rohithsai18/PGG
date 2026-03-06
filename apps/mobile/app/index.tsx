import { Redirect } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function IndexPage() {
  const { token } = useAuth();

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}
