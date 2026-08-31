import type { Plan, Service } from "./types";

export type PriceBreakdown = {
  /** Preço de tabela, sem clube. */
  fullCents: number;
  /** Quanto o cliente paga de fato. */
  finalCents: number;
  discountCents: number;
};

/**
 * Regra única de preço do MJ CLUB.
 *
 * Sem plano, paga a tabela. Com plano, vale o `memberPriceCents` do serviço
 * quando ele existe (preço promocional fechado, como o combo do MJ Prime);
 * caso contrário aplica o `discountPercent` do plano.
 */
export function priceFor(service: Service, plan: Plan | null): PriceBreakdown {
  const fullCents = service.priceCents;

  if (!plan) {
    return { fullCents, finalCents: fullCents, discountCents: 0 };
  }

  const finalCents =
    service.memberPriceCents !== null
      ? service.memberPriceCents
      : Math.round(fullCents * (1 - plan.discountPercent / 100));

  // Um "preço de membro" nunca pode ficar acima da tabela.
  const capped = Math.min(finalCents, fullCents);

  return { fullCents, finalCents: capped, discountCents: fullCents - capped };
}
