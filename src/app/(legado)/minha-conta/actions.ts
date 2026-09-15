"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRepository, legacyTenantId } from "@/lib/db";
import { clearSession, getSession } from "@/lib/session";

export async function signOut() {
  await clearSession();
  redirect("/");
}

/**
 * Gera o código que o membro mostra no balcão do parceiro.
 *
 * A assinatura é a do membro LOGADO, buscada aqui. Antes o id vinha de um campo
 * escondido do formulário, e bastava trocá-lo para gastar o benefício de outra
 * pessoa.
 */
export async function redeemOffer(formData: FormData) {
  const session = await getSession();
  if (session?.kind !== "member") redirect("/entrar");

  const offerId = String(formData.get("offerId") ?? "");
  const repo = getRepository(legacyTenantId());

  try {
    const membership = await repo.getActiveMembership(session.profileId);
    if (!membership) throw new Error("Você não tem um plano ativo.");
    await repo.createRedemption(offerId, membership.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível resgatar.";
    redirect(`/minha-conta?erro=${encodeURIComponent(message)}`);
  }

  revalidatePath("/minha-conta");
  redirect("/minha-conta?resgate=1");
}
