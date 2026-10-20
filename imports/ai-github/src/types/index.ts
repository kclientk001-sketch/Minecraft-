export type SiteConfig = {
  SERVER_NAME: string;
  SERVER_IP: string;
  SERVER_PORT: number;
  SERVER_VERSION: string;
  DISCORD_INVITE: string;
  DISCORD_GUILD_ID: string;
  STORE_URL: string;
  LANGUAGE: "vi";
  THEME: "dark";
  DEMO_MODE: boolean;
  TAGLINE: string;
  DESCRIPTION: string;
  VOTE_REWARDS: string;
};
export type Status = {
  state: "online" | "offline" | "error" | "demo";
  demo: boolean;
  online: boolean | null;
  players: number | null;
  maxPlayers: number | null;
  version: string | null;
  motd: string;
  latency: number | null;
  updatedAt: string;
  error?: string;
};
export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  image: string;
  published: boolean;
  isDemo: boolean;
  createdAt: Date | string;
};
export type Mode = {
  id: string;
  slug: string;
  name: string;
  description: string;
  details: string;
  image: string;
  accent: string;
  enabled: boolean;
  order: number;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  image: string;
  enabled: boolean;
  isDemo: boolean;
};
export type Ranking = {
  id: string;
  metric: string;
  player: string;
  value: number;
  unit: string;
  isDemo: boolean;
  source: string;
  updatedAt: Date | string;
};
export type RuleItem = {
  id: string;
  slug: string;
  title: string;
  body: string;
  order: number;
};
export type NetworkLink = {
  id: string;
  label: string;
  url: string;
  kind: string;
  enabled: boolean;
  order: number;
};
