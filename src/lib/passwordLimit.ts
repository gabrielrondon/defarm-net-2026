// O backend usa bcrypt, que só considera os primeiros 72 bytes da senha. Senha nova acima disso é
// recusada pelo servidor (400); aqui o formulário avisa antes. O limite é em BYTES (UTF-8): uma
// letra acentuada conta 2.
export const MAX_PASSWORD_BYTES = 72;

export function passwordBytes(password: string): number {
  return new TextEncoder().encode(password).length;
}

export function passwordTooLong(password: string): boolean {
  return passwordBytes(password) > MAX_PASSWORD_BYTES;
}
