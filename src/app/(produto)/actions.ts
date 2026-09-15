"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";

import { getPlatform } from "@/lib/db";
import { onlyDigits } from "@/lib/format";

export type LeadFields = {
  nomeBarbearia: string;
  responsavel: string;
  whatsapp: string;
  cidade: string;
  usuarios: string;
};

export type LeadState = {
  status: "idle" | "ok" | "erro";
  mensagem: string;
  /** Muda a cada envio: remonta o formulário com os valores devolvidos. */
  envio: number;
  valores?: LeadFields;
};

const text = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `Informe ${label}.`)
    .max(80, `${label[0].toUpperCase()}${label.slice(1)} muito longo.`);

const schema = z.object({
  nomeBarbearia: text("o nome da barbearia"),
  responsavel: text("o nome do responsável"),
  whatsapp: z
    .string()
    .transform(onlyDigits)
    // Aceita quem digita com o 55 do país na frente.
    .transform((v) => (v.length > 11 && v.startsWith("55") ? v.slice(2) : v))
    .refine((v) => v.length >= 10 && v.length <= 11, "Informe um WhatsApp válido com DDD."),
  cidade: text("a cidade"),
  usuarios: z.coerce
    .number({ message: "Informe quantas pessoas vão usar o sistema." })
    .int("Informe um número inteiro de usuários.")
    .min(1, "Pelo menos 1 usuário.")
    .max(200, "Para mais de 200 usuários, fale com a gente pelo WhatsApp."),
});

/** Até 3 envios por IP por hora; o mesmo WhatsApp conta uma vez por dia. */
const IP_LIMIT = 3;
const IP_WINDOW_MS = 60 * 60 * 1000;
const PHONE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * O IP entra só como hash com segredo do servidor: dá para contar envios
 * repetidos sem guardar o endereço de ninguém.
 */
function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.POC_SESSION_SECRET ?? "mjclub-leads-desenvolvimento";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** "Cadastrar minha barbearia" da página do produto. Só registra o interesse. */
export async function registrarInteresse(
  previous: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const envio = previous.envio + 1;
  const valores: LeadFields = {
    nomeBarbearia: String(formData.get("nomeBarbearia") ?? ""),
    responsavel: String(formData.get("responsavel") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    usuarios: String(formData.get("usuarios") ?? ""),
  };
  const sucesso: LeadState = {
    status: "ok",
    envio,
    mensagem:
      "Recebemos o interesse da sua barbearia! Nossa equipe vai chamar você no WhatsApp para apresentar o MJCLUB.",
  };

  // Honeypot: campo invisível para gente, irresistível para robô. Quem preenche
  // recebe a mesma resposta de sucesso e nada é gravado.
  if (String(formData.get("site") ?? "").trim() !== "") return sucesso;

  const parsed = schema.safeParse(valores);
  if (!parsed.success) {
    return { status: "erro", envio, valores, mensagem: parsed.error.issues[0].message };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const ipHash = hashIp(ip);
  const platform = getPlatform();
  const now = Date.now();

  try {
    if (ipHash) {
      const porIp = await platform.countRecentLeads({
        ipHash,
        sinceISO: new Date(now - IP_WINDOW_MS).toISOString(),
      });
      if (porIp >= IP_LIMIT) {
        return {
          status: "erro",
          envio,
          valores,
          mensagem:
            "Recebemos vários cadastros deste acesso agora há pouco. Tente de novo mais tarde.",
        };
      }
    }

    // Mesmo WhatsApp de novo no mesmo dia: agradece sem gravar duplicado.
    const porWhatsapp = await platform.countRecentLeads({
      whatsapp: parsed.data.whatsapp,
      sinceISO: new Date(now - PHONE_WINDOW_MS).toISOString(),
    });
    if (porWhatsapp > 0) return sucesso;

    await platform.createLead({
      ...parsed.data,
      ipHash,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    });
  } catch (error) {
    console.error("[leads] falha ao registrar interesse:", error);
    return {
      status: "erro",
      envio,
      valores,
      mensagem: "Não conseguimos registrar agora. Tente de novo em alguns minutos.",
    };
  }

  return sucesso;
}
