# Demo Runbook

## Pre-demo checklist
- API deployed on Render and healthy at `/api/v1/health`
- Neon database migrated and seeded
- Cloudinary credentials configured
- Mobile `EXPO_PUBLIC_API_BASE_URL` points to Render HTTPS URL

## Demo script
1. Open app and login with phone + demo OTP.
2. Go to Documents and submit KYC details.
3. Upload PAN and Aadhaar docs.
4. Go to Home and tap brochure download.
5. Go to Units and select one available unit.
6. Review cost sheet and confirm booking payment.
7. Open My Properties and show confirmed booking + receipt JSON.
8. Open Profile and logout.

## Failure handling
- OTP error: regenerate via request OTP and retry.
- Unit unavailable: select a different AVAILABLE unit.
- Document upload error: verify Cloudinary env values.
