"use server";

import { revalidatePath } from "next/cache";

import { getRepository } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { AppointmentStatus } from "@/lib/types";

const ALLOWED: AppointmentStatus[] = ["confirmed", "completed", "canceled", "no_show"];

/** Muda o status de um atendimento na agenda do dia. */
export async function setAppointmentStatus(formData: FormData) {
  const session = await getSession();
  if (session?.kind !== "staff") throw new Error("Acesso restrito à equipe.");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as AppointmentStatus;
  if (!id || !ALLOWED.includes(status)) return;

  await getRepository().setAppointmentStatus(id, status);
  revalidatePath("/admin");
}
