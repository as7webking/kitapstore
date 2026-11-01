export const recoveryFields = [
  { name: 'email', label: "auth:email", type: 'email', autoComplete: 'email', maxLength: 254,
    validate: (value) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? "auth:enter_a_valid_email_address" : '' },
];
export const newPasswordFields = [
  { name: 'password', label: "auth:new_password", type: 'password', autoComplete: 'new-password',
    hint: "auth:at_least_8_characters_up_to_72_utf_8_bytes",
    validate: (value) => !value.trim() || value.length < 8 || new TextEncoder().encode(value).length > 72 ? "auth:use_at_least_8_characters_and_at_most_72_utf_8_bytes" : '' },
  { name: 'confirmPassword', label: "auth:confirm_password", type: 'password', autoComplete: 'new-password',
    validate: (value, values) => value !== values.password ? "auth:passwords_must_match" : '' },
];
export function readResetToken(fragment) {
  const token = new URLSearchParams(fragment.replace(/^#/, '')).get('token');
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) ? token : '';
}
