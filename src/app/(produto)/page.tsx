import Link from "next/link";
import type { ReactNode } from "react";

import { getPlatform } from "@/lib/db";
import { slugValido } from "@/lib/slugs";

import { LeadForm } from "./lead-form";

/** A vitrine lê as barbearias do banco: sem cache de build, sempre atual. */
export const dynamic = "force-dynamic";

const PRICE = 29.9;
const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ------------------------------------------------------------------ ícones */

function Icon({ children }: { children: ReactNode }) {
  return (
    <span className="grid size-11 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </span>
  );
}

const FEATURES: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "Agenda online",
    text: "Seu cliente marca sozinho, a qualquer hora, e só vê o horário que está livre de verdade.",
    icon: (
      <>
        <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4M8 14h3" />
      </>
    ),
  },
  {
    title: "Equipe e horários",
    text: "Cada barbeiro com seus serviços, sua escala e suas folgas. A agenda respeita tudo.",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.6 2.5 3 5.2" />
      </>
    ),
  },
  {
    title: "Venda de produtos",
    text: "Pomada, óleo, shampoo: registre a venda no balcão junto com o atendimento.",
    icon: (
      <>
        <path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </>
    ),
  },
  {
    title: "Cadastro de clientes",
    text: "Histórico de cada cliente com nome e telefone, sem planilha e sem caderno.",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2.5" />
        <circle cx="9" cy="10.5" r="2.3" />
        <path d="M5.8 16.5c.6-1.8 1.8-2.8 3.2-2.8s2.6 1 3.2 2.8M14.5 9.5h3.5M14.5 13h3.5" />
      </>
    ),
  },
  {
    title: "Site próprio da barbearia",
    text: "Um endereço só seu, mjclub.com.br/sua-barbearia, com serviços, equipe, planos e botão de agendar.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
      </>
    ),
  },
  {
    title: "Clube de benefícios incluso",
    text: "Seus clientes e sua equipe ganham vantagens em empresas parceiras. Sem custo extra.",
    icon: (
      <>
        <path d="M12 3.5 14.6 9l5.9.6-4.4 4 1.3 5.9L12 16.5l-5.4 3 1.3-5.9-4.4-4 5.9-.6L12 3.5Z" />
      </>
    ),
  },
];

/* ----------------------------------------------------------------- página */

