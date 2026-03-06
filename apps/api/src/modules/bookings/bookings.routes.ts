import { Router } from 'express';
import { registerConfirmPaymentRoute } from './routes/confirm-payment.post';
import { registerCreateBookingRoute } from './routes/create-booking.post';
import { registerGetReceiptRoute } from './routes/get-receipt.get';
import { registerInitPaymentRoute } from './routes/init-payment.post';
import { registerListMyBookingsRoute } from './routes/list-my-bookings.get';

const router = Router();

registerCreateBookingRoute(router);
registerInitPaymentRoute(router);
registerConfirmPaymentRoute(router);
registerListMyBookingsRoute(router);
registerGetReceiptRoute(router);

export const bookingsRouter = router;
