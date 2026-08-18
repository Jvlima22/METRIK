export type IntegrationCategory = "AI" | "CRM" | "ADS" | "COMMUNICATION" | "CUSTOM";
export type IntegrationStatus = "EMPTY" | "DRAFT" | "CONNECTED" | "ERROR";
export type IntegrationDirection = "INBOUND" | "OUTBOUND" | "BIDIRECTIONAL";

export type IntegrationDefinition = {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  accent: string;
  capabilities: string[];
  auth: "OAUTH" | "API_KEY" | "TOKEN" | "CUSTOM";
};

export type HubConnection = {
  slot: number;
  providerId?: string;
  status: IntegrationStatus;
  direction?: IntegrationDirection;
  workspace?: string;
  scopes: string[];
  updatedAt?: string;
};

export const integrationCatalog: IntegrationDefinition[] = [
  { id: "openai", name: "ChatGPT / OpenAI", category: "AI", description: "Geração, análise e respostas estruturadas.", accent: "#10a37f", capabilities: ["Análise", "Geração", "JSON estruturado"], auth: "API_KEY" },
  { id: "claude", name: "Claude", category: "AI", description: "Análise profunda e contexto longo.", accent: "#d97757", capabilities: ["Análise", "Agentes", "Arquivos"], auth: "API_KEY" },
  { id: "manus", name: "Manus", category: "AI", description: "Execução de tarefas e workflows agentivos.", accent: "#111827", capabilities: ["Agentes", "Automação", "Execução"], auth: "API_KEY" },
  { id: "kimi", name: "Kimi", category: "AI", description: "Modelos de IA para análise e criação.", accent: "#2563eb", capabilities: ["Análise", "Geração", "Tool calling"], auth: "API_KEY" },
  { id: "pipedrive", name: "Pipedrive", category: "CRM", description: "Negócios, contatos, leads e atividades.", accent: "#ef6c35", capabilities: ["Negócios", "Leads", "Webhooks"], auth: "OAUTH" },
  { id: "google-ads", name: "Google Ads", category: "ADS", description: "Campanhas, métricas e anúncios.", accent: "#4285f4", capabilities: ["Métricas", "Campanhas", "Criativos"], auth: "OAUTH" },
  { id: "meta-ads", name: "Meta Ads", category: "ADS", description: "Campanhas e públicos da Meta.", accent: "#1877f2", capabilities: ["Métricas", "Campanhas", "Públicos"], auth: "OAUTH" },
  { id: "custom-api", name: "API personalizada", category: "CUSTOM", description: "Conecte qualquer sistema REST ou webhook.", accent: "#7c3aed", capabilities: ["REST", "Webhook", "Transformação"], auth: "CUSTOM" },
];
