export type AdsDraft = {
  id: string;
  metricId: string;
  status: "DRAFT" | "APPROVED" | "REJECTED";
  headline: string;
  primaryText: string;
  callToAction: string;
  variants: string[];
  createdAt: string;
  approvedAt?: string;
};

export function createAdsDraft(metricId: string, businessName: string, objective = "gerar conversões"): AdsDraft {
  const safeName = businessName.trim() || "sua empresa";
  return {
    id: `draft_${Date.now()}`,
    metricId,
    status: "DRAFT",
    headline: `${safeName}: uma solução feita para você`,
    primaryText: `Descubra como alcançar seu objetivo de ${objective} com uma experiência simples, clara e orientada a resultados.`,
    callToAction: "Saiba mais",
    variants: [
      `Transforme seu próximo passo com ${safeName}. Conheça agora.`,
      `Resultados melhores começam com uma escolha mais inteligente. Fale com ${safeName}.`,
      `Veja por que clientes escolhem ${safeName} para avançar.`,
    ],
    createdAt: new Date().toISOString(),
  };
}

export function approveAdsDraft(draft: AdsDraft): AdsDraft {
  if (draft.status !== "DRAFT") throw new Error("Somente rascunhos pendentes podem ser aprovados.");
  return { ...draft, status: "APPROVED", approvedAt: new Date().toISOString() };
}
