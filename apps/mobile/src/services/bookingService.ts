import { BookingDTO } from '../types';
import { apiFetch } from '../lib/api';

export async function listMyBookings(token: string) {
  return apiFetch<BookingDTO[]>('/bookings/me', {}, token);
}

export async function createBooking(token: string, unitId: string, bookingAmount: number) {
  return apiFetch<{ booking: BookingDTO }>('/bookings', {
    method: 'POST',
    body: JSON.stringify({ unitId, bookingAmount })
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

export async function getReceipt(token: string, bookingId: string) {
  return apiFetch(`/bookings/${bookingId}/receipt`, {}, token);
}
