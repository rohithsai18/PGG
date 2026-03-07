-- CreateTable
CREATE TABLE "BookingApplication" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "isChannelPartnerBooking" BOOLEAN NOT NULL DEFAULT false,
    "coApplicantCount" INTEGER NOT NULL DEFAULT 0,
    "primaryApplicant" JSONB NOT NULL,
    "coApplicants" JSONB NOT NULL,
    "professionalDetails" JSONB,
    "purchaseDetails" JSONB,
    "channelPartnerDetails" JSONB,
    "paymentDetails" JSONB,
    "unitSnapshot" JSONB NOT NULL,
    "declarations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingApplication_bookingId_key" ON "BookingApplication"("bookingId");

-- CreateIndex
CREATE INDEX "BookingApplication_isChannelPartnerBooking_idx" ON "BookingApplication"("isChannelPartnerBooking");

-- AddForeignKey
ALTER TABLE "BookingApplication" ADD CONSTRAINT "BookingApplication_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
