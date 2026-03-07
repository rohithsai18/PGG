export type UnitStatus = 'AVAILABLE' | 'RESERVED' | 'BOOKED';
export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
export type ApplicantSalutation = 'Mr' | 'Mrs' | 'Ms';
export type RelationLabel = 'Son of' | 'Daughter of' | 'Wife of' | 'Husband of' | 'Other';
export type IndustryOption =
  | 'IT'
  | 'ITES_BPO_KPO'
  | 'MANUFACTURING'
  | 'RETAIL_SERVICES'
  | 'FINANCIAL_SERVICES'
  | 'HOSPITALITY'
  | 'REAL_ESTATE'
  | 'MEDICAL_PHARMA'
  | 'MEDIA_ENTERTAINMENT'
  | 'OTHER';
export type FunctionOption =
  | 'SOFTWARE'
  | 'SALES_MARKETING'
  | 'HR_ADMIN'
  | 'FINANCE'
  | 'PRODUCTION'
  | 'LEGAL'
  | 'OPERATIONS'
  | 'BUSINESS_SELF_EMPLOYED'
  | 'OTHER';
export type IncomeBracket = 'LESS_THAN_5' | 'BETWEEN_5_15' | 'BETWEEN_15_25' | 'BETWEEN_25_50' | 'ABOVE_50';
export type PaymentSource = 'OWN_FUNDS' | 'HOME_LOAN';
export type PurchasePurpose = 'OWN_USE' | 'INVESTMENT' | 'OTHER';
export type ProjectNature = 'RESIDENTIAL' | 'COMMERCIAL' | 'ALL';
export type PreferredLocation =
  | 'BANGALORE'
  | 'CHENNAI'
  | 'MANGALORE'
  | 'HYDERABAD'
  | 'KOCHI'
  | 'MUMBAI'
  | 'CALICUT'
  | 'NOIDA'
  | 'ALL';
export type PaymentInstrumentType = 'CHEQUE' | 'DD';

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
  panNumber?: string;
  aadhaarNumber?: string;
  panNumberMasked: string;
  aadhaarNumberMasked: string;
  panFileUrl: string | null;
  aadhaarFileUrl: string | null;
  updatedAt?: string;
}

export interface BookingAddressDTO {
  street1: string;
  street2: string;
  street3: string;
  city: string;
  postalCode: string;
  state: string;
  country: string;
  landmark: string;
}

export interface BookingApplicantDTO {
  salutation: ApplicantSalutation;
  fullName: string;
  customerId: string;
  dateOfBirth: string;
  relationLabel: RelationLabel;
  relationName: string;
  panNumber: string;
  aadhaarNumber: string;
  email: string;
  correspondenceAddress: BookingAddressDTO;
  permanentAddress: BookingAddressDTO;
  companyName: string;
  residencePhone: string;
  mobile: string;
  alternateMobile: string;
}

export interface BookingProfessionalDetailsDTO {
  industry: IndustryOption;
  industryOther: string;
  function: FunctionOption;
  functionOther: string;
  annualIncomeBracket: IncomeBracket;
  isExistingCustomer: boolean;
  ownedProjectName: string;
  ownedProjectCity: string;
}

export interface BookingPurchaseDetailsDTO {
  paymentSource: PaymentSource;
  homeLoanProvider: string;
  purchasePurpose: PurchasePurpose;
  purchasePurposeOther: string;
  interestedInOtherProjects: boolean;
  projectNature: ProjectNature;
  preferredLocations: PreferredLocation[];
}

export interface ChannelPartnerDTO {
  companyName: string;
  individualName: string;
  reraRegistrationNo: string;
  vendorId: string;
}

export interface BookingPaymentDetailsDTO {
  instrumentType: PaymentInstrumentType;
  instrumentNumber: string;
  instrumentDate: string;
}

export interface BookingUnitSnapshotDTO {
  tower: string;
  unitNumber: string;
  superBuiltUpAreaSqft: number;
  carpetAreaSqft: number;
  carparksReserved: number;
  saleValue: number;
}

export interface BookingDeclarationsDTO {
  acceptedTerms: boolean;
  acceptedAccuracyDeclaration: boolean;
  primaryApplicantSignedName: string;
  primaryApplicantSignedOn: string;
  coApplicantSignedNames: string[];
  coApplicantSignedDates: string[];
}

export interface BookingApplicationDTO {
  isChannelPartnerBooking: boolean;
  dateOfBooking: string;
  salesOrder: string;
  enquiryNo: string;
  primaryApplicant: BookingApplicantDTO;
  coApplicants: BookingApplicantDTO[];
  professionalDetails: BookingProfessionalDetailsDTO;
  purchaseDetails: BookingPurchaseDetailsDTO;
  channelPartnerDetails: ChannelPartnerDTO | null;
  paymentDetails: BookingPaymentDetailsDTO;
  declarations: BookingDeclarationsDTO;
}

export interface BookingApplicationSummaryDTO {
  isChannelPartnerBooking: boolean;
  coApplicantCount: number;
  primaryApplicantName: string;
}

export interface CreateBookingPayload {
  unitId: string;
  bookingAmount: number;
  application: BookingApplicationDTO;
}

export interface UnitDTO {
  id: string;
  tower: string;
  unitNumber: string;
  areaSqft: number;
  price: number;
  status: UnitStatus;
}

export interface ListUnitsQuery {
  status?: UnitStatus;
  tower?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedUnitsDTO {
  items: UnitDTO[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  towers: string[];
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
  application?: BookingApplicationSummaryDTO;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}
