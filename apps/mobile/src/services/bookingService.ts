import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { BookingApplicationSummaryDTO, BookingDTO, CostSheetDTO, CreateBookingPayload } from '../types';
import { apiFetch, getApiBaseUrl } from '../lib/api';

export async function listMyBookings(token: string) {
  return apiFetch<BookingDTO[]>('/bookings/me', {}, token);
}

export async function createBooking(token: string, payload: CreateBookingPayload) {
  return apiFetch<{ booking: BookingDTO; costSheet: CostSheetDTO; applicationSummary: BookingApplicationSummaryDTO }>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, token);
}

export async function initPayment(token: string, bookingId: string) {
  return apiFetch<{ paymentRef: string; amount: number; status: string }>(`/bookings/${bookingId}/payment/init`, {
    method: 'POST'
  }, token);
}

export async function confirmPayment(token: string, bookingId: string, paymentRef: string) {
  return apiFetch<{ message: string }>(`/bookings/${bookingId}/payment/confirm`, {
    method: 'POST',
    body: JSON.stringify({ paymentRef })
  }, token);
}

export async function downloadReceiptPdf(token: string, bookingId: string) {
  const receiptUrl = `${getApiBaseUrl()}/bookings/${bookingId}/receipt`;

  if (Platform.OS === 'web') {
    const response = await fetch(receiptUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Could not download the receipt PDF.');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  const baseDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;

  if (!baseDirectory) {
    throw new Error('Receipt download is not supported on this device');
  }

  const receiptsDirectory = `${baseDirectory}receipts/`;
  await FileSystem.makeDirectoryAsync(receiptsDirectory, { intermediates: true });

  const fileUri = `${receiptsDirectory}receipt-${bookingId}.pdf`;
  const result = await FileSystem.downloadAsync(
    receiptUrl,
    fileUri,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return result.uri;
}
