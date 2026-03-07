import { BookingStatus, UnitStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../../lib/errors';
import { getAuthUserId } from '../../../lib/get-auth-user-id';
import { prisma } from '../../../lib/prisma';
import { validate } from '../../../middleware/validate';
import { computeCostSheet } from '../../cost-sheet/cost-sheet.service';

const salutationSchema = z.enum(['Mr', 'Mrs', 'Ms']);
const relationLabelSchema = z.enum(['Son of', 'Daughter of', 'Wife of', 'Husband of', 'Other']);
const industrySchema = z.enum([
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
]);
const functionSchema = z.enum([
  'SOFTWARE',
  'SALES_MARKETING',
  'HR_ADMIN',
  'FINANCE',
  'PRODUCTION',
  'LEGAL',
  'OPERATIONS',
  'BUSINESS_SELF_EMPLOYED',
  'OTHER'
]);
const incomeBracketSchema = z.enum(['LESS_THAN_5', 'BETWEEN_5_15', 'BETWEEN_15_25', 'BETWEEN_25_50', 'ABOVE_50']);
const paymentSourceSchema = z.enum(['OWN_FUNDS', 'HOME_LOAN']);
const purchasePurposeSchema = z.enum(['OWN_USE', 'INVESTMENT', 'OTHER']);
const projectNatureSchema = z.enum(['RESIDENTIAL', 'COMMERCIAL', 'ALL']);
const preferredLocationSchema = z.enum([
  'BANGALORE',
  'CHENNAI',
  'MANGALORE',
  'HYDERABAD',
  'KOCHI',
  'MUMBAI',
  'CALICUT',
  'NOIDA',
  'ALL'
]);
const paymentInstrumentTypeSchema = z.enum(['CHEQUE', 'DD']);

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid ISO date');
const phoneSchema = z.string().trim().regex(/^\+?[0-9]{8,15}$/, 'Enter a valid phone number');
const postalCodeSchema = z.string().trim().regex(/^[0-9]{5,10}$/, 'Enter a valid postal code');
const panSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Enter a valid PAN');
const aadhaarSchema = z.string().trim().regex(/^[0-9]{12}$/, 'Enter a valid Aadhaar number');

const addressSchema = z.object({
  street1: z.string().trim().min(3),
  street2: z.string().trim(),
  street3: z.string().trim(),
  city: z.string().trim().min(2),
  postalCode: postalCodeSchema,
  state: z.string().trim().min(2),
  country: z.string().trim().min(2),
  landmark: z.string().trim()
});

const applicantSchema = z.object({
  salutation: salutationSchema,
  fullName: z.string().trim().min(2),
  customerId: z.string().trim(),
  dateOfBirth: dateStringSchema,
  relationLabel: relationLabelSchema,
  relationName: z.string().trim().min(2),
  panNumber: panSchema,
  aadhaarNumber: aadhaarSchema,
  email: z.string().trim().email(),
  correspondenceAddress: addressSchema,
  permanentAddress: addressSchema,
  companyName: z.string().trim(),
  residencePhone: z.string().trim(),
  mobile: phoneSchema,
  alternateMobile: z.string().trim()
});

const professionalDetailsSchema = z.object({
  industry: industrySchema,
  industryOther: z.string().trim(),
  function: functionSchema,
  functionOther: z.string().trim(),
  annualIncomeBracket: incomeBracketSchema,
  isExistingCustomer: z.boolean(),
  ownedProjectName: z.string().trim(),
  ownedProjectCity: z.string().trim()
});

const purchaseDetailsSchema = z.object({
  paymentSource: paymentSourceSchema,
  homeLoanProvider: z.string().trim(),
  purchasePurpose: purchasePurposeSchema,
  purchasePurposeOther: z.string().trim(),
  interestedInOtherProjects: z.boolean(),
  projectNature: projectNatureSchema,
  preferredLocations: z.array(preferredLocationSchema).min(1)
});

const channelPartnerDetailsSchema = z.object({
  companyName: z.string().trim().min(2),
  individualName: z.string().trim().min(2),
  reraRegistrationNo: z.string().trim().min(3),
  vendorId: z.string().trim().min(1)
});

const paymentDetailsSchema = z.object({
  instrumentType: paymentInstrumentTypeSchema,
  instrumentNumber: z.string().trim().min(3),
  instrumentDate: dateStringSchema
});

const declarationsSchema = z.object({
  acceptedTerms: z.literal(true),
  acceptedAccuracyDeclaration: z.literal(true),
  primaryApplicantSignedName: z.string().trim().min(2),
  primaryApplicantSignedOn: dateStringSchema,
  coApplicantSignedNames: z.array(z.string().trim()),
  coApplicantSignedDates: z.array(dateStringSchema)
});

const applicationSchema = z.object({
  isChannelPartnerBooking: z.boolean(),
  dateOfBooking: dateStringSchema,
  salesOrder: z.string().trim(),
  enquiryNo: z.string().trim(),
  primaryApplicant: applicantSchema,
  coApplicants: z.array(applicantSchema).max(1),
  professionalDetails: professionalDetailsSchema,
  purchaseDetails: purchaseDetailsSchema,
  channelPartnerDetails: channelPartnerDetailsSchema.nullable(),
  paymentDetails: paymentDetailsSchema,
  declarations: declarationsSchema
}).superRefine((application, ctx) => {
  if (application.isChannelPartnerBooking && !application.channelPartnerDetails) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['channelPartnerDetails'],
      message: 'Channel partner details are required'
    });
  }

  if (!application.isChannelPartnerBooking && application.channelPartnerDetails) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['channelPartnerDetails'],
      message: 'Channel partner details should be omitted when not applicable'
    });
  }

  if (application.purchaseDetails.paymentSource === 'HOME_LOAN' && !application.purchaseDetails.homeLoanProvider.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['purchaseDetails', 'homeLoanProvider'],
      message: 'Preferred bank/HFI is required for home loan payments'
    });
  }

  if (application.purchaseDetails.purchasePurpose === 'OTHER' && !application.purchaseDetails.purchasePurposeOther.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['purchaseDetails', 'purchasePurposeOther'],
      message: 'Specify the purchase purpose'
    });
  }

  if (application.professionalDetails.industry === 'OTHER' && !application.professionalDetails.industryOther.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['professionalDetails', 'industryOther'],
      message: 'Specify the industry'
    });
  }

  if (application.professionalDetails.function === 'OTHER' && !application.professionalDetails.functionOther.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['professionalDetails', 'functionOther'],
      message: 'Specify the function'
    });
  }

  if (application.professionalDetails.isExistingCustomer) {
    if (!application.professionalDetails.ownedProjectName.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['professionalDetails', 'ownedProjectName'],
        message: 'Project name is required for existing customers'
      });
    }
    if (!application.professionalDetails.ownedProjectCity.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['professionalDetails', 'ownedProjectCity'],
        message: 'Project city is required for existing customers'
      });
    }
  }

  if (application.declarations.coApplicantSignedNames.length !== application.coApplicants.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['declarations', 'coApplicantSignedNames'],
      message: 'Co-applicant signature names must match the number of co-applicants'
    });
  }

  if (application.declarations.coApplicantSignedDates.length !== application.coApplicants.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['declarations', 'coApplicantSignedDates'],
      message: 'Co-applicant signature dates must match the number of co-applicants'
    });
  }
});

