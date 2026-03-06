export type UnitStatus = 'AVAILABLE' | 'RESERVED' | 'BOOKED';
export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';

export interface UserDTO {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
}

export interface KycDTO {
  id: string;
  userId: string;
  panNumberMasked: string;
  aadhaarNumberMasked: string;
  panFileUrl: string | null;
  aadhaarFileUrl: string | null;
}

export interface UnitDTO {
  id: string;
  tower: string;
  unitNumber: string;
  areaSqft: number;
  price: number;
  status: UnitStatus;
}

export interface CostSheetDTO {
  basePrice: number;
  gst: number;
  registration: number;
  otherCharges: number;
  total: number;
  formulaVersion: string;
}

export interface BookingDTO {
  id: string;
  userId: string;
  unitId: string;
  bookingAmount: number;
  bookingStatus: BookingStatus;
  paymentRef: string | null;
  createdAt: string;
  unit?: UnitDTO;
  costSheet?: CostSheetDTO;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
