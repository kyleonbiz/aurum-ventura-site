import crypto from 'crypto';

export function generateUniqueId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function calculateProgress(
  currentStep: number,
  totalSteps: number
): number {
  if (totalSteps === 0) return 0;
  return Math.round((currentStep / totalSteps) * 100);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
}
