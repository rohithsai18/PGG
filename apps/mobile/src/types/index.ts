import type {
  BookingApplicationDTO,
  BookingApplicationSummaryDTO,
  BookingAddressDTO,
  BookingApplicantDTO,
  BookingDTO,
  CostSheetDTO,
  CreateBookingPayload,
  KycDTO,
  ListUnitsQuery,
  PaginatedUnitsDTO,
  UnitDTO,
  UserDTO
} from '@real-estate/shared';

export type {
  BookingApplicationDTO,
  BookingApplicationSummaryDTO,
  BookingAddressDTO,
  BookingApplicantDTO,
  BookingDTO,
  CostSheetDTO,
  CreateBookingPayload,
  KycDTO,
  ListUnitsQuery,
  PaginatedUnitsDTO,
  UnitDTO,
  UserDTO
};

export interface AuthState {
  token: string | null;
  user: UserDTO | null;
}

export interface KycPayload {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  panNumber: string;
  aadhaarNumber: string;
}
