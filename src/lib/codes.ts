/** Alfabeto sem 0/O/1/I/L para o código ser ditado sem ambiguidade no balcão. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomChars(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Palavras que não identificam a barbearia e por isso não entram na sigla. */
const GENERIC_WORDS = new Set([
  "BARBEARIA",
  "BARBEARIAS",
  "BARBER",
  "BARBERSHOP",
  "SHOP",
  "SALAO",
  "STUDIO",
  "ESTUDIO",
  "THE",
  "DE",
  "DA",
  "DO",
  "DAS",
  "DOS",
  "E",
]);

/**
 * Sigla da barbearia usada no começo da carteirinha: "MJ Barbearia" → `MJ`,
 * "Navalha de Ouro" → `NO`, "Barbearia do Zé" → `ZE`.
 *
 * Os códigos já emitidos ficam como estão — a busca é pelo código inteiro,
 * nunca pelo prefixo —, então mudar o nome da barbearia não invalida nenhuma
 * carteirinha.
 */
export function memberCodePrefix(tenantName: string): string {
  const words = tenantName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  const meaningful = words.filter((w) => !GENERIC_WORDS.has(w));
  const pool = meaningful.length > 0 ? meaningful : words;
  if (pool.length === 0) return "MC";

  const [first] = pool;
  let prefix: string;
  if (first.length <= 4) prefix = first;
  else if (pool.length === 1) prefix = first.slice(0, 3);
  else prefix = pool.slice(0, 3).map((w) => w[0]).join("");

  return prefix.length >= 2 ? prefix : `${prefix}${pool[1]?.[0] ?? "C"}`.slice(0, 4);
}

/** Carteirinha do membro, ex.: `MJ-7K42-9QX`. */
export function generateMemberCode(prefix = "MJ"): string {
  return `${prefix}-${randomChars(4)}-${randomChars(3)}`;
}

/** Código de resgate mostrado ao parceiro, ex.: `K7P2QX`. */
export function generateRedemptionCode(): string {
  return randomChars(6);
}

/** Quanto tempo um resgate fica válido depois de gerado. */
export const REDEMPTION_TTL_MS = 24 * 60 * 60 * 1000;
