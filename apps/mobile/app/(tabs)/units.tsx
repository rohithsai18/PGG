import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { listAvailableUnits } from '../../src/services/unitService';
import { UnitDTO } from '../../src/types';
import { showToast } from '../../src/lib/toast';

export default function UnitsTab() {
  const { token } = useAuth();
  const [units, setUnits] = useState<UnitDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const loadUnits = async (showRefresh = false) => {
    if (!token) {
      return;
    }

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await listAvailableUnits(token);
      setUnits(data);
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, [token]);

  const filteredUnits = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) {
      return units;
    }

    return units.filter((unit) => {
      const label = `${unit.tower} ${unit.unitNumber}`.toLowerCase();
      return label.includes(search);
    });
  }, [units, query]);

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>AVAILABLE NOW</Text>
        <Text style={styles.summaryCount}>{filteredUnits.length}</Text>
        <Text style={styles.summaryHint}>UNITS MATCHING YOUR SEARCH</Text>
      </View>

      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color="#64748b" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by tower or unit number"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
        />
      </View>

      {loading && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#856d47" />
          <Text style={styles.loaderText}>Loading units...</Text>
        </View>
      )}

      <FlatList
        data={filteredUnits}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadUnits(true)} tintColor="#856d47" />}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No units found for this search.</Text> : null}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/unit/${item.id}`)}>
            <View style={styles.cardTop}>
              <Text style={styles.strong}>{item.tower} - {item.unitNumber}</Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.meta}>AREA: {item.areaSqft} SQFT</Text>
            <Text style={styles.price}>PRICE: {item.price}</Text>
            <View style={styles.ctaRow}>
              <Text style={styles.ctaText}>VIEW COST SHEET</Text>
              <Feather name="arrow-right" size={14} color="#856d47" />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc', gap: 10 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  summaryLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', letterSpacing: 0.8 },
  summaryCount: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  summaryHint: { fontSize: 11, color: '#64748b', fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff'
  },
  searchInput: { flex: 1, paddingVertical: 10, color: '#0f172a' },
  loaderWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  loaderText: { color: '#64748b' },
  listContent: { paddingTop: 4, paddingBottom: 12 },
  emptyText: { color: '#64748b', paddingVertical: 18, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  strong: { fontWeight: '800', color: '#0f172a', fontSize: 16 },
  statusPill: { backgroundColor: '#f3efe7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { color: '#856d47', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  meta: { color: '#334155', fontWeight: '600', textTransform: 'uppercase' },
  price: { color: '#0f172a', fontWeight: '700', textTransform: 'uppercase' },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  ctaText: { color: '#856d47', fontWeight: '700', textTransform: 'uppercase', fontSize: 12 }
});
