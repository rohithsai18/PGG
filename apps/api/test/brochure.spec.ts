import request from 'supertest';
import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { env } from '../src/config/env';

const authToken = jwt.sign(
  { phone: '9999900020' },
  env.JWT_SECRET,
  {
    expiresIn: '5m',
    subject: 'test-user-id'
  }
);

describe('brochure route', () => {
  it('returns 401 without token', async () => {
    const response = await request(app).get('/api/v1/brochure');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('returns pdf download headers for authenticated requests', async () => {
    const response = await request(app)
      .get('/api/v1/brochure')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment');
  });
});