const createBookingSchema = z.object({
  unitId: z.string().uuid(),
  bookingAmount: z.number().positive(),
  application: applicationSchema
});

export function registerCreateBookingRoute(router: Router): void {
  router.post('/', validate({ body: createBookingSchema }), async (req, res) => {
    const userId = getAuthUserId(req);
    const { unitId, bookingAmount, application } = req.body;

    const { booking, costSheet } = await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.findUnique({ where: { id: unitId } });

      if (!unit) {
        throw new AppError(404, 'UNIT_NOT_FOUND', 'Unit not found');
      }

      const reserved = await tx.unit.updateMany({
        where: {
          id: unitId,
          status: UnitStatus.AVAILABLE
        },
        data: { status: UnitStatus.RESERVED }
      });

      if (reserved.count !== 1) {
        throw new AppError(409, 'UNIT_NOT_AVAILABLE', 'Unit is not available for booking');
      }

      const booking = await tx.booking.create({
        data: {
          userId,
          unitId,
          bookingAmount,
          bookingStatus: BookingStatus.PENDING_PAYMENT
        }
      });

      const calculated = computeCostSheet(unit.price);
      const unitSnapshot = {
        tower: unit.tower,
        unitNumber: unit.unitNumber,
        superBuiltUpAreaSqft: unit.areaSqft,
        carpetAreaSqft: unit.areaSqft,
        carparksReserved: 0,
        saleValue: calculated.total
      };

      await tx.$executeRawUnsafe(
        `INSERT INTO "BookingApplication"
          ("id", "bookingId", "isChannelPartnerBooking", "coApplicantCount", "primaryApplicant", "coApplicants",
           "professionalDetails", "purchaseDetails", "channelPartnerDetails", "paymentDetails", "unitSnapshot", "declarations", "createdAt", "updatedAt")
         VALUES
          (CAST($1 AS uuid), CAST($2 AS uuid), $3, $4, CAST($5 AS jsonb), CAST($6 AS jsonb), CAST($7 AS jsonb), CAST($8 AS jsonb), CAST($9 AS jsonb), CAST($10 AS jsonb), CAST($11 AS jsonb), CAST($12 AS jsonb), NOW(), NOW())`,
        randomUUID(),
        booking.id,
        application.isChannelPartnerBooking,
        application.coApplicants.length,
        JSON.stringify(application.primaryApplicant),
        JSON.stringify(application.coApplicants),
        JSON.stringify(application.professionalDetails),
        JSON.stringify(application.purchaseDetails),
        JSON.stringify(application.channelPartnerDetails),
        JSON.stringify(application.paymentDetails),
        JSON.stringify(unitSnapshot),
        JSON.stringify(application.declarations)
      );

      await tx.user.update({
        where: { id: userId },
        data: {
          name: application.primaryApplicant.fullName,
          phone: application.primaryApplicant.mobile,
          email: application.primaryApplicant.email,
          address: application.primaryApplicant.correspondenceAddress.street1
        }
      });

      await tx.kycDocument.upsert({
        where: { userId },
        update: {
          panNumber: application.primaryApplicant.panNumber,
          aadhaarNumber: application.primaryApplicant.aadhaarNumber
        },
        create: {
          userId,
          panNumber: application.primaryApplicant.panNumber,
          aadhaarNumber: application.primaryApplicant.aadhaarNumber
        }
      });

      const costSheet = await tx.costSheet.create({
        data: {
          bookingId: booking.id,
          ...calculated
        }
      });

      return { booking, costSheet };
    });

    res.status(201).json({
      booking,
      costSheet,
      applicationSummary: {
        isChannelPartnerBooking: application.isChannelPartnerBooking,
        coApplicantCount: application.coApplicants.length,
        primaryApplicantName: application.primaryApplicant.fullName
      }
    });
  });
}
