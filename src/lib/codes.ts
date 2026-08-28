/** Alfabeto sem 0/O/1/I/L para o código ser ditado sem ambiguidade no balcão. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomChars(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Carteirinha do membro, ex.: `MJ-7K42-9QX`. */
export function generateMemberCode(): string {
  return `MJ-${randomChars(4)}-${randomChars(3)}`;
}

/** Código de resgate mostrado ao parceiro, ex.: `K7P2QX`. */
export function generateRedemptionCode(): string {
  return randomChars(6);
}

/** Quanto tempo um resgate fica válido depois de gerado. */
export const REDEMPTION_TTL_MS = 24 * 60 * 60 * 1000;
