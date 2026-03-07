import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { listAvailableUnits } from '../../src/services/unitService';
import { UnitDTO } from '../../src/types';
import { showToast } from '../../src/lib/toast';

const PAGE_SIZE = 20;

export default function UnitsTab() {
  const { token } = useAuth();
  const [units, setUnits] = useState<UnitDTO[]>([]);
  const [towers, setTowers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedTower, setSelectedTower] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalItems, setTotalItems] = useState(0);

  const loadUnits = async (nextPage = 1, options?: { showRefresh?: boolean; append?: boolean }) => {
    if (!token) {
      return;
    }

    try {
      if (options?.showRefresh) {
        setRefreshing(true);
      } else if (options?.append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const data = await listAvailableUnits(token, {
        status: 'AVAILABLE',
        tower: selectedTower || undefined,
        search: debouncedQuery || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE
      });

      setUnits((current) => (options?.append ? [...current, ...data.items] : data.items));
      setPage(data.page);
      setHasNextPage(data.hasNextPage);
      setTotalItems(data.totalItems);
      setTowers((current) => {
        const merged = new Set([...current, ...data.towers]);
        return Array.from(merged).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      });
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!token) {
      setUnits([]);
      setTowers([]);
      setTotalItems(0);
      setHasNextPage(false);
      setPage(1);
      return;
    }

    void loadUnits(1);
  }, [token, selectedTower, debouncedQuery]);

  const towerOptions = useMemo(() => [''].concat(towers), [towers]);

  const handleRefresh = () => {
    void loadUnits(1, { showRefresh: true });
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || refreshing || !hasNextPage) {
      return;
    }

    void loadUnits(page + 1, { append: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>AVAILABLE NOW</Text>
        <Text style={styles.summaryCount}>{totalItems}</Text>
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

      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterLabel}>FILTER BY TOWER</Text>
          <Text style={styles.filterValue}>{selectedTower || 'ALL TOWERS'}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {towerOptions.map((tower) => {
            const selected = tower === selectedTower;
            return (
              <Pressable
                key={tower || 'ALL'}
                style={[styles.filterChip, selected ? styles.filterChipActive : null]}
                onPress={() => setSelectedTower(tower)}
              >
                <Text style={[styles.filterChipText, selected ? styles.filterChipTextActive : null]}>
                  {tower || 'ALL TOWERS'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading && (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#856d47" />
          <Text style={styles.loaderText}>Loading units...</Text>
        </View>
      )}

      <FlatList
        data={units}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#856d47" />}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No units found for this search.</Text> : null}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} color="#856d47" /> : null}
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
              <Text style={styles.ctaText}>START BOOKING</Text>
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
  filterSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 8
  },
  filterLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', letterSpacing: 0.8 },
  filterValue: { fontSize: 12, color: '#0f172a', fontWeight: '800' },
  filterRow: { gap: 8, paddingHorizontal: 12, paddingVertical: 2 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    minHeight: 36,
    justifyContent: 'center'
  },
  filterChipActive: {
    borderColor: '#856d47',
    backgroundColor: '#f3efe7'
  },
  filterChipText: { color: '#334155', fontSize: 12, fontWeight: '800' },
  filterChipTextActive: { color: '#856d47' },
  loaderWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  loaderText: { color: '#64748b' },
  listContent: { paddingTop: 4, paddingBottom: 12 },
  footerLoader: { paddingVertical: 16 },
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
