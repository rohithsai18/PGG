import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockPrisma } from './helpers/mockPrisma';

let app: any;
let mockState: ReturnType<typeof createMockPrisma>;

function buildBookingApplication(phone: string) {
  return {
    isChannelPartnerBooking: false,
    dateOfBooking: '2026-03-07',
    salesOrder: 'SO-100',
    enquiryNo: 'ENQ-100',
    primaryApplicant: {
      salutation: 'Mr',
      fullName: 'Demo User',
      customerId: '',
      dateOfBirth: '1990-01-01',
      relationLabel: 'Son of',
      relationName: 'Parent Name',
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123412341234',
      email: 'demo@example.com',
      correspondenceAddress: {
        street1: '1 Main Street',
        street2: '',
        street3: '',
        city: 'Hyderabad',
        postalCode: '500001',
        state: 'Telangana',
        country: 'India',
        landmark: 'Near Park'
      },
      permanentAddress: {
        street1: '1 Main Street',
        street2: '',
        street3: '',
        city: 'Hyderabad',
        postalCode: '500001',
        state: 'Telangana',
        country: 'India',
        landmark: 'Near Park'
      },
      companyName: 'Acme Pvt Ltd',
      residencePhone: '0401234567',
      mobile: phone,
      alternateMobile: '9999999998'
    },
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
      interestedInOtherProjects: true,
      projectNature: 'RESIDENTIAL',
      preferredLocations: ['HYDERABAD']
    },
    channelPartnerDetails: null,
    paymentDetails: {
      instrumentType: 'CHEQUE',
      instrumentNumber: '123456',
      instrumentDate: '2026-03-07'
    },
    declarations: {
      acceptedTerms: true,
      acceptedAccuracyDeclaration: true,
      primaryApplicantSignedName: 'Demo User',
      primaryApplicantSignedOn: '2026-03-07',
      coApplicantSignedNames: [],
      coApplicantSignedDates: []
    }
  };
}

async function login(phone: string) {
  const otpReq = await request(app)
    .post('/api/v1/auth/request-otp')
    .send({ phone });

  expect(otpReq.status).toBe(201);

  const verify = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({
      phone,
      requestId: otpReq.body.requestId,
      otp: otpReq.body.demoOtpHint || '123456'
    });

  expect(verify.status).toBe(200);
  expect(verify.body.accessToken).toBeTypeOf('string');
  return verify.body.accessToken as string;
}