export default async function ProdutoPage() {
  // Slug reservado daria 404 em `/[slug]`: não entra na vitrine.
  const tenants = (await getPlatform().listTenants()).filter((t) => slugValido(t.slug));

  return (
    <div className="flex min-h-dvh flex-col">
      <ProdutoHeader />

      <main className="flex-1">
        {/* ------------------------------------------------------------ hero */}
        <section className="relative overflow-hidden border-b border-line">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gold/10 blur-3xl"
          />
          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold-soft">
                Sistema para barbearias + clube de benefícios
              </p>
              <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                A gestão da sua barbearia,{" "}
                <span className="text-gold">com um clube de benefícios incluso.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted">
                Agenda online, equipe, venda de produtos e cadastro de clientes num lugar só.
                E quem assina o MJCLUB já entra no clube: seus clientes e sua equipe ganham
                vantagens em empresas parceiras.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#cadastro"
                  className="inline-flex items-center justify-center rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-soft"
                >
                  Cadastrar minha barbearia
                </a>
                <a
                  href="#barbearias"
                  className="inline-flex items-center justify-center rounded-lg border border-line px-5 py-3 text-sm font-semibold transition-colors hover:border-gold hover:text-gold"
                >
                  Ver uma barbearia no MJCLUB
                </a>
              </div>

              <p className="mt-6 text-sm text-muted">
                <strong className="text-cream">{brl(PRICE)}</strong> por usuário ativo/mês ·
                clientes não pagam nada
              </p>
            </div>

            <AgendaPreview />
          </div>
        </section>

        {/* -------------------------------------------------- funcionalidades */}
        <Section
          id="funcionalidades"
          eyebrow="Funcionalidades"
          title="Tudo o que a barbearia usa no dia a dia"
          subtitle="Do horário marcado à venda no balcão, sem trocar de sistema."
        >
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-gold/40"
              >
                <Icon>{f.icon}</Icon>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* ------------------------------------------------------------ clube */}
        <Section
          id="clube"
          eyebrow="Clube de benefícios"
          title="Assinou o sistema, entrou no clube"
          subtitle="Um motivo a mais para o cliente voltar — e para a equipe ficar."
          tinted
        >
          <ol className="grid gap-4 md:grid-cols-3">
            {[
              {
                n: "1",
                title: "O MJCLUB traz os parceiros",
                text: "Nós cadastramos e negociamos com as empresas parceiras: restaurantes, academias, óticas e outros negócios.",
              },
              {
                n: "2",
                title: "Sua barbearia oferece",
                text: "Você disponibiliza os benefícios para os seus clientes e para a sua equipe, direto pelo sistema.",
              },
              {
                n: "3",
                title: "O cliente usa sem app",
                text: "Sem senha e sem aplicativo: o cliente é identificado pelo nome e telefone ou CPF na hora de usar o benefício.",
              },
            ].map((step) => (
              <li key={step.n} className="rounded-2xl border border-line bg-ink/60 p-6">
                <span className="font-mono text-3xl font-bold text-gold">{step.n}</span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted">
            Os primeiros parceiros estão sendo fechados. Em breve: benefícios em restaurantes,
            academias e muito mais.
          </p>
        </Section>

        {/* ------------------------------------------------------------ preço */}
        <Section
          id="preco"
          eyebrow="Preço"
          title="Um preço simples, que cresce com a sua equipe"
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-stretch">
            <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/15 via-surface to-surface p-8">
              <p className="text-sm font-semibold text-gold-soft">MJCLUB completo</p>
              <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
                <span className="text-5xl font-bold tracking-tight">{brl(PRICE)}</span>
                <span className="text-muted">por usuário ativo/mês</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  "Agenda online, equipe e horários",
                  "Venda de produtos e cadastro de clientes",
                  "Site próprio em mjclub.com.br/sua-barbearia",
                  "Clube de benefícios incluso, sem custo extra",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <span aria-hidden className="text-gold">
                      ✓
                    </span>
                    <span className="text-cream/90">{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#cadastro"
                className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-soft sm:w-auto"
              >
                Cadastrar minha barbearia
              </a>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-8">
              <h3 className="text-lg font-semibold">O que é um usuário ativo?</h3>
              <p className="text-sm leading-relaxed text-muted">
                É quem <strong className="text-cream">usa o sistema na barbearia</strong>, com
                login: o dono, cada barbeiro e a recepção. Seus clientes{" "}
                <strong className="text-cream">não pagam e não contam</strong> como usuário —
                eles só agendam e aproveitam o clube.
              </p>
              <div className="mt-2 overflow-hidden rounded-xl border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-left text-muted">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Sua equipe</th>
                      <th className="px-4 py-2.5 text-right font-medium">Por mês</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {[
                      [1, "só o dono"],
                      [3, "dono + 2 barbeiros"],
                      [5, "dono, 3 barbeiros e recepção"],
                    ].map(([n, label]) => (
                      <tr key={n}>
                        <td className="px-4 py-3">
                          <span className="font-semibold">
                            {n} usuário{Number(n) > 1 ? "s" : ""}
                          </span>{" "}
                          <span className="text-muted">· {label}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {brl(Number(n) * PRICE)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------------- barbearias */}
        <Section
          id="barbearias"
          eyebrow="Vitrine"
          title="Barbearias no MJCLUB"
          subtitle="Cada uma com o seu endereço, a sua agenda e o seu clube."
          tinted
        >
          {tenants.length === 0 ? (
            <p className="text-muted">As primeiras barbearias estão chegando.</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tenants.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/${t.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-line bg-ink/60 p-6 transition-colors hover:border-gold/50"
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: /^#[0-9a-fA-F]{6}$/.test(t.brandPrimary)
                            ? t.brandPrimary
                            : undefined,
                        }}
                      />
                      <span className="text-lg font-semibold">{t.name}</span>
                    </span>
                    {t.tagline ? (
                      <span className="mt-2 text-sm text-muted">{t.tagline}</span>
                    ) : null}
                    {t.address ? (
                      <span className="mt-2 text-sm text-muted">{t.address}</span>
                    ) : null}
                    <span className="mt-5 font-mono text-xs text-gold group-hover:underline">
                      mjclub.com.br/{t.slug} →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* -------------------------------------------------------------- FAQ */}
        <Section id="duvidas" eyebrow="Dúvidas" title="Perguntas frequentes">
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {[
              {
                q: "Meus clientes precisam pagar alguma coisa?",
                a: "Não. O MJCLUB é cobrado só por usuário ativo da barbearia. Clientes agendam e usam o clube sem custo.",
              },
              {
                q: "O cliente precisa baixar app ou criar senha?",
                a: "Não. Ele agenda pelo site da barbearia e é identificado pelo nome e telefone ou CPF.",
              },
              {
                q: "O clube de benefícios é cobrado à parte?",
                a: "Não. Toda barbearia que assina o MJCLUB entra automaticamente no clube.",
              },
              {
                q: "Como fica o endereço da minha barbearia?",
                a: "Você escolhe um nome curto e sua página fica em mjclub.com.br/nome-da-sua-barbearia.",
              },
            ].map((item) => (
              <details key={item.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {item.q}
                  <span
                    aria-hidden
                    className="text-gold transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* --------------------------------------------------------- cadastro */}
        <section id="cadastro" className="scroll-mt-20 border-t border-line">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Cadastro
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Cadastrar minha barbearia
              </h2>
              <p className="mt-4 text-muted">
                Deixe seus dados e a gente chama você no WhatsApp para colocar a sua
                barbearia no MJCLUB.
              </p>
            </div>
            <div className="relative rounded-2xl border border-line bg-surface p-6 sm:p-8">
              <LeadForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} MJCLUB · gestão para barbearias</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            <a href="#funcionalidades" className="hover:text-gold">
              Funcionalidades
            </a>
            <a href="#preco" className="hover:text-gold">
              Preço
            </a>
            <a href="#barbearias" className="hover:text-gold">
              Barbearias
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------- componentes */

function ProdutoHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-gold text-xs font-black text-ink">
            MJ
          </span>
          <span className="text-lg font-bold tracking-tight">MJCLUB</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <a href="#funcionalidades" className="hover:text-cream">
            Funcionalidades
          </a>
          <a href="#clube" className="hover:text-cream">
            Clube
          </a>
          <a href="#preco" className="hover:text-cream">
            Preço
          </a>
          <a href="#barbearias" className="hover:text-cream">
            Barbearias
          </a>
        </nav>

        <a
          href="#cadastro"
          className="shrink-0 rounded-lg bg-gold px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-gold-soft"
        >
          <span className="sm:hidden">Cadastrar</span>
          <span className="hidden sm:inline">Cadastrar minha barbearia</span>
        </a>
      </div>
    </header>
  );
}

function Section({
  id,
  eyebrow,
  title,
  subtitle,
  tinted,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  tinted?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-20 ${tinted ? "bg-surface/60" : ""}`}>
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        {subtitle ? <p className="mt-4 max-w-2xl text-muted">{subtitle}</p> : null}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

/** Ilustração da agenda do dia. Dados de exemplo, não vêm do banco. */
function AgendaPreview() {
  const rows = [
    { time: "09:00", who: "Carlos", what: "Corte + Barba", pro: "Rafa", member: true },
    { time: "09:40", who: "Lucas", what: "Corte masculino", pro: "Diego", member: false },
    { time: "10:30", who: "André", what: "Barba", pro: "Rafa", member: true },
    { time: "11:00", who: "Pedro", what: "Platinado", pro: "Diego", member: false },
  ];

  return (
    <div className="relative" aria-label="Exemplo da agenda do dia no MJCLUB">
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Agenda de hoje</p>
            <p className="font-semibold">Sua barbearia</p>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            12 atendimentos
          </span>
        </div>

        <ul className="mt-5 space-y-2">
          {rows.map((r) => (
            <li
              key={r.time}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5"
            >
              <span className="w-12 font-mono text-sm font-bold text-gold">{r.time}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {r.who}
                  {r.member ? (
                    <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold-soft">
                      clube
                    </span>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-muted">
                  {r.what} · {r.pro}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            ["Caixa do dia", "R$ 1.240"],
            ["Produtos", "8 vendas"],
            ["Clube", "46 membros"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface-2 px-2 py-3">
              <p className="text-[11px] text-muted">{label}</p>
              <p className="mt-0.5 text-sm font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted/70">Ilustração com dados de exemplo</p>
    </div>
  );
}
