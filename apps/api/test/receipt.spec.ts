import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../src/config/env';

const bookingId = '11111111-1111-1111-1111-111111111111';
const userId = 'test-user-id';

const authToken = jwt.sign(
  { phone: '9999900020' },
  env.JWT_SECRET,
  {
    expiresIn: '5m',
    subject: userId
  }
);

describe('receipt route', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a pdf attachment with relevant receipt fields', async () => {
    vi.doMock('../src/lib/prisma', () => ({
      prisma: {
        booking: {
          findUnique: vi.fn().mockResolvedValue({
            id: bookingId,
            userId,
            bookingAmount: 250000,
            bookingStatus: 'CONFIRMED',
            paymentRef: 'PAY-123456',
            user: {
              name: 'Demo User',
              phone: '9999900020'
            },
            unit: {
              tower: 'A',
              unitNumber: '1204'
            },
            costSheet: {
              total: 5000000
            }
          })
        }
      }
    }));

    const { app } = await import('../src/app');
    const response = await request(app)
      .get(`/api/v1/bookings/${bookingId}/receipt`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain(`receipt-${bookingId}.pdf`);
    expect(Number(response.headers['content-length'])).toBeGreaterThan(0);
  });
});
