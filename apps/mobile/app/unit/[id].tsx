import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { BookingAddressDTO, BookingApplicantDTO, BookingApplicationDTO, KycDTO } from '../../src/types';
import { useAuth } from '../../src/contexts/AuthContext';
import { showToast } from '../../src/lib/toast';
import { createBooking, confirmPayment, initPayment } from '../../src/services/bookingService';
import { getKyc, pickDocument, uploadKycDocument } from '../../src/services/kycService';
import { getUnitCostSheet } from '../../src/services/unitService';

const BOOKING_AMOUNT = 200000;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const PHONE_REGEX = /^\+?[0-9]{8,15}$/;
const POSTAL_REGEX = /^[0-9]{5,10}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const INDUSTRY_OPTIONS: BookingApplicationDTO['professionalDetails']['industry'][] = [
  'IT',
  'ITES_BPO_KPO',
  'MANUFACTURING',
  'RETAIL_SERVICES',
  'FINANCIAL_SERVICES',
  'HOSPITALITY',
  'REAL_ESTATE',
  'MEDICAL_PHARMA',
  'MEDIA_ENTERTAINMENT',
  'OTHER'
];
const SALUTATION_OPTIONS: BookingApplicantDTO['salutation'][] = ['Mr', 'Mrs', 'Ms'];
const RELATION_LABEL_OPTIONS: BookingApplicantDTO['relationLabel'][] = ['Son of', 'Daughter of', 'Wife of', 'Husband of', 'Other'];
const FUNCTION_OPTIONS: BookingApplicationDTO['professionalDetails']['function'][] = [
  'SOFTWARE',
  'SALES_MARKETING',
  'HR_ADMIN',
  'FINANCE',
  'PRODUCTION',
  'LEGAL',
  'OPERATIONS',
  'BUSINESS_SELF_EMPLOYED',
  'OTHER'
];
const INCOME_OPTIONS: BookingApplicationDTO['professionalDetails']['annualIncomeBracket'][] = [
  'LESS_THAN_5',
  'BETWEEN_5_15',
  'BETWEEN_15_25',
  'BETWEEN_25_50',
  'ABOVE_50'
];
const PAYMENT_SOURCE_OPTIONS: BookingApplicationDTO['purchaseDetails']['paymentSource'][] = ['OWN_FUNDS', 'HOME_LOAN'];
const PURPOSE_OPTIONS: BookingApplicationDTO['purchaseDetails']['purchasePurpose'][] = ['OWN_USE', 'INVESTMENT', 'OTHER'];
const PROJECT_NATURE_OPTIONS: BookingApplicationDTO['purchaseDetails']['projectNature'][] = ['RESIDENTIAL', 'COMMERCIAL', 'ALL'];
const INSTRUMENT_OPTIONS: BookingApplicationDTO['paymentDetails']['instrumentType'][] = ['CHEQUE', 'DD'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseDateString(value: string, fallback = todayString()) {
  const source = DATE_REGEX.test(value) ? value : fallback;
  const [year, month, day] = source.split('-').map((part) => Number(part));
  return { year, month, day };
}

function formatDateString(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function clampDateParts(year: number, month: number, day: number) {
  const safeMonth = Math.min(12, Math.max(1, month));
  const safeDay = Math.min(daysInMonth(year, safeMonth), Math.max(1, day));
  return { year, month: safeMonth, day: safeDay };
}

function createAddress(seed = ''): BookingAddressDTO {
  return {
    street1: seed,
    street2: '',
    street3: '',
    city: '',
    postalCode: '',
    state: '',
    country: 'India',
    landmark: ''
  };
}

function createApplicant(seed?: Partial<BookingApplicantDTO>): BookingApplicantDTO {
  return {
    salutation: 'Mr',
    fullName: '',
    customerId: '',
    dateOfBirth: '',
    relationLabel: 'Son of',
    relationName: 'Son of',
    panNumber: '',
    aadhaarNumber: '',
    email: '',
    correspondenceAddress: createAddress(),
    permanentAddress: createAddress(),
    companyName: '',
    residencePhone: '',
    mobile: '',
    alternateMobile: '',
    ...seed
  };
}

function normalizeApplicantRelation(applicant: BookingApplicantDTO): BookingApplicantDTO {
  return {
    ...applicant,
    relationName: applicant.relationLabel === 'Other' ? applicant.relationName : applicant.relationLabel
  };
}

function buildInitialApplication(userName?: string, phone?: string, email?: string, address?: string): BookingApplicationDTO {
  return {
    isChannelPartnerBooking: false,
    dateOfBooking: todayString(),
    salesOrder: '',
    enquiryNo: '',
    primaryApplicant: createApplicant({
      fullName: userName ?? '',
      email: email ?? '',
      mobile: phone ?? '',
      correspondenceAddress: createAddress(address ?? ''),
      permanentAddress: createAddress(address ?? '')
    }),
    coApplicants: [],
    professionalDetails: {
      industry: 'IT',
      industryOther: '',
      function: 'SOFTWARE',
      functionOther: '',
      annualIncomeBracket: 'BETWEEN_15_25',
      isExistingCustomer: false,
      ownedProjectName: '',
      ownedProjectCity: ''
    },
    purchaseDetails: {
      paymentSource: 'OWN_FUNDS',
      homeLoanProvider: '',
      purchasePurpose: 'OWN_USE',
      purchasePurposeOther: '',
      interestedInOtherProjects: false,
      projectNature: 'RESIDENTIAL',
      preferredLocations: ['HYDERABAD']
    },
    channelPartnerDetails: null,
    paymentDetails: {
      instrumentType: 'CHEQUE',
      instrumentNumber: '',
      instrumentDate: todayString()
    },
    declarations: {
      acceptedTerms: false,
      acceptedAccuracyDeclaration: false,
      primaryApplicantSignedName: userName ?? '',
      primaryApplicantSignedOn: todayString(),
      coApplicantSignedNames: [],
      coApplicantSignedDates: []
    }
  };
}

function validateApplicant(applicant: BookingApplicantDTO, label: string, errors: string[]) {
  const normalizedApplicant = normalizeApplicantRelation(applicant);

  if (normalizedApplicant.fullName.trim().length < 2) errors.push(`${label}: full name is required`);
  if (!DATE_REGEX.test(normalizedApplicant.dateOfBirth)) errors.push(`${label}: date of birth must be YYYY-MM-DD`);
  if (normalizedApplicant.relationName.trim().length < 2) errors.push(`${label}: relation name is required`);
  if (!PAN_REGEX.test(normalizedApplicant.panNumber.trim().toUpperCase())) errors.push(`${label}: PAN is invalid`);
  if (!AADHAAR_REGEX.test(normalizedApplicant.aadhaarNumber.trim())) errors.push(`${label}: Aadhaar is invalid`);
  if (!normalizedApplicant.email.includes('@')) errors.push(`${label}: email is invalid`);
  if (!PHONE_REGEX.test(normalizedApplicant.mobile.trim())) errors.push(`${label}: mobile number is invalid`);
  if (!normalizedApplicant.correspondenceAddress.street1.trim()) errors.push(`${label}: correspondence address is required`);
  if (normalizedApplicant.correspondenceAddress.city.trim().length < 2) errors.push(`${label}: correspondence city is required`);
  if (!POSTAL_REGEX.test(normalizedApplicant.correspondenceAddress.postalCode.trim())) errors.push(`${label}: correspondence postal code is invalid`);
  if (normalizedApplicant.correspondenceAddress.state.trim().length < 2) errors.push(`${label}: correspondence state is required`);
  if (normalizedApplicant.correspondenceAddress.country.trim().length < 2) errors.push(`${label}: correspondence country is required`);
  if (!normalizedApplicant.permanentAddress.street1.trim()) errors.push(`${label}: permanent address is required`);
  if (normalizedApplicant.permanentAddress.city.trim().length < 2) errors.push(`${label}: permanent city is required`);
  if (!POSTAL_REGEX.test(normalizedApplicant.permanentAddress.postalCode.trim())) errors.push(`${label}: permanent postal code is invalid`);
  if (normalizedApplicant.permanentAddress.state.trim().length < 2) errors.push(`${label}: permanent state is required`);
  if (normalizedApplicant.permanentAddress.country.trim().length < 2) errors.push(`${label}: permanent country is required`);
}

function validateApplication(application: BookingApplicationDTO) {
  const errors: string[] = [];
  validateApplicant(application.primaryApplicant, 'Primary applicant', errors);

  if (application.coApplicants.length > 1) {
    errors.push('Only 1 co-applicant is supported');
  }

  application.coApplicants.forEach((coApplicant, index) => {
    validateApplicant(coApplicant, `Co-applicant ${index + 1}`, errors);
  });

  if (application.professionalDetails.industry === 'OTHER' && !application.professionalDetails.industryOther.trim()) {
    errors.push('Specify the industry');
  }
  if (application.professionalDetails.function === 'OTHER' && !application.professionalDetails.functionOther.trim()) {
    errors.push('Specify the function');
  }
  if (application.professionalDetails.isExistingCustomer) {
    if (!application.professionalDetails.ownedProjectName.trim()) errors.push('Owned project name is required');
    if (!application.professionalDetails.ownedProjectCity.trim()) errors.push('Owned project city is required');
  }
  if (application.purchaseDetails.paymentSource === 'HOME_LOAN' && !application.purchaseDetails.homeLoanProvider.trim()) {
    errors.push('Preferred bank/HFI is required for home loan');
  }
  if (application.purchaseDetails.purchasePurpose === 'OTHER' && !application.purchaseDetails.purchasePurposeOther.trim()) {
    errors.push('Specify the purchase purpose');
  }
  if (application.isChannelPartnerBooking) {
    if (!application.channelPartnerDetails?.companyName.trim()) errors.push('Channel partner company name is required');
    if (!application.channelPartnerDetails?.individualName.trim()) errors.push('Channel partner individual name is required');
    if (!application.channelPartnerDetails?.reraRegistrationNo.trim()) errors.push('Channel partner RERA number is required');
    if (!application.channelPartnerDetails?.vendorId.trim()) errors.push('Channel partner vendor ID is required');
  }
  if (!application.paymentDetails.instrumentNumber.trim()) errors.push('Cheque/DD number is required');
  if (!DATE_REGEX.test(application.paymentDetails.instrumentDate)) errors.push('Cheque/DD date must be YYYY-MM-DD');
  if (!application.declarations.acceptedTerms) errors.push('Terms must be accepted');
  if (!application.declarations.acceptedAccuracyDeclaration) errors.push('Accuracy declaration must be accepted');
  if (application.declarations.primaryApplicantSignedName.trim().length < 2) errors.push('Primary applicant signature name is required');
  if (!DATE_REGEX.test(application.declarations.primaryApplicantSignedOn)) errors.push('Primary applicant signature date must be YYYY-MM-DD');
  return errors;
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'sentences',
  editable = true
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'characters' | 'words';
  editable?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.readonlyInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
      />
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
  minimumYear = 1950,
  maximumYear = new Date().getFullYear()
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumYear?: number;
  maximumYear?: number;
}) {
  const initialDate = parseDateString(value);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(() =>
    clampDateParts(
      Math.min(maximumYear, Math.max(minimumYear, initialDate.year)),
      initialDate.month,
      initialDate.day
    )
  );

  const openPicker = () => {
    const parsed = parseDateString(value);
    setDraft(
      clampDateParts(
        Math.min(maximumYear, Math.max(minimumYear, parsed.year)),
        parsed.month,
        parsed.day
      )
    );
    setVisible(true);
  };

  const updateDraft = (next: { year?: number; month?: number; day?: number }) => {
    setDraft((current) => {
      const year = Math.min(maximumYear, Math.max(minimumYear, next.year ?? current.year));
      const month = next.month ?? current.month;
      const day = next.day ?? current.day;
      return clampDateParts(year, month, day);
    });
  };

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={openPicker}>
        <Text style={styles.dateFieldValue}>{value || 'Select date'}</Text>
      </Pressable>

      <Modal animationType="fade" transparent visible={visible} onRequestClose={() => setVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label}</Text>
            <Text style={styles.modalValue}>{formatDateString(draft.year, draft.month, draft.day)}</Text>

            <View style={styles.datePickerGrid}>
              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Day</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => updateDraft({ day: draft.day > 1 ? draft.day - 1 : daysInMonth(draft.year, draft.month) })}
                  >
                    <Text style={styles.stepperText}>-</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{String(draft.day).padStart(2, '0')}</Text>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => updateDraft({ day: draft.day < daysInMonth(draft.year, draft.month) ? draft.day + 1 : 1 })}
                  >
                    <Text style={styles.stepperText}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Month</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => updateDraft({ month: draft.month > 1 ? draft.month - 1 : 12 })}
                  >
                    <Text style={styles.stepperText}>-</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{MONTH_LABELS[draft.month - 1]}</Text>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => updateDraft({ month: draft.month < 12 ? draft.month + 1 : 1 })}
                  >
                    <Text style={styles.stepperText}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.datePickerColumn}>
                <Text style={styles.datePickerLabel}>Year</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => updateDraft({ year: draft.year > minimumYear ? draft.year - 1 : maximumYear })}
                  >
                    <Text style={styles.stepperText}>-</Text>
                  </Pressable>
                  <Text style={styles.stepperValue}>{draft.year}</Text>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => updateDraft({ year: draft.year < maximumYear ? draft.year + 1 : minimumYear })}
                  >
                    <Text style={styles.stepperText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondaryButton} onPress={() => setVisible(false)}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalPrimaryButton}
                onPress={() => {
                  onChange(formatDateString(draft.year, draft.month, draft.day));
                  setVisible(false);
                }}
              >
                <Text style={styles.modalPrimaryText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function OptionSelector<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionList}>
        {options.map((option) => (
          <Pressable
            key={option}
            style={[styles.optionChip, option === value && styles.optionChipActive]}
            onPress={() => onChange(option)}
          >
            <Text style={[styles.optionText, option === value && styles.optionTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ApplicantForm({
  title,
  applicant,
  onChange,
  onRemove
}: {
  title: string;
  applicant: BookingApplicantDTO;
  onChange: (next: BookingApplicantDTO) => void;
  onRemove?: () => void;
}) {
  const updateAddress = (kind: 'correspondenceAddress' | 'permanentAddress', field: keyof BookingAddressDTO, value: string) => {
    onChange({
      ...applicant,
      [kind]: {
        ...applicant[kind],
        [field]: value
      }
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.inlineHeader}>
        <SectionTitle>{title}</SectionTitle>
        {onRemove ? (
          <Pressable onPress={onRemove}>
            <Text style={styles.linkText}>Remove</Text>
          </Pressable>
        ) : null}
      </View>
      <OptionSelector
        label="Salutation"
        value={applicant.salutation}
        options={SALUTATION_OPTIONS}
        onChange={(value) => onChange({ ...applicant, salutation: value })}
      />
      <Field label="Full Name" value={applicant.fullName} onChangeText={(value) => onChange({ ...applicant, fullName: value })} />
      <Field label="Customer ID" value={applicant.customerId} onChangeText={(value) => onChange({ ...applicant, customerId: value })} />
      <DateField
        label="Date of Birth"
        value={applicant.dateOfBirth}
        onChange={(value) => onChange({ ...applicant, dateOfBirth: value })}
        minimumYear={1940}
        maximumYear={new Date().getFullYear()}
      />
      <OptionSelector
        label="Relation Label"
        value={applicant.relationLabel}
        options={RELATION_LABEL_OPTIONS}
        onChange={(value) =>
          onChange({
            ...applicant,
            relationLabel: value,
            relationName: value === 'Other' ? '' : value
          })
        }
      />
      {applicant.relationLabel === 'Other' ? (
        <Field
          label="Other Relation Name"
          value={applicant.relationName}
          onChangeText={(value) => onChange({ ...applicant, relationName: value })}
        />
      ) : null}
      <Field label="PAN Number" value={applicant.panNumber} onChangeText={(value) => onChange({ ...applicant, panNumber: value.toUpperCase() })} autoCapitalize="characters" />
      <Field label="Aadhaar Number" value={applicant.aadhaarNumber} onChangeText={(value) => onChange({ ...applicant, aadhaarNumber: value.replace(/\D/g, '') })} keyboardType="number-pad" />
      <Field label="Email" value={applicant.email} onChangeText={(value) => onChange({ ...applicant, email: value })} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Mobile" value={applicant.mobile} onChangeText={(value) => onChange({ ...applicant, mobile: value })} keyboardType="phone-pad" />
      <Field label="Alternate Mobile" value={applicant.alternateMobile} onChangeText={(value) => onChange({ ...applicant, alternateMobile: value })} keyboardType="phone-pad" />
      <Field label="Residence Phone" value={applicant.residencePhone} onChangeText={(value) => onChange({ ...applicant, residencePhone: value })} keyboardType="phone-pad" />
      <Field label="Company Name" value={applicant.companyName} onChangeText={(value) => onChange({ ...applicant, companyName: value })} />
      <Text style={styles.subheading}>Correspondence Address</Text>
      <Field label="Street 1" value={applicant.correspondenceAddress.street1} onChangeText={(value) => updateAddress('correspondenceAddress', 'street1', value)} />
      <Field label="Street 2" value={applicant.correspondenceAddress.street2} onChangeText={(value) => updateAddress('correspondenceAddress', 'street2', value)} />
      <Field label="Street 3" value={applicant.correspondenceAddress.street3} onChangeText={(value) => updateAddress('correspondenceAddress', 'street3', value)} />
      <Field label="City" value={applicant.correspondenceAddress.city} onChangeText={(value) => updateAddress('correspondenceAddress', 'city', value)} />
      <Field label="Postal Code" value={applicant.correspondenceAddress.postalCode} onChangeText={(value) => updateAddress('correspondenceAddress', 'postalCode', value.replace(/\D/g, ''))} keyboardType="number-pad" />
      <Field label="State" value={applicant.correspondenceAddress.state} onChangeText={(value) => updateAddress('correspondenceAddress', 'state', value)} />
      <Field label="Country" value={applicant.correspondenceAddress.country} onChangeText={(value) => updateAddress('correspondenceAddress', 'country', value)} />
      <Field label="Landmark" value={applicant.correspondenceAddress.landmark} onChangeText={(value) => updateAddress('correspondenceAddress', 'landmark', value)} />
      <Text style={styles.subheading}>Permanent Address</Text>
      <Field label="Street 1" value={applicant.permanentAddress.street1} onChangeText={(value) => updateAddress('permanentAddress', 'street1', value)} />
      <Field label="Street 2" value={applicant.permanentAddress.street2} onChangeText={(value) => updateAddress('permanentAddress', 'street2', value)} />
      <Field label="Street 3" value={applicant.permanentAddress.street3} onChangeText={(value) => updateAddress('permanentAddress', 'street3', value)} />
      <Field label="City" value={applicant.permanentAddress.city} onChangeText={(value) => updateAddress('permanentAddress', 'city', value)} />
      <Field label="Postal Code" value={applicant.permanentAddress.postalCode} onChangeText={(value) => updateAddress('permanentAddress', 'postalCode', value.replace(/\D/g, ''))} keyboardType="number-pad" />
      <Field label="State" value={applicant.permanentAddress.state} onChangeText={(value) => updateAddress('permanentAddress', 'state', value)} />
      <Field label="Country" value={applicant.permanentAddress.country} onChangeText={(value) => updateAddress('permanentAddress', 'country', value)} />
      <Field label="Landmark" value={applicant.permanentAddress.landmark} onChangeText={(value) => updateAddress('permanentAddress', 'landmark', value)} />
    </View>
  );
}

export default function UnitBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user, refreshProfile } = useAuth();
  const [cost, setCost] = useState<any>(null);
  const [kyc, setKyc] = useState<KycDTO | null>(null);
  const [form, setForm] = useState<BookingApplicationDTO>(() => buildInitialApplication(user?.name, user?.phone, user?.email ?? '', user?.address ?? ''));
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<'PAN' | 'AADHAAR' | null>(null);

  useEffect(() => {
    (async () => {
      if (!token || !id) {
        return;
      }
      const [costData, kycData] = await Promise.all([getUnitCostSheet(token, id), getKyc(token)]);
      setCost(costData);
      setKyc(kycData);
      setForm((current) => ({
        ...current,
        primaryApplicant: {
          ...current.primaryApplicant,
          fullName: user?.name ?? current.primaryApplicant.fullName,
          mobile: user?.phone ?? current.primaryApplicant.mobile,
          email: user?.email ?? current.primaryApplicant.email,
          correspondenceAddress: {
            ...current.primaryApplicant.correspondenceAddress,
            street1: user?.address ?? current.primaryApplicant.correspondenceAddress.street1
          },
          permanentAddress: {
            ...current.primaryApplicant.permanentAddress,
            street1: user?.address ?? current.primaryApplicant.permanentAddress.street1
          },
          panNumber: kycData?.panNumber ?? current.primaryApplicant.panNumber,
          aadhaarNumber: kycData?.aadhaarNumber ?? current.primaryApplicant.aadhaarNumber
        },
        declarations: {
          ...current.declarations,
          primaryApplicantSignedName: user?.name ?? current.declarations.primaryApplicantSignedName
        }
      }));
    })().catch((error) => {
      showToast((error as Error).message);
    });
  }, [token, id, user?.address, user?.email, user?.name, user?.phone]);

  const validationErrors = useMemo(() => validateApplication(form), [form]);

  const updatePrimaryApplicant = (next: BookingApplicantDTO) => {
    setForm((current) => ({
      ...current,
      primaryApplicant: next,
      declarations: {
        ...current.declarations,
        primaryApplicantSignedName: current.declarations.primaryApplicantSignedName || next.fullName
      }
    }));
  };

  const updateCoApplicant = (index: number, next: BookingApplicantDTO) => {
    setForm((current) => {
      const coApplicants = current.coApplicants.slice();
      coApplicants[index] = next;
      const signedNames = current.declarations.coApplicantSignedNames.slice();
      signedNames[index] = signedNames[index] || next.fullName;
      const signedDates = current.declarations.coApplicantSignedDates.slice();
      signedDates[index] = signedDates[index] || current.declarations.primaryApplicantSignedOn;
      return {
        ...current,
        coApplicants,
        declarations: {
          ...current.declarations,
          coApplicantSignedNames: signedNames,
          coApplicantSignedDates: signedDates
        }
      };
    });
  };

  const removeCoApplicant = (index: number) => {
    setForm((current) => ({
      ...current,
      coApplicants: current.coApplicants.filter((_, currentIndex) => currentIndex !== index),
      declarations: {
        ...current.declarations,
        coApplicantSignedNames: current.declarations.coApplicantSignedNames.filter((_, currentIndex) => currentIndex !== index),
        coApplicantSignedDates: current.declarations.coApplicantSignedDates.filter((_, currentIndex) => currentIndex !== index)
      }
    }));
  };

  const addCoApplicant = () => {
    setForm((current) => {
      if (current.coApplicants.length >= 1) {
        showToast('Only 1 co-applicant is allowed');
        return current;
      }
      return {
        ...current,
        coApplicants: [...current.coApplicants, createApplicant()],
        declarations: {
          ...current.declarations,
          coApplicantSignedNames: [...current.declarations.coApplicantSignedNames, ''],
          coApplicantSignedDates: [...current.declarations.coApplicantSignedDates, current.declarations.primaryApplicantSignedOn]
        }
      };
    });
  };

  const handleUpload = async (type: 'PAN' | 'AADHAAR') => {
    if (!token) {
      return;
    }
    try {
      const doc = await pickDocument();
      if (!doc) {
        return;
      }
      setUploadingDoc(type);
      const uploaded = await uploadKycDocument(token, type, doc);
      setKyc((current) => current ? { ...current, ...uploaded } : current);
      showToast(`${type} document uploaded`);
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setUploadingDoc(null);
    }
  };

  const runBooking = async () => {
    if (!token || !id || !cost) {
      return;
    }

    if (validationErrors.length > 0) {
      showToast(validationErrors[0]);
      return;
    }

    try {
      setLoading(true);
      const normalizedForm = {
        ...form,
        primaryApplicant: normalizeApplicantRelation(form.primaryApplicant),
        coApplicants: form.coApplicants.map(normalizeApplicantRelation)
      };

      const payload = {
        unitId: id,
        bookingAmount: BOOKING_AMOUNT,
        application: {
          ...normalizedForm,
          declarations: {
            ...normalizedForm.declarations,
            primaryApplicantSignedName: normalizedForm.declarations.primaryApplicantSignedName || normalizedForm.primaryApplicant.fullName,
            coApplicantSignedNames: normalizedForm.coApplicants.map((coApplicant, index) => normalizedForm.declarations.coApplicantSignedNames[index] || coApplicant.fullName),
            coApplicantSignedDates: normalizedForm.coApplicants.map((_, index) => normalizedForm.declarations.coApplicantSignedDates[index] || normalizedForm.declarations.primaryApplicantSignedOn)
          }
        }
      };

      const bookingRes = await createBooking(token, payload);
      await refreshProfile();
      const paymentInit = await initPayment(token, bookingRes.booking.id);
      await confirmPayment(token, bookingRes.booking.id, paymentInit.paymentRef);
      router.replace({ pathname: '/booking-success', params: { bookingId: bookingRes.booking.id } });
    } catch (error) {
      showToast((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!cost) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text>Loading unit details...</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Apartment Booking Form</Text>
      <Text style={styles.subtitle}>Unit {cost.unit.tower} - {cost.unit.unitNumber}</Text>

      {validationErrors.length > 0 ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Form validation</Text>
          {validationErrors.slice(0, 6).map((error) => (
            <Text key={error} style={styles.errorText}>- {error}</Text>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <SectionTitle>Booking Details</SectionTitle>
        <DateField
          label="Date of Booking"
          value={form.dateOfBooking}
          onChange={(value) => setForm((current) => ({ ...current, dateOfBooking: value }))}
          minimumYear={2024}
          maximumYear={new Date().getFullYear() + 2}
        />
        <Field label="Sales Order" value={form.salesOrder} onChangeText={(value) => setForm((current) => ({ ...current, salesOrder: value }))} />
        <Field label="Enquiry Number" value={form.enquiryNo} onChangeText={(value) => setForm((current) => ({ ...current, enquiryNo: value }))} />
      </View>

      <ApplicantForm title="Primary Applicant" applicant={form.primaryApplicant} onChange={updatePrimaryApplicant} />

      <View style={styles.card}>
        <SectionTitle>KYC Documents</SectionTitle>
        <Text style={styles.helperText}>
          {kyc?.panFileUrl ? 'PAN document already uploaded.' : 'Upload PAN if it is not already on your account.'}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => handleUpload('PAN')} disabled={uploadingDoc !== null}>
          <Text style={styles.secondaryText}>{uploadingDoc === 'PAN' ? 'Uploading PAN...' : 'Upload PAN Document'}</Text>
        </Pressable>
        <Text style={styles.helperText}>
          {kyc?.aadhaarFileUrl ? 'Aadhaar document already uploaded.' : 'Upload Aadhaar if it is not already on your account.'}
        </Text>
        <Pressable style={styles.secondaryButton} onPress={() => handleUpload('AADHAAR')} disabled={uploadingDoc !== null}>
          <Text style={styles.secondaryText}>{uploadingDoc === 'AADHAAR' ? 'Uploading Aadhaar...' : 'Upload Aadhaar Document'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.inlineHeader}>
          <SectionTitle>Co-applicants</SectionTitle>
          <Pressable onPress={addCoApplicant} disabled={form.coApplicants.length >= 2}>
            <Text style={styles.linkText}>Add co-applicant</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>Only 1 co-applicant is supported for now.</Text>
      </View>

      {form.coApplicants.map((coApplicant, index) => (
        <ApplicantForm
          key={`co-applicant-${index}`}
          title={`Co-applicant ${index + 1}`}
          applicant={coApplicant}
          onChange={(next) => updateCoApplicant(index, next)}
          onRemove={() => removeCoApplicant(index)}
        />
      ))}

      <View style={styles.card}>
        <SectionTitle>Professional Details</SectionTitle>
        <OptionSelector
          label="Industry"
          value={form.professionalDetails.industry}
          options={INDUSTRY_OPTIONS}
          onChange={(value) => setForm((current) => ({ ...current, professionalDetails: { ...current.professionalDetails, industry: value } }))}
        />
        {form.professionalDetails.industry === 'OTHER' ? (
          <Field label="Industry - Other" value={form.professionalDetails.industryOther} onChangeText={(value) => setForm((current) => ({ ...current, professionalDetails: { ...current.professionalDetails, industryOther: value } }))} />
        ) : null}
        <OptionSelector
          label="Function"
          value={form.professionalDetails.function}
          options={FUNCTION_OPTIONS}
          onChange={(value) => setForm((current) => ({ ...current, professionalDetails: { ...current.professionalDetails, function: value } }))}
        />
        {form.professionalDetails.function === 'OTHER' ? (
          <Field label="Function - Other" value={form.professionalDetails.functionOther} onChangeText={(value) => setForm((current) => ({ ...current, professionalDetails: { ...current.professionalDetails, functionOther: value } }))} />
        ) : null}
        <OptionSelector
          label="Annual Income"
          value={form.professionalDetails.annualIncomeBracket}
          options={INCOME_OPTIONS}
          onChange={(value) => setForm((current) => ({ ...current, professionalDetails: { ...current.professionalDetails, annualIncomeBracket: value } }))}
        />
        <ToggleRow label="Existing customer?" value={form.professionalDetails.isExistingCustomer} onValueChange={(value) => setForm((current) => ({ ...current, professionalDetails: { ...current.professionalDetails, isExistingCustomer: value } }))} />
        {form.professionalDetails.isExistingCustomer ? (
          <>
            <Field label="Owned Project Name" value={form.professionalDetails.ownedProjectName} onChangeText={(value) => setForm((current) => ({ ...current, professionalDetails: { ...current.professionalDetails, ownedProjectName: value } }))} />
            <Field label="Owned Project City" value={form.professionalDetails.ownedProjectCity} onChangeText={(value) => setForm((current) => ({ ...current, professionalDetails: { ...current.professionalDetails, ownedProjectCity: value } }))} />
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <SectionTitle>Purchase Details</SectionTitle>
        <OptionSelector
          label="Payment Source"
          value={form.purchaseDetails.paymentSource}
          options={PAYMENT_SOURCE_OPTIONS}
          onChange={(value) => setForm((current) => ({ ...current, purchaseDetails: { ...current.purchaseDetails, paymentSource: value } }))}
        />
        {form.purchaseDetails.paymentSource === 'HOME_LOAN' ? (
          <Field label="Preferred Bank/HFI" value={form.purchaseDetails.homeLoanProvider} onChangeText={(value) => setForm((current) => ({ ...current, purchaseDetails: { ...current.purchaseDetails, homeLoanProvider: value } }))} />
        ) : null}
        <OptionSelector
          label="Purpose of Purchase"
          value={form.purchaseDetails.purchasePurpose}
          options={PURPOSE_OPTIONS}
          onChange={(value) => setForm((current) => ({ ...current, purchaseDetails: { ...current.purchaseDetails, purchasePurpose: value } }))}
        />
        {form.purchaseDetails.purchasePurpose === 'OTHER' ? (
          <Field label="Purpose - Other" value={form.purchaseDetails.purchasePurposeOther} onChangeText={(value) => setForm((current) => ({ ...current, purchaseDetails: { ...current.purchaseDetails, purchasePurposeOther: value } }))} />
        ) : null}
        <ToggleRow label="Interested in other projects?" value={form.purchaseDetails.interestedInOtherProjects} onValueChange={(value) => setForm((current) => ({ ...current, purchaseDetails: { ...current.purchaseDetails, interestedInOtherProjects: value } }))} />
        <OptionSelector
          label="Project Nature"
          value={form.purchaseDetails.projectNature}
          options={PROJECT_NATURE_OPTIONS}
          onChange={(value) => setForm((current) => ({ ...current, purchaseDetails: { ...current.purchaseDetails, projectNature: value } }))}
        />
        <Field
          label="Preferred Locations (comma separated)"
          value={form.purchaseDetails.preferredLocations.join(', ')}
          onChangeText={(value) => setForm((current) => ({
            ...current,
            purchaseDetails: {
              ...current.purchaseDetails,
              preferredLocations: value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean) as BookingApplicationDTO['purchaseDetails']['preferredLocations']
            }
          }))}
        />
      </View>

      <View style={styles.card}>
        <SectionTitle>Channel Partner</SectionTitle>
        <ToggleRow
          label="Booked through channel partner?"
          value={form.isChannelPartnerBooking}
          onValueChange={(value) => setForm((current) => ({
            ...current,
            isChannelPartnerBooking: value,
            channelPartnerDetails: value
              ? current.channelPartnerDetails ?? { companyName: '', individualName: '', reraRegistrationNo: '', vendorId: '' }
              : null
          }))}
        />
        {form.isChannelPartnerBooking && form.channelPartnerDetails ? (
          <>
            <Field label="Channel Partner Company Name" value={form.channelPartnerDetails.companyName} onChangeText={(value) => setForm((current) => ({ ...current, channelPartnerDetails: current.channelPartnerDetails ? { ...current.channelPartnerDetails, companyName: value } : null }))} />
            <Field label="Individual Name" value={form.channelPartnerDetails.individualName} onChangeText={(value) => setForm((current) => ({ ...current, channelPartnerDetails: current.channelPartnerDetails ? { ...current.channelPartnerDetails, individualName: value } : null }))} />
            <Field label="RERA Registration Number" value={form.channelPartnerDetails.reraRegistrationNo} onChangeText={(value) => setForm((current) => ({ ...current, channelPartnerDetails: current.channelPartnerDetails ? { ...current.channelPartnerDetails, reraRegistrationNo: value } : null }))} />
            <Field label="Vendor ID" value={form.channelPartnerDetails.vendorId} onChangeText={(value) => setForm((current) => ({ ...current, channelPartnerDetails: current.channelPartnerDetails ? { ...current.channelPartnerDetails, vendorId: value } : null }))} />
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <SectionTitle>Payment Details</SectionTitle>
        <Field label="Booking Amount" value={String(BOOKING_AMOUNT)} onChangeText={() => undefined} editable={false} keyboardType="number-pad" />
        <OptionSelector
          label="Instrument Type"
          value={form.paymentDetails.instrumentType}
          options={INSTRUMENT_OPTIONS}
          onChange={(value) => setForm((current) => ({ ...current, paymentDetails: { ...current.paymentDetails, instrumentType: value } }))}
        />
        <Field label="Bank/Cheque No." value={form.paymentDetails.instrumentNumber} onChangeText={(value) => setForm((current) => ({ ...current, paymentDetails: { ...current.paymentDetails, instrumentNumber: value } }))} />
        <DateField
          label="Cheque Date"
          value={form.paymentDetails.instrumentDate}
          onChange={(value) => setForm((current) => ({ ...current, paymentDetails: { ...current.paymentDetails, instrumentDate: value } }))}
          minimumYear={2024}
          maximumYear={new Date().getFullYear() + 2}
        />
      </View>

      <View style={styles.card}>
        <SectionTitle>Unit Summary</SectionTitle>
        <Field label="Tower" value={cost.unit.tower} onChangeText={() => undefined} editable={false} />
        <Field label="Unit Number" value={cost.unit.unitNumber} onChangeText={() => undefined} editable={false} />
        <Field label="Super Built Up Area (Sq.ft.)" value={String(cost.unit.areaSqft)} onChangeText={() => undefined} editable={false} />
        <Field label="Carpet Area (Sq.ft.)" value={String(cost.unit.areaSqft)} onChangeText={() => undefined} editable={false} />
        <Field label="Base Price" value={String(cost.basePrice)} onChangeText={() => undefined} editable={false} />
        <Field label="GST" value={String(cost.gst)} onChangeText={() => undefined} editable={false} />
        <Field label="Registration" value={String(cost.registration)} onChangeText={() => undefined} editable={false} />
        <Field label="Other Charges" value={String(cost.otherCharges)} onChangeText={() => undefined} editable={false} />
        <Field label="Sale Value" value={String(cost.total)} onChangeText={() => undefined} editable={false} />
      </View>

      <View style={styles.card}>
        <SectionTitle>Declarations</SectionTitle>
        <Field label="Primary Applicant Signature Name" value={form.declarations.primaryApplicantSignedName} onChangeText={(value) => setForm((current) => ({ ...current, declarations: { ...current.declarations, primaryApplicantSignedName: value } }))} />
        <DateField
          label="Primary Applicant Signature Date"
          value={form.declarations.primaryApplicantSignedOn}
          onChange={(value) => setForm((current) => ({ ...current, declarations: { ...current.declarations, primaryApplicantSignedOn: value } }))}
          minimumYear={2024}
          maximumYear={new Date().getFullYear() + 2}
        />
        <ToggleRow label="I accept the terms and conditions" value={form.declarations.acceptedTerms} onValueChange={(value) => setForm((current) => ({ ...current, declarations: { ...current.declarations, acceptedTerms: value } }))} />
        <ToggleRow label="I confirm the details are accurate" value={form.declarations.acceptedAccuracyDeclaration} onValueChange={(value) => setForm((current) => ({ ...current, declarations: { ...current.declarations, acceptedAccuracyDeclaration: value } }))} />
      </View>

      <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={runBooking} disabled={loading}>
        <Text style={styles.primaryText}>{loading ? 'Submitting booking...' : 'Submit Form And Continue To Payment'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, backgroundColor: '#f8f5ef' },
  title: { fontSize: 26, fontWeight: '700', color: '#2f2418' },
  subtitle: { fontSize: 16, color: '#5f4d3a', marginBottom: 4 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 14, gap: 10, borderWidth: 1, borderColor: '#e5dccd' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2f2418' },
  fieldGroup: { gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#5f4d3a' },
  input: { borderWidth: 1, borderColor: '#d6cab7', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  dateFieldValue: { color: '#2f2418', fontSize: 14 },
  readonlyInput: { backgroundColor: '#f3ece1', color: '#6f6252' },
  optionList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { borderWidth: 1, borderColor: '#d6cab7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  optionChipActive: { backgroundColor: '#856d47', borderColor: '#856d47' },
  optionText: { color: '#5f4d3a', fontWeight: '600' },
  optionTextActive: { color: '#fff' },
  primaryButton: { backgroundColor: '#856d47', borderRadius: 12, padding: 14, marginBottom: 18 },
  buttonDisabled: { opacity: 0.6 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase' },
  secondaryButton: { backgroundColor: '#2f2418', borderRadius: 10, padding: 12 },
  secondaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  helperText: { color: '#6f6252', lineHeight: 18 },
  errorBox: { backgroundColor: '#fff1f2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fecdd3', gap: 2 },
  errorTitle: { color: '#9f1239', fontWeight: '700' },
  errorText: { color: '#9f1239' },
  subheading: { fontSize: 14, fontWeight: '700', color: '#2f2418', marginTop: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  toggleLabel: { flex: 1, color: '#2f2418', fontWeight: '600' },
  inlineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  linkText: { color: '#856d47', fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(47, 36, 24, 0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, gap: 16, borderWidth: 1, borderColor: '#e5dccd' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2f2418' },
  modalValue: { fontSize: 15, fontWeight: '600', color: '#856d47' },
  datePickerGrid: { gap: 12 },
  datePickerColumn: { gap: 6 },
  datePickerLabel: { fontSize: 13, fontWeight: '700', color: '#5f4d3a' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stepperButton: { backgroundColor: '#f3ece1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minWidth: 48, alignItems: 'center' },
  stepperText: { color: '#2f2418', fontSize: 18, fontWeight: '700' },
  stepperValue: { flex: 1, textAlign: 'center', color: '#2f2418', fontSize: 16, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalSecondaryButton: { flex: 1, borderRadius: 12, padding: 12, backgroundColor: '#f3ece1' },
  modalSecondaryText: { textAlign: 'center', color: '#5f4d3a', fontWeight: '700' },
  modalPrimaryButton: { flex: 1, borderRadius: 12, padding: 12, backgroundColor: '#856d47' },
  modalPrimaryText: { textAlign: 'center', color: '#fff', fontWeight: '700' }
});
