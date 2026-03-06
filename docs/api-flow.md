# API Flow

## Authentication
1. `POST /api/v1/auth/request-otp`
2. `POST /api/v1/auth/verify-otp`
3. Use `Authorization: Bearer <token>` for protected routes.

## Booking Journey
1. `PUT /api/v1/kyc`
2. `POST /api/v1/documents/upload-url`
3. Upload file to Cloudinary URL
4. `POST /api/v1/documents/confirm`
5. `GET /api/v1/units?status=AVAILABLE`
6. `GET /api/v1/units/:unitId/cost-sheet`
7. `POST /api/v1/bookings`
8. `POST /api/v1/bookings/:bookingId/payment/init`
9. `POST /api/v1/bookings/:bookingId/payment/confirm`
10. `GET /api/v1/bookings/me`
11. `GET /api/v1/bookings/:bookingId/receipt`

## Brochure
- `GET /api/v1/brochure`