describe('API integration: auth + booking', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockState = createMockPrisma();

    vi.doMock('../src/lib/prisma', () => ({
      prisma: mockState.prisma
    }));

    const mod = await import('../src/app');
    app = mod.app;
  });

  it('runs OTP flow and rejects wrong OTP', async () => {
    const phone = '9999900010';
    const otpReq = await request(app).post('/api/v1/auth/request-otp').send({ phone });

    const wrongOtp = await request(app).post('/api/v1/auth/verify-otp').send({
      phone,
      requestId: otpReq.body.requestId,
      otp: '000000'
    });

    expect(wrongOtp.status).toBe(400);
    expect(wrongOtp.body.code).toBe('INVALID_OTP');

    const okOtp = await request(app).post('/api/v1/auth/verify-otp').send({
      phone,
      requestId: otpReq.body.requestId,
      otp: otpReq.body.demoOtpHint || '123456'
    });

    expect(okOtp.status).toBe(200);
    expect(okOtp.body.user.phone).toBe(phone);
  });

  it('rejects access to protected routes without auth token', async () => {
    const res = await request(app).get('/api/v1/units?status=AVAILABLE');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('accepts x-api-key as auth token header', async () => {
    const token = await login('9999900019');

    const unitsRes = await request(app)
      .get('/api/v1/units?status=AVAILABLE')
      .set('x-api-key', token);

    expect(unitsRes.status).toBe(200);
    expect(Array.isArray(unitsRes.body.items)).toBe(true);
  });

  it('returns paginated units with tower metadata and filters', async () => {
    const token = await login('9999900022');

    const unitsRes = await request(app)
      .get('/api/v1/units?status=AVAILABLE&page=1&pageSize=2')
      .set('Authorization', `Bearer ${token}`);

    expect(unitsRes.status).toBe(200);
    expect(unitsRes.body.page).toBe(1);
    expect(unitsRes.body.pageSize).toBe(2);
    expect(unitsRes.body.totalItems).toBe(4);
    expect(unitsRes.body.totalPages).toBe(2);
    expect(unitsRes.body.hasNextPage).toBe(true);
    expect(unitsRes.body.items).toHaveLength(2);
    expect(unitsRes.body.towers).toEqual(['T-1', 'T-2']);

    const filteredRes = await request(app)
      .get('/api/v1/units?status=AVAILABLE&tower=T-2&search=20&page=1&pageSize=10')
      .set('Authorization', `Bearer ${token}`);

    expect(filteredRes.status).toBe(200);
    expect(filteredRes.body.totalItems).toBe(2);
    expect(filteredRes.body.hasNextPage).toBe(false);
    expect(filteredRes.body.items.every((unit: any) => unit.tower === 'T-2')).toBe(true);
  });

  it('rejects invalid units pagination params', async () => {
    const token = await login('9999900023');

    const res = await request(app)
      .get('/api/v1/units?status=AVAILABLE&page=0&pageSize=100')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('books a unit and confirms payment', async () => {
    const token = await login('9999900011');

    const unitsRes = await request(app)
      .get('/api/v1/units?status=AVAILABLE')
      .set('Authorization', `Bearer ${token}`);

    expect(unitsRes.status).toBe(200);
    const unitId = unitsRes.body.items[0].id;

    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ unitId, bookingAmount: 200000, application: buildBookingApplication('9999900011') });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.booking.bookingStatus).toBe('PENDING_PAYMENT');
    expect(bookingRes.body.costSheet.total).toBeGreaterThan(bookingRes.body.costSheet.basePrice);
    expect(bookingRes.body.applicationSummary.primaryApplicantName).toBe('Demo User');

    const kycRes = await request(app)
      .get('/api/v1/kyc')
      .set('Authorization', `Bearer ${token}`);

    expect(kycRes.status).toBe(200);
    expect(kycRes.body.panNumber).toBe('ABCDE1234F');
    expect(kycRes.body.aadhaarNumber).toBe('123412341234');

    const initRes = await request(app)
      .post(`/api/v1/bookings/${bookingRes.body.booking.id}/payment/init`)
      .set('Authorization', `Bearer ${token}`);

    expect(initRes.status).toBe(200);
    expect(initRes.body.status).toBe('INITIATED');

    const confirmRes = await request(app)
      .post(`/api/v1/bookings/${bookingRes.body.booking.id}/payment/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentRef: initRes.body.paymentRef });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.booking.bookingStatus).toBe('CONFIRMED');

    const meRes = await request(app)
      .get('/api/v1/bookings/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body).toHaveLength(1);
    expect(meRes.body[0].bookingStatus).toBe('CONFIRMED');

    const receiptRes = await request(app)
      .get(`/api/v1/bookings/${bookingRes.body.booking.id}/receipt`)
      .set('Authorization', `Bearer ${token}`);

    expect(receiptRes.status).toBe(200);
    expect(receiptRes.headers['content-type']).toContain('application/pdf');
    expect(receiptRes.headers['content-disposition']).toContain(`receipt-${bookingRes.body.booking.id}.pdf`);
    expect(Number(receiptRes.headers['content-length'])).toBeGreaterThan(0);
  });

  it('prevents double booking race on the same unit', async () => {
    const tokenA = await login('9999900012');
    const tokenB = await login('9999900013');
    const unitId = mockState.seed.availableUnitId;

    const [attemptA, attemptB] = await Promise.all([
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ unitId, bookingAmount: 200000, application: buildBookingApplication('9999900012') }),
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ unitId, bookingAmount: 200000, application: buildBookingApplication('9999900013') })
    ]);

    const statuses = [attemptA.status, attemptB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const success = attemptA.status === 201 ? attemptA : attemptB;
    const failure = attemptA.status === 409 ? attemptA : attemptB;

    expect(success.body.booking.unitId).toBe(unitId);
    expect(failure.body.code).toBe('UNIT_NOT_AVAILABLE');
  });

  it('rejects booking without primary applicant PAN/Aadhaar', async () => {
    const token = await login('9999900014');
    const unitId = mockState.seed.availableUnitId;
    const application = buildBookingApplication('9999900014');
    application.primaryApplicant.panNumber = '';
    application.primaryApplicant.aadhaarNumber = '';

    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ unitId, bookingAmount: 200000, application });

    expect(bookingRes.status).toBe(400);
    expect(bookingRes.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects booking with more than one co-applicant', async () => {
    const token = await login('9999900015');
    const unitId = mockState.seed.availableUnitId;
    const application = buildBookingApplication('9999900015');
    const coApplicant = {
      ...application.primaryApplicant,
      fullName: 'Co Applicant One',
      email: 'co1@example.com',
      mobile: '9999900020'
    };

    application.coApplicants = [
      coApplicant,
      {
        ...coApplicant,
        fullName: 'Co Applicant Two',
        email: 'co2@example.com',
        mobile: '9999900021'
      }
    ];
    application.declarations.coApplicantSignedNames = ['Co Applicant One', 'Co Applicant Two'];
    application.declarations.coApplicantSignedDates = ['2026-03-07', '2026-03-07'];

    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ unitId, bookingAmount: 200000, application });

    expect(bookingRes.status).toBe(400);
    expect(bookingRes.body.code).toBe('VALIDATION_ERROR');
  });
});
