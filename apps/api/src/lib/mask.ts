export function maskSensitive(value: string): string {
  if (value.length <= 4) {
    return '*'.repeat(value.length);
  }

  const maskedPart = '*'.repeat(value.length - 4);
  return `${maskedPart}${value.slice(-4)}`;
}
