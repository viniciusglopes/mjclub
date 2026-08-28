"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getRepository } from "@/lib/db";
import { getSession } from "@/lib/session";

/** O parceiro digita o código do membro no balcão e confirma o benefício. */
export async function validateCode(formData: FormData) {
  const session = await getSession();
  if (session?.kind !== "partner") redirect("/entrar");

  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/parceiro?erro=" + encodeURIComponent("Digite o código."));

  const result = await getRepository().validateRedemption(code, session.partnerId);
  revalidatePath("/parceiro");

  if (!result.ok) {
    redirect("/parceiro?erro=" + encodeURIComponent(result.reason));
  }

  redirect(
    "/parceiro?ok=" +
      encodeURIComponent(`${result.offer.title} liberado para ${result.memberName}.`),
  );
}
