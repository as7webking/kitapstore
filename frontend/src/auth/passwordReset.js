export const recoveryFields = [
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 254,
    validate: (value) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? 'Enter a valid email address.' : '' },
];
export const newPasswordFields = [
  { name: 'password', label: 'New password', type: 'password', autoComplete: 'new-password',
    hint: 'At least 8 characters; up to 72 UTF-8 bytes.',
    validate: (value) => !value.trim() || value.length < 8 || new TextEncoder().encode(value).length > 72 ? 'Use at least 8 characters and at most 72 UTF-8 bytes.' : '' },
  { name: 'confirmPassword', label: 'Confirm password', type: 'password', autoComplete: 'new-password',
    validate: (value, values) => value !== values.password ? 'Passwords must match.' : '' },
];
export function readResetToken(fragment) {
  const token = new URLSearchParams(fragment.replace(/^#/, '')).get('token');
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) ? token : '';
}
