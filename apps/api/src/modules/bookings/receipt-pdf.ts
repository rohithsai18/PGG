type ReceiptField = {
  label: string;
  value: string;
};

export type ReceiptPdfData = {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  unitLabel: string;
  bookingAmount: number;
  bookingStatus: string;
  paymentRef?: string | null;
  costSheetTotal?: number | null;
  generatedAt: string;
};

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

function wrapLine(value: string, maxLength = 72): string[] {
  if (value.length <= maxLength) {
    return [value];
  }

  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
}

function buildReceiptFields(data: ReceiptPdfData): ReceiptField[] {
  return [
    { label: 'Receipt ID', value: data.bookingId },
    { label: 'Generated At', value: new Date(data.generatedAt).toLocaleString('en-IN') },
    { label: 'Customer Name', value: data.customerName },
    { label: 'Customer Phone', value: data.customerPhone },
    { label: 'Unit', value: data.unitLabel },
    { label: 'Booking Status', value: data.bookingStatus },
    { label: 'Booking Amount', value: formatCurrency(data.bookingAmount) },
    ...(data.paymentRef ? [{ label: 'Payment Reference', value: data.paymentRef }] : []),
    ...(typeof data.costSheetTotal === 'number' ? [{ label: 'Cost Sheet Total', value: formatCurrency(data.costSheetTotal) }] : [])
  ];
}

export function buildReceiptPdf(data: ReceiptPdfData): Buffer {
  const fields = buildReceiptFields(data);
  const contentLines: string[] = [
    'BT',
    '/F1 22 Tf',
    '50 790 Td',
    `(Booking Receipt) Tj`,
    'ET',
    'BT',
    '/F1 11 Tf',
    '50 768 Td',
    `(Generated for confirmed booking reference and payment summary.) Tj`,
    'ET'
  ];

  let y = 730;

  for (const field of fields) {
    const wrapped = wrapLine(`${field.label}: ${field.value}`);
    for (const line of wrapped) {
      contentLines.push('BT');
      contentLines.push('/F1 12 Tf');
      contentLines.push(`50 ${y} Td`);
      contentLines.push(`(${escapePdfText(line)}) Tj`);
      contentLines.push('ET');
      y -= 20;
    }
  }

  const stream = contentLines.join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
