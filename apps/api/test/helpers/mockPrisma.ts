import { BookingStatus, UnitStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

type User = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type OtpRequest = {
  id: string;
  phone: string;
  otp: string;
  expiresAt: Date;
  verifiedAt: Date | null;
  createdAt: Date;
};

type Unit = {
  id: string;
  tower: string;
  unitNumber: string;
  areaSqft: number;
  price: number;
  status: UnitStatus;
  createdAt: Date;
  updatedAt: Date;
};

type Booking = {
  id: string;
  userId: string;
  unitId: string;
  bookingAmount: number;
  bookingStatus: BookingStatus;
  paymentRef: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type BookingApplication = {
  id: string;
  bookingId: string;
  isChannelPartnerBooking: boolean;
  coApplicantCount: number;
  primaryApplicant: unknown;
  coApplicants: unknown;
  professionalDetails: unknown;
  purchaseDetails: unknown;
  channelPartnerDetails: unknown;
  paymentDetails: unknown;
  unitSnapshot: unknown;
  declarations: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type KycDocument = {
  id: string;
  userId: string;
  panNumber: string;
  aadhaarNumber: string;
  panFileUrl: string | null;
  aadhaarFileUrl: string | null;
  updatedAt: Date;
};

type CostSheet = {
  id: string;
  bookingId: string;
  basePrice: number;
  gst: number;
  registration: number;
  otherCharges: number;
  total: number;
  formulaVersion: string;
  createdAt: Date;
};

function now() {
  return new Date();
}

function matchesUnitWhere(unit: Unit, where?: any) {
  if (!where) {
    return true;
  }

  if (where.status && unit.status !== where.status) {
    return false;
  }

  if (where.tower && unit.tower !== where.tower) {
    return false;
  }

  if (Array.isArray(where.OR) && where.OR.length > 0) {
    const matchesOr = where.OR.some((clause: any) => {
      if (clause.tower?.contains) {
        return unit.tower.toLowerCase().includes(String(clause.tower.contains).toLowerCase());
      }
      if (clause.unitNumber?.contains) {
        return unit.unitNumber.toLowerCase().includes(String(clause.unitNumber.contains).toLowerCase());
      }
      return false;
    });

    if (!matchesOr) {
      return false;
    }
  }

  return true;
}

export function createMockPrisma() {
  const users = new Map<string, User>();
  const usersByPhone = new Map<string, string>();
  const otpRequests = new Map<string, OtpRequest>();
  const units = new Map<string, Unit>();
  const bookings = new Map<string, Booking>();
  const bookingApplications = new Map<string, BookingApplication>();
  const costSheets = new Map<string, CostSheet>();
  const kycDocuments = new Map<string, KycDocument>();

  const seedUnit: Unit = {
    id: randomUUID(),
    tower: 'T-1',
    unitNumber: '101',
    areaSqft: 1000,
    price: 7000000,
    status: UnitStatus.AVAILABLE,
    createdAt: now(),
    updatedAt: now()
  };
  const seedReservedUnit: Unit = {
    id: randomUUID(),
    tower: 'T-1',
    unitNumber: '102',
    areaSqft: 1020,
    price: 7100000,
    status: UnitStatus.RESERVED,
    createdAt: now(),
    updatedAt: now()
  };
  const extraUnits: Unit[] = [
    {
      id: randomUUID(),
      tower: 'T-1',
      unitNumber: '103',
      areaSqft: 1040,
      price: 7200000,
      status: UnitStatus.AVAILABLE,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: randomUUID(),
      tower: 'T-2',
      unitNumber: '201',
      areaSqft: 1100,
      price: 8100000,
      status: UnitStatus.AVAILABLE,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: randomUUID(),
      tower: 'T-2',
      unitNumber: '202',
      areaSqft: 1125,
      price: 8300000,
      status: UnitStatus.AVAILABLE,
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: randomUUID(),
      tower: 'T-3',
      unitNumber: '301',
      areaSqft: 1180,
      price: 9100000,
      status: UnitStatus.BOOKED,
      createdAt: now(),
      updatedAt: now()
    }
  ];
  units.set(seedUnit.id, seedUnit);
  units.set(seedReservedUnit.id, seedReservedUnit);
  for (const unit of extraUnits) {
    units.set(unit.id, unit);
  }

  const prisma = {
    otpRequest: {
      create: async ({ data }: any) => {
        const row: OtpRequest = {
          id: randomUUID(),
          phone: data.phone,
          otp: data.otp,
          expiresAt: data.expiresAt,
          verifiedAt: null,
          createdAt: now()
        };
        otpRequests.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }: any) => {
        return otpRequests.get(where.id) ?? null;
      },
      update: async ({ where, data }: any) => {
        const row = otpRequests.get(where.id);
        if (!row) {
          throw new Error('OTP request not found');
        }
        const updated = { ...row, ...data };
        otpRequests.set(where.id, updated);
        return updated;
      }
    },
    user: {
      upsert: async ({ where, create, update }: any) => {
        const existingId = usersByPhone.get(where.phone);
        if (existingId) {
          const existing = users.get(existingId)!;
          const merged = { ...existing, ...update, updatedAt: now() };
          users.set(existing.id, merged);
          return merged;
        }

        const row: User = {
          id: randomUUID(),
          name: create.name,
          phone: create.phone,
          email: create.email ?? null,
          address: create.address ?? null,
          createdAt: now(),
          updatedAt: now()
        };
        users.set(row.id, row);
        usersByPhone.set(row.phone, row.id);
        return row;
      },
      findUnique: async ({ where }: any) => {
        return users.get(where.id) ?? null;
      },
      update: async ({ where, data }: any) => {
        const user = users.get(where.id);
        if (!user) {
          throw new Error('User not found');
        }
        const next = { ...user, ...data, updatedAt: now() };
        users.set(where.id, next);
        if (data.phone && data.phone !== user.phone) {
          usersByPhone.delete(user.phone);
          usersByPhone.set(data.phone, next.id);
        }
        return next;
      }
    },
    kycDocument: {
      findUnique: async ({ where }: any) => {
        return Array.from(kycDocuments.values()).find((doc) => doc.userId === where.userId) ?? null;
      },
      upsert: async ({ where, create, update }: any) => {
        const existing = Array.from(kycDocuments.values()).find((doc) => doc.userId === where.userId);
        if (existing) {
          const next: KycDocument = { ...existing, ...update, updatedAt: now() };
          kycDocuments.set(existing.id, next);
          return next;
        }

        const row: KycDocument = {
          id: randomUUID(),
          userId: create.userId,
          panNumber: create.panNumber,
          aadhaarNumber: create.aadhaarNumber,
          panFileUrl: create.panFileUrl ?? null,
          aadhaarFileUrl: create.aadhaarFileUrl ?? null,
          updatedAt: now()
        };
        kycDocuments.set(row.id, row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const existing = Array.from(kycDocuments.values()).find((doc) => doc.userId === where.userId);
        if (!existing) {
          throw new Error('KYC not found');
        }
        const next: KycDocument = { ...existing, ...data, updatedAt: now() };
        kycDocuments.set(existing.id, next);
        return next;
      }
    },
    unit: {
      findMany: async (args: any = {}) => {
        const { where, orderBy, skip, take, distinct, select } = args;
        let list = Array.from(units.values()).filter((unit) => matchesUnitWhere(unit, where));

        if (orderBy) {
          const orderRules = Array.isArray(orderBy) ? orderBy : [orderBy];
          list.sort((a, b) => {
            for (const rule of orderRules) {
              const [field, direction] = Object.entries(rule)[0] as [keyof Unit, 'asc' | 'desc'];
              const comparison = String(a[field]).localeCompare(String(b[field]), undefined, { numeric: true });
              if (comparison !== 0) {
                return direction === 'desc' ? -comparison : comparison;
              }
            }
            return 0;
          });
        }

        if (Array.isArray(distinct) && distinct.length > 0) {
          const seen = new Set<string>();
          list = list.filter((unit) => {
            const key = distinct.map((field) => String((unit as any)[field])).join('|');
            if (seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          });
        }

        const sliced = list.slice(skip ?? 0, take ? (skip ?? 0) + take : undefined);

        if (select?.tower) {
          return sliced.map((unit) => ({ tower: unit.tower }));
        }

        return sliced;
      },
      count: async ({ where }: any = {}) => {
        return Array.from(units.values()).filter((unit) => matchesUnitWhere(unit, where)).length;
      },
      findUnique: async ({ where }: any) => {
        return units.get(where.id) ?? null;
      },
      findUniqueOrThrow: async ({ where }: any) => {
        const unit = units.get(where.id);
        if (!unit) {
          throw new Error('Unit not found');
        }
        return unit;
      },
      updateMany: async ({ where, data }: any) => {
        const unit = units.get(where.id);
        if (!unit) {
          return { count: 0 };
        }

        if (where.status && unit.status !== where.status) {
          return { count: 0 };
        }

        const next = { ...unit, ...data, updatedAt: now() };
        units.set(unit.id, next);
        return { count: 1 };
      },
      update: async ({ where, data }: any) => {
        const unit = units.get(where.id);
        if (!unit) {
          throw new Error('Unit not found');
        }
        const next = { ...unit, ...data, updatedAt: now() };
        units.set(where.id, next);
        return next;
      }
    },
    booking: {
      create: async ({ data }: any) => {
        const row: Booking = {
          id: randomUUID(),
          userId: data.userId,
          unitId: data.unitId,
          bookingAmount: data.bookingAmount,
          bookingStatus: data.bookingStatus,
          paymentRef: data.paymentRef ?? null,
          createdAt: now(),
          updatedAt: now()
        };
        bookings.set(row.id, row);
        return row;
      },
      findUnique: async ({ where, include }: any) => {
        const row = bookings.get(where.id);
        if (!row) {
          return null;
        }
        if (!include) {
          return row;
        }

        return {
          ...row,
          unit: include.unit ? units.get(row.unitId) ?? null : undefined,
          costSheet: include.costSheet
            ? Array.from(costSheets.values()).find((c) => c.bookingId === row.id) ?? null
            : undefined,
          user: include.user ? users.get(row.userId) ?? null : undefined
        };
      },
      update: async ({ where, data }: any) => {
        const row = bookings.get(where.id);
        if (!row) {
          throw new Error('Booking not found');
        }
        const next = { ...row, ...data, updatedAt: now() };
        bookings.set(where.id, next);
        return next;
      },
      findMany: async ({ where, include }: any) => {
        const rows = Array.from(bookings.values())
          .filter((r) => !where?.userId || r.userId === where.userId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return rows.map((row) => ({
          ...row,
          unit: include?.unit ? units.get(row.unitId) ?? null : undefined,
          costSheet: include?.costSheet
            ? Array.from(costSheets.values()).find((c) => c.bookingId === row.id) ?? null
            : undefined
        }));
      }
    },
    bookingApplication: {
      create: async ({ data }: any) => {
        const row: BookingApplication = {
          id: randomUUID(),
          bookingId: data.bookingId,
          isChannelPartnerBooking: data.isChannelPartnerBooking,
          coApplicantCount: data.coApplicantCount,
          primaryApplicant: data.primaryApplicant,
          coApplicants: data.coApplicants,
          professionalDetails: data.professionalDetails ?? null,
          purchaseDetails: data.purchaseDetails ?? null,
          channelPartnerDetails: data.channelPartnerDetails ?? null,
          paymentDetails: data.paymentDetails ?? null,
          unitSnapshot: data.unitSnapshot,
          declarations: data.declarations,
          createdAt: now(),
          updatedAt: now()
        };
        bookingApplications.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }: any) => {
        return Array.from(bookingApplications.values()).find((row) => row.bookingId === where.bookingId) ?? null;
      }
    },
    costSheet: {
      create: async ({ data }: any) => {
        const row: CostSheet = {
          id: randomUUID(),
          bookingId: data.bookingId,
          basePrice: data.basePrice,
          gst: data.gst,
          registration: data.registration,
          otherCharges: data.otherCharges,
          total: data.total,
          formulaVersion: data.formulaVersion,
          createdAt: now()
        };
        costSheets.set(row.id, row);
        return row;
      }
    },
    $transaction: async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(prisma);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      throw new Error('Unsupported transaction usage');
    },
    $executeRawUnsafe: async (query: string, ...args: any[]) => {
      if (query.includes('"BookingApplication"')) {
        const row: BookingApplication = {
          id: args[0],
          bookingId: args[1],
          isChannelPartnerBooking: args[2],
          coApplicantCount: args[3],
          primaryApplicant: JSON.parse(args[4]),
          coApplicants: JSON.parse(args[5]),
          professionalDetails: JSON.parse(args[6]),
          purchaseDetails: JSON.parse(args[7]),
          channelPartnerDetails: JSON.parse(args[8]),
          paymentDetails: JSON.parse(args[9]),
          unitSnapshot: JSON.parse(args[10]),
          declarations: JSON.parse(args[11]),
          createdAt: now(),
          updatedAt: now()
        };
        bookingApplications.set(row.id, row);
        return 1;
      }
      return 0;
    }
  };

  return {
    prisma,
    seed: {
      availableUnitId: seedUnit.id,
      reservedUnitId: seedReservedUnit.id
    }
  };
}
