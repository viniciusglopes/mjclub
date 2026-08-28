import Link from "next/link";

import { getSession } from "@/lib/session";

const NAV = [
  { href: "/agendar", label: "Agendar" },
  { href: "/clube", label: "Clube" },
  { href: "/clube/parceiros", label: "Parceiros" },
];

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-gold font-black text-ink">
            MJ
          </span>
          <span className="text-lg font-bold tracking-tight">CLUB</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-cream">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href={session?.kind === "member" ? "/minha-conta" : "/entrar"}
          className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold hover:border-gold hover:text-gold"
        >
          {session?.kind === "member" ? "Minha conta" : "Entrar"}
        </Link>
      </div>
    </header>
  );
}
