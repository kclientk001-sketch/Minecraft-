import { publicCors, preflight } from "@/lib/public-cors";
import { getConfig } from "@/lib/content";
import { handle } from "@/lib/http";
export async function GET(req: Request) {
  const res = await handle(async () => {
    const config = await getConfig();
    if (!config.DISCORD_GUILD_ID || config.DEMO_MODE)
      return { connected: false, online: null };
    try {
      const r = await fetch(
        `https://discord.com/api/guilds/${config.DISCORD_GUILD_ID}/widget.json`,
        { signal: AbortSignal.timeout(4000), next: { revalidate: 60 } },
      );
      if (!r.ok) return { connected: false, online: null };
      const data = await r.json();
      return typeof data.presence_count === "number"
        ? { connected: true, online: data.presence_count }
        : { connected: false, online: null };
    } catch {
      return { connected: false, online: null };
    }
  });
  return publicCors(req, res);
}

export const OPTIONS = preflight;
