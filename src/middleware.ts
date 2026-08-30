import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Basic Auth nos painéis internos.
 *
 * A POC não tem autenticação de verdade: em `/entrar` qualquer um clica em
 * "sou da equipe" e abre a agenda com telefone dos clientes. Em `localhost`
 * isso era inofensivo; com o site publicado, não. Até entrar o login por OTP
 * (docs/ARCHITECTURE.md §7), estes caminhos ficam atrás de usuário e senha.
 *
 * Só cobre `/admin` e `/parceiro`. Landing, agendamento, clube e a área do
 * membro seguem abertos — é o produto.
 */
export const config = {
  matcher: ["/admin/:path*", "/parceiro/:path*"],
};

/**
 * Compara comparando digests, não os textos.
 *
 * Um `===` sai no primeiro byte diferente, e esse tempo conta caracter a
 * caracter para quem estiver medindo. O SHA-256 também iguala o tamanho, então
 * nem o comprimento da senha vaza.
 */
async function matches(given: string, expected: string): Promise<boolean> {
  const digest = async (v: string) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v)));

  const [a, b] = await Promise.all([digest(given), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function askForCredentials(): NextResponse {
  return new NextResponse("Acesso restrito.", {
    status: 401,
    headers: {
      // Só ASCII: cabeçalho HTTP é ByteString, e um caractere acima de 255
      // (um travessão, um acento) faz a resposta estourar com 500.
      "WWW-Authenticate": 'Basic realm="MJCLUB area interna", charset="UTF-8"',
    },
  });
}

export async function middleware(request: NextRequest) {
  const user = process.env.MJCLUB_ADMIN_USER;
  const password = process.env.MJCLUB_ADMIN_PASSWORD;

  // Sem credenciais configuradas: em produção fecha, porque a alternativa é
  // servir o painel da barbearia para a internet inteira. Em desenvolvimento
  // libera, para não atrapalhar quem está rodando local.
  if (!user || !password) {
    if (process.env.NODE_ENV === "production") return askForCredentials();
    return NextResponse.next();
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return askForCredentials();

  let decoded: string;
  try {
    decoded = atob(header.slice("Basic ".length));
  } catch {
    return askForCredentials();
  }

  // A senha pode conter ":", então só o primeiro separa usuário de senha.
  const separator = decoded.indexOf(":");
  if (separator < 0) return askForCredentials();

  const [okUser, okPassword] = await Promise.all([
    matches(decoded.slice(0, separator), user),
    matches(decoded.slice(separator + 1), password),
  ]);

  return okUser && okPassword ? NextResponse.next() : askForCredentials();
}
