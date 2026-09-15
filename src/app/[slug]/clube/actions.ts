"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { findTenantBySlug, getPlatform, getRepository, legacyTenantId } from "@/lib/db";
import { onlyDigits } from "@/lib/format";
import { setSession } from "@/lib/session";

const subscribeSchema = z.object({
  planId: z.string().min(1),
  name: z.string().trim().min(2, "Informe seu nome completo."),
  phone: z
    .string()
    .transform(onlyDigits)
    .refine((v) => v.length >= 10 && v.length <= 11, "Informe um celular válido com DDD."),
});

/**
 * Assina um plano do clube de uma barbearia.
 *
 * POC: não há cobrança. A assinatura já nasce ativa — no roadmap isto passa por
 * um gateway e só vira `active` depois do pagamento confirmado.
 */
export async function subscribeToPlan(formData: FormData) {
  const tenant = await findTenantBySlug(getPlatform(), String(formData.get("slug") ?? ""));
  if (!tenant) redirect("/");

  const base = `/${tenant.slug}/clube`;
  const parsed = subscribeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`${base}?erro=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const repo = getRepository(tenant.id);
  // `getPlan` filtra pelo tenant: plano de outra barbearia não passa.
  const plan = await repo.getPlan(parsed.data.planId);
  if (!plan || !plan.active) {
    redirect(`${base}?erro=${encodeURIComponent("Plano indisponível.")}`);
  }

  const { profile } = await repo.subscribe({
    fullName: parsed.data.name,
    phone: parsed.data.phone,
    planId: plan.id,
  });

  // A área do membro (`/minha-conta`) ainda é só da MJ. Nas outras barbearias a
  // confirmação fica na própria página do clube até o login da fase 2.
  if (tenant.id === legacyTenantId()) {
    await setSession({ kind: "member", profileId: profile.id });
    redirect("/minha-conta?bemvindo=1");
  }
  redirect(`${base}?assinado=1`);
}
