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

export function createMockPrisma() {
  const users = new Map<string, User>();
  const usersByPhone = new Map<string, string>();
  const otpRequests = new Map<string, OtpRequest>();
  const units = new Map<string, Unit>();
  const bookings = new Map<string, Booking>();
  const costSheets = new Map<string, CostSheet>();

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
  units.set(seedUnit.id, seedUnit);
  units.set(seedReservedUnit.id, seedReservedUnit);

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
      findUnique: async () => null,
      upsert: async ({ where, create, update }: any) => ({ id: randomUUID(), userId: where.userId, ...create, ...update, updatedAt: now() }),
      update: async ({ where, data }: any) => ({ id: randomUUID(), userId: where.userId, ...data, updatedAt: now() })
    },
    unit: {
      findMany: async ({ where }: any) => {
        const list = Array.from(units.values());
        if (!where?.status) {
          return list;
        }
        return list.filter((u) => u.status === where.status);
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
