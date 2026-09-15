/**
 * Endereço de cada barbearia: `mjclub.com.br/<slug>`.
 *
 * O slug divide a raiz do site com as páginas do próprio MJCLUB. Qualquer
 * palavra que já é (ou vai ser) uma rota nossa não pode virar barbearia — senão
 * uma barbearia chamada "admin" tomaria o painel, ou uma chamada "precos"
 * esconderia a página de preços. Esta lista é a fronteira; o cadastro da fase 4
 * deve recusar tudo que estiver aqui.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // rotas que existem hoje
  "admin",
  "agendar",
  "api",
  "clube",
  "entrar",
  "minha-conta",
  "parceiro",
  "parceiros",
  // rotas previstas do produto
  "cadastro",
  "cadastrar",
  "conta",
  "contratar",
  "planos",
  "precos",
  "painel",
  "login",
  "logout",
  "sair",
  "signup",
  "assinar",
  "assinatura",
  "checkout",
  "pagamento",
  "sobre",
  "contato",
  "ajuda",
  "suporte",
  "blog",
  "termos",
  "privacidade",
  "lgpd",
  "app",
  "dashboard",
  "configuracoes",
  "barbearias",
  "barbearia",
  "mjclub",
  "www",
  "mail",
  "email",
  // arquivos e pastas técnicas servidos na raiz
  "_next",
  "static",
  "public",
  "assets",
  "images",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  "manifest.webmanifest",
  "sw.js",
  ".well-known",
  "health",
]);

/** Só minúsculas, dígitos e hífen no meio; de 3 a 40 caracteres. */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

/** Verdadeiro quando o slug tem formato válido e não colide com rota nossa. */
export function slugValido(slug: string): boolean {
  if (typeof slug !== "string") return false;
  if (!SLUG_PATTERN.test(slug)) return false;
  if (slug.includes("--")) return false;
  return !RESERVED_SLUGS.has(slug);
}

/**
 * Sugestão de slug a partir do nome ("Barbearia do Zé" → "barbearia-do-ze").
 * Não garante que o resultado seja válido: passe por `slugValido` depois.
 */
export function sugerirSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
