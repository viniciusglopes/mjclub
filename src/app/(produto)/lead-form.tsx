"use client";

import { useActionState } from "react";

import { Alert, Field, inputClass } from "@/components/ui";

import { registrarInteresse, type LeadState } from "./actions";

const initialState: LeadState = { status: "idle", mensagem: "", envio: 0 };

export function LeadForm() {
  const [state, action, pending] = useActionState(registrarInteresse, initialState);

  if (state.status === "ok") {
    return (
      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 sm:p-8">
        <p className="text-lg font-bold text-emerald-200">Cadastro recebido ✓</p>
        <p className="mt-2 text-emerald-100/80" role="status">
          {state.mensagem}
        </p>
      </div>
    );
  }

  const v = state.valores;

  return (
    // `key` muda a cada envio: com erro, o formulário volta com o que foi digitado.
    <form key={state.envio} action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2">
        <Field label="Nome da barbearia">
          <input
            name="nomeBarbearia"
            required
            maxLength={80}
            autoComplete="organization"
            defaultValue={v?.nomeBarbearia}
            className={inputClass}
            placeholder="Ex.: Barbearia do Zé"
          />
        </Field>
      </div>

      <Field label="Seu nome">
        <input
          name="responsavel"
          required
          maxLength={80}
          autoComplete="name"
          defaultValue={v?.responsavel}
          className={inputClass}
          placeholder="Nome do responsável"
        />
      </Field>

      <Field label="WhatsApp com DDD">
        <input
          name="whatsapp"
          required
          inputMode="tel"
          autoComplete="tel"
          defaultValue={v?.whatsapp}
          className={inputClass}
          placeholder="(11) 98888-0000"
        />
      </Field>

      <Field label="Cidade">
        <input
          name="cidade"
          required
          maxLength={80}
          autoComplete="address-level2"
          defaultValue={v?.cidade}
          className={inputClass}
          placeholder="Ex.: São Paulo – SP"
        />
      </Field>

      <Field label="Quantas pessoas vão usar o sistema?" hint="Dono, barbeiros e recepção.">
        <input
          name="usuarios"
          type="number"
          required
          min={1}
          max={200}
          inputMode="numeric"
          defaultValue={v?.usuarios ?? "2"}
          className={inputClass}
        />
      </Field>

      {/* Honeypot: fora da tela e fora do Tab. Pessoas não veem; robôs preenchem. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Não preencha este campo
          <input name="site" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {state.status === "erro" ? (
        <div className="sm:col-span-2" role="alert">
          <Alert tone="error">{state.mensagem}</Alert>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          Sem compromisso e sem cobrança agora. Usamos seus dados só para falar com você
          sobre o MJCLUB.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-gold-soft disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Quero o MJCLUB na minha barbearia"}
        </button>
      </div>
    </form>
  );
}
