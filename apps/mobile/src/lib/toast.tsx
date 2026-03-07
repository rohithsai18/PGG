import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ToastPayload = {
  id: number;
  message: string;
};

type Listener = (toast: ToastPayload | null) => void;

let currentToast: ToastPayload | null = null;
let sequence = 0;
const listeners = new Set<Listener>();

function emit(toast: ToastPayload | null) {
  currentToast = toast;
  listeners.forEach((listener) => listener(toast));
}

export function showToast(message: string): void {
  const safeMessage = message.trim() || 'Something went wrong';
  emit({ id: sequence += 1, message: safeMessage });
}

export function dismissToast(): void {
  emit(null);
}

export function ToastViewport() {
  const [toast, setToast] = useState<ToastPayload | null>(currentToast);

  useEffect(() => {
    const listener: Listener = (nextToast) => setToast(nextToast);
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => {
      setToast((current) => (current?.id === toast.id ? null : current));
    }, 5000);

    return () => clearTimeout(timeout);
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.viewport}>
      <View style={styles.toast}>
        <Text style={styles.message}>{toast.message}</Text>
        <Pressable hitSlop={10} onPress={dismissToast} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    zIndex: 1000
  },
  toast: {
    backgroundColor: '#7f1d1d',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  message: {
    flex: 1,
    color: '#fff7ed',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600'
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#991b1b'
  },
  closeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase'
  }
});
