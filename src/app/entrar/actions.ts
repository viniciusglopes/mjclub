"use server";

import { redirect } from "next/navigation";

import { getRepository } from "@/lib/db";
import { onlyDigits } from "@/lib/format";
import { setSession } from "@/lib/session";

/**
 * Acesso do membro na POC: só o telefone, sem senha nem OTP.
 * Ver docs/ARCHITECTURE.md §7 — precisa virar Supabase Auth antes de produção.
 */
export async function signInWithPhone(formData: FormData) {
  const phone = onlyDigits(String(formData.get("phone") ?? ""));
  if (phone.length < 10) {
    redirect("/entrar?erro=" + encodeURIComponent("Informe um celular válido com DDD."));
  }

  const repo = getRepository();
  const profile = await repo.getProfileByPhone(phone);
  if (!profile) {
    redirect(
      "/entrar?erro=" +
        encodeURIComponent("Não encontramos esse telefone. Assine um plano para entrar."),
    );
  }

  await setSession({ kind: "member", profileId: profile.id });
  redirect("/minha-conta");
}

/** Acesso do parceiro na POC: identificado pelo slug da loja. */
export async function signInAsPartner(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const partner = await getRepository().getPartnerBySlug(slug);

  if (!partner) {
    redirect("/entrar?erro=" + encodeURIComponent("Parceiro não encontrado."));
  }

  await setSession({ kind: "partner", partnerId: partner.id });
  redirect("/parceiro");
}

/** Acesso da equipe da barbearia na POC: entra direto no painel do tenant. */
export async function signInAsStaff() {
  await setSession({ kind: "staff" });
  redirect("/admin");
}
