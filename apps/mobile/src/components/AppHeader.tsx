import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  canGoBack?: boolean;
  onBack?: () => void;
};

export default function AppHeader({ title, subtitle, canGoBack = false, onBack }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        {canGoBack
          ? (
            <Pressable onPress={onBack} style={styles.backButton} hitSlop={10}>
              <Feather name="chevron-left" size={20} color="#0f172a" />
            </Pressable>
            )
          : (
            <View style={styles.sidePlaceholder} />
            )}

        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <View style={styles.sidePlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff'
  },
  row: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sidePlaceholder: {
    width: 40,
    height: 40
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a'
  },
  subtitle: {
    marginTop: 1,
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600'
  }
});
