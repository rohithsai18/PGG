import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockPrisma } from './helpers/mockPrisma';

let app: any;
let mockState: ReturnType<typeof createMockPrisma>;

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
    expect(Array.isArray(unitsRes.body)).toBe(true);
  });

  it('books a unit and confirms payment', async () => {
    const token = await login('9999900011');

    const unitsRes = await request(app)
      .get('/api/v1/units?status=AVAILABLE')
      .set('Authorization', `Bearer ${token}`);

    expect(unitsRes.status).toBe(200);
    const unitId = unitsRes.body[0].id;

    const bookingRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ unitId, bookingAmount: 200000 });

    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.booking.bookingStatus).toBe('PENDING_PAYMENT');
    expect(bookingRes.body.costSheet.total).toBeGreaterThan(bookingRes.body.costSheet.basePrice);

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
  });

  it('prevents double booking race on the same unit', async () => {
    const tokenA = await login('9999900012');
    const tokenB = await login('9999900013');
    const unitId = mockState.seed.availableUnitId;

    const [attemptA, attemptB] = await Promise.all([
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ unitId, bookingAmount: 200000 }),
      request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ unitId, bookingAmount: 200000 })
    ]);

    const statuses = [attemptA.status, attemptB.status].sort();
    expect(statuses).toEqual([201, 409]);

    const success = attemptA.status === 201 ? attemptA : attemptB;
    const failure = attemptA.status === 409 ? attemptA : attemptB;

    expect(success.body.booking.unitId).toBe(unitId);
    expect(failure.body.code).toBe('UNIT_NOT_AVAILABLE');
  });
});
