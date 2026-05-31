const INTERNAL_EMAIL_DOMAIN = 'ronaq.local';

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function usernameToInternalEmail(username: string) {
  const normalized = normalizeUsername(username);
  return normalized.includes('@') ? normalized : `${normalized}@${INTERNAL_EMAIL_DOMAIN}`;
}

export function emailToUsername(email: string) {
  const [username] = email.split('@');
  return username || email;
}

export function isValidUsername(username: string) {
  return /^[a-zA-Z0-9._-]{3,32}$/.test(normalizeUsername(username));
}
