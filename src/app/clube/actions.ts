"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getRepository } from "@/lib/db";
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
 * Assina um plano do clube.
 *
 * POC: não há cobrança. A assinatura já nasce ativa — no roadmap isto passa por
 * um gateway e só vira `active` depois do pagamento confirmado.
 */
export async function subscribeToPlan(formData: FormData) {
  const parsed = subscribeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/clube?erro=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const repo = getRepository();
  const { profile } = await repo.subscribe({
    fullName: parsed.data.name,
    phone: parsed.data.phone,
    planId: parsed.data.planId,
  });

  await setSession({ kind: "member", profileId: profile.id });
  redirect("/minha-conta?bemvindo=1");
}

/** Gera o código que o membro mostra no balcão do parceiro. */
export async function redeemOffer(formData: FormData) {
  const offerId = String(formData.get("offerId") ?? "");
  const membershipId = String(formData.get("membershipId") ?? "");

  try {
    await getRepository().createRedemption(offerId, membershipId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível resgatar.";
    redirect(`/minha-conta?erro=${encodeURIComponent(message)}`);
  }

  revalidatePath("/minha-conta");
  redirect("/minha-conta?resgate=1");
}
