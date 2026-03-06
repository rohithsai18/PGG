import { BookingStatus, PrismaClient, UnitStatus } from '@prisma/client';

const prisma = new PrismaClient();

function computeCostSheet(basePrice: number) {
  const gstPercent = Number(process.env.CHARGE_GST_PERCENT ?? 5);
  const registrationPercent = Number(process.env.CHARGE_REGISTRATION_PERCENT ?? 2);
  const otherCharges = Number(process.env.CHARGE_OTHER_FIXED ?? 250000);
  const formulaVersion = process.env.COST_SHEET_FORMULA_VERSION ?? 'v1';

  const gst = Math.round((basePrice * gstPercent) / 100);
  const registration = Math.round((basePrice * registrationPercent) / 100);
  const total = basePrice + gst + registration + otherCharges;

  return {
    basePrice,
    gst,
    registration,
    otherCharges,
    total,
    formulaVersion
  };
}

async function main() {
  const user1 = await prisma.user.upsert({
    where: { phone: '9999900001' },
    update: {
      name: 'Demo User One',
      email: 'demo1@example.com',
      address: 'Downtown Residence, City'
    },
    create: {
      phone: '9999900001',
      name: 'Demo User One',
      email: 'demo1@example.com',
      address: 'Downtown Residence, City'
    }
  });

  await prisma.user.upsert({
    where: { phone: '9999900002' },
    update: {
      name: 'Demo User Two',
      email: 'demo2@example.com',
      address: 'Sunrise Apartments, City'
    },
    create: {
      phone: '9999900002',
      name: 'Demo User Two',
      email: 'demo2@example.com',
      address: 'Sunrise Apartments, City'
    }
  });

  const unitsData = Array.from({ length: 24 }, (_, idx) => {
    const tower = `T-${Math.floor(idx / 8) + 1}`;
    const unitNumber = `${Math.floor((idx % 8) + 1)}0${(idx % 4) + 1}`;
    return {
      tower,
      unitNumber,
      areaSqft: 900 + idx * 25,
      price: 5000000 + idx * 200000,
      status: UnitStatus.AVAILABLE
    };
  });

  for (const unit of unitsData) {
    await prisma.unit.upsert({
      where: {
        tower_unitNumber: {
          tower: unit.tower,
          unitNumber: unit.unitNumber
        }
      },
      update: {
        areaSqft: unit.areaSqft,
        price: unit.price,
        status: unit.status
      },
      create: unit
    });
  }

  const showcaseUnit = await prisma.unit.findFirst({ where: { status: UnitStatus.AVAILABLE } });
  if (!showcaseUnit) {
    return;
  }

  const existingShowcase = await prisma.booking.findFirst({
    where: {
      userId: user1.id,
      bookingStatus: BookingStatus.CONFIRMED
    }
  });

  if (!existingShowcase) {
    const booking = await prisma.booking.create({
      data: {
        userId: user1.id,
        unitId: showcaseUnit.id,
        bookingAmount: 200000,
        bookingStatus: BookingStatus.CONFIRMED,
        paymentRef: 'PAY-SEED1234'
      }
    });

    await prisma.unit.update({
      where: { id: showcaseUnit.id },
      data: { status: UnitStatus.BOOKED }
    });

    const costSheet = computeCostSheet(showcaseUnit.price);
    await prisma.costSheet.create({
      data: {
        bookingId: booking.id,
        ...costSheet
      }
    });
  }

  await prisma.kycDocument.upsert({
    where: { userId: user1.id },
    update: {
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123412341234'
    },
    create: {
      userId: user1.id,
      panNumber: 'ABCDE1234F',
      aadhaarNumber: '123412341234'
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
