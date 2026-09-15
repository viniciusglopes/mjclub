import Link from "next/link";

import { getSession } from "@/lib/session";
import { isLegacyTenant, tenantInitials } from "@/lib/tenant";
import type { Tenant } from "@/lib/types";

/** Cabeçalho do site de uma barbearia (`/[slug]` e áreas da MJ). */
export async function BarbeariaHeader({ tenant }: { tenant: Tenant }) {
  const base = `/${tenant.slug}`;
  const nav = [
    { href: `${base}/agendar`, label: "Agendar" },
    { href: `${base}/clube`, label: "Clube" },
    { href: `${base}/clube/parceiros`, label: "Parceiros" },
  ];

  // Carteirinha e login ainda são só da MJ (fase 2 traz login por barbearia).
  const legacy = isLegacyTenant(tenant);
  const session = legacy ? await getSession() : null;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href={base} className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold text-sm font-black text-ink">
            {tenantInitials(tenant)}
          </span>
          <span className="truncate text-lg font-bold tracking-tight">{tenant.name}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-cream">
              {item.label}
            </Link>
          ))}
        </nav>

        {legacy ? (
          <Link
            href={session?.kind === "member" ? "/minha-conta" : "/entrar"}
            className="shrink-0 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold hover:border-gold hover:text-gold"
          >
            {session?.kind === "member" ? "Minha conta" : "Entrar"}
          </Link>
        ) : (
          <Link
            href={`${base}/agendar`}
            className="shrink-0 rounded-lg bg-gold px-3.5 py-2 text-sm font-semibold text-ink hover:bg-gold-soft"
          >
            Agendar
          </Link>
        )}
      </div>

      {/* No celular a navegação vira uma faixa rolável logo abaixo do topo. */}
      <nav className="flex gap-5 overflow-x-auto border-t border-line px-4 py-2.5 text-sm text-muted sm:hidden">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="shrink-0 hover:text-cream">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function BarbeariaFooter({ tenant }: { tenant: Tenant }) {
  const base = `/${tenant.slug}`;
  const legacy = isLegacyTenant(tenant);

  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {tenant.name} ·{" "}
          <Link href="/" className="hover:text-gold">
            feito com MJCLUB
          </Link>
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href={`${base}/agendar`} className="hover:text-gold">
            Agendar
          </Link>
          <Link href={`${base}/clube`} className="hover:text-gold">
            Clube
          </Link>
          {legacy ? (
            <>
              <Link href="/parceiro" prefetch={false} className="hover:text-gold">
                Sou parceiro
              </Link>
              <Link href="/admin" prefetch={false} className="hover:text-gold">
                Barbearia
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}
