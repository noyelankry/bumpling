const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

export function isValidPhoneNumber(number: string): boolean {
  const digits = number.replace(/\D/g, '')
  return digits.length >= 6 && digits.length <= 14
}
