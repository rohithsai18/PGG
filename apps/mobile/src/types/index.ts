import { BookingDTO, CostSheetDTO, UnitDTO, UserDTO } from '@real-estate/shared';

export type { BookingDTO, CostSheetDTO, UnitDTO, UserDTO };

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
