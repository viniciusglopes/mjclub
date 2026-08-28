import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mjclub.com.br"),
  title: {
    default: "MJCLUB — Barbearia e clube de benefícios",
    template: "%s · MJCLUB",
  },
  description:
    "Agende seu corte na MJ Barbearia e entre no clube de benefícios com descontos na barbearia e em toda a rede de parceiros.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "MJCLUB",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>© {new Date().getFullYear()} MJCLUB · mjclub.com.br</p>
            <nav className="flex gap-4">
              <Link href="/agendar" className="hover:text-gold">
                Agendar
              </Link>
              <Link href="/clube" className="hover:text-gold">
                Clube
              </Link>
              <Link href="/parceiro" className="hover:text-gold">
                Sou parceiro
              </Link>
              <Link href="/admin" className="hover:text-gold">
                Barbearia
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
