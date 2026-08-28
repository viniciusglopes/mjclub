import Link from "next/link";
import type { Metadata } from "next";

import { Alert, Button, Card, Field, PageTitle, inputClass } from "@/components/ui";
import { getRepository } from "@/lib/db";

import { signInAsPartner, signInAsStaff, signInWithPhone } from "./actions";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const partners = await getRepository().listPartners();

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle
        title="Entrar"
        subtitle="Acesse sua carteirinha do clube ou o painel do seu estabelecimento."
      />

      {erro ? (
        <div className="mb-6">
          <Alert tone="error">{erro}</Alert>
        </div>
      ) : null}

      <Card>
        <h2 className="font-bold">Sou membro do clube</h2>
        <form action={signInWithPhone} className="mt-4 space-y-4">
          <Field label="Celular com DDD">
            <input
              name="phone"
              required
              inputMode="tel"
              className={inputClass}
              placeholder="(11) 98888-0002"
            />
          </Field>
          <Button type="submit" className="w-full">
            Acessar minha carteirinha
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Ainda não tem plano?{" "}
          <Link href="/clube" className="font-semibold text-gold hover:underline">
            Conheça o clube
          </Link>
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">Sou parceiro</h2>
        <form action={signInAsPartner} className="mt-4 space-y-4">
          <Field label="Estabelecimento">
            <select name="slug" required className={inputClass}>
              {partners.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" variant="outline" className="w-full">
            Acessar painel do parceiro
          </Button>
        </form>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">Sou da equipe da MJ Barbearia</h2>
        <p className="mt-1 text-sm text-muted">
          Agenda do dia, serviços e membros do clube.
        </p>
        <form action={signInAsStaff} className="mt-4">
          <Button type="submit" variant="outline" className="w-full">
            Abrir painel da barbearia
          </Button>
        </form>
      </Card>

      <div className="mt-6">
        <Alert tone="info">
          <strong className="text-cream">POC:</strong> o acesso aqui é apenas
          identificação, sem senha nem código por SMS. Em produção isso vira login por
          OTP no WhatsApp.
        </Alert>
      </div>
    </div>
  );
}
