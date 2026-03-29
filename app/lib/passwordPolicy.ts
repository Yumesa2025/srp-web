const MIN_PASSWORD_LENGTH = 10;
const SPECIAL_CHARACTER_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

const COMMON_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  '111111',
  '000000',
  '00000000',
  'qwerty',
  'qwerty123',
  'password',
  'password1',
  'password123',
  'admin123',
  'letmein',
  'welcome',
  'welcome123',
  'iloveyou',
  'monkey',
  'dragon',
  'baseball',
  'football',
  'superman',
  'zaq12wsx',
  'asdf1234',
  'asdf12345',
]);

export function validateSignupPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  }

  if (!/[a-z]/.test(password)) {
    return '비밀번호에 영문 소문자를 1자 이상 포함해주세요.';
  }

  if (!/[A-Z]/.test(password)) {
    return '비밀번호에 영문 대문자를 1자 이상 포함해주세요.';
  }

  if (!/\d/.test(password)) {
    return '비밀번호에 숫자를 1자 이상 포함해주세요.';
  }

  if (!SPECIAL_CHARACTER_REGEX.test(password)) {
    return '비밀번호에 특수문자를 1자 이상 포함해주세요.';
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return '너무 흔한 비밀번호는 사용할 수 없습니다. 더 고유한 비밀번호를 입력해주세요.';
  }

  return null;
}
