import type { Metadata } from "next";

import "./globals.css";

/**
 * Layout raiz: só o esqueleto. Cada área põe o próprio cabeçalho —
 * a página do produto (`(produto)`), o site de cada barbearia (`[slug]`) e as
 * áreas que ainda são da MJ (`(legado)`).
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://www.mjclub.com.br"),
  title: {
    default: "MJCLUB — sistema para barbearias com clube de benefícios",
    template: "%s · MJCLUB",
  },
  description:
    "Agenda online, equipe, vendas e clientes da sua barbearia num lugar só — com clube de benefícios incluso. R$ 29,90 por usuário ativo por mês.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "MJCLUB",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
