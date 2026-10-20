import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  cpSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
  readdirSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { defaults } from "../src/config/site";
import { configSchema } from "../src/lib/validation";
const root = process.cwd(),
  stage = resolve(".inet-build"),
  out = resolve("inet-site");
const db = new PrismaClient();
const write = (name: string, value: string) => {
  mkdirSync(resolve(stage, name, ".."), { recursive: true });
  writeFileSync(resolve(stage, name), value);
};
async function main() {
  const stored = await db.siteSetting.findUnique({ where: { id: "site" } });
  const env: Record<string, unknown> = {};
  for (const key of Object.keys(defaults))
    if (process.env[key]) env[key] = process.env[key];
  if (env.SERVER_PORT) env.SERVER_PORT = Number(env.SERVER_PORT);
  if (env.DEMO_MODE !== undefined) env.DEMO_MODE = env.DEMO_MODE === "true";
  const config = configSchema.parse({
    ...defaults,
    ...env,
    ...((stored?.value as object) ?? {}),
  });
  const [news, modes, products, rules, links, rankings] = await Promise.all([
    db.news.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    }),
    db.gameMode.findMany({
      where: { enabled: true },
      orderBy: { order: "asc" },
    }),
    db.product.findMany({
      where: { enabled: true },
      orderBy: { price: "asc" },
    }),
    db.rule.findMany({ orderBy: { order: "asc" } }),
    db.link.findMany({ where: { enabled: true }, orderBy: { order: "asc" } }),
    db.leaderboardEntry.findMany({ orderBy: { value: "desc" } }),
  ]);
  // Only public records are exported. Users, sessions, tickets, tokens and .env are never copied.
  const snapshot = { config, news, modes, products, rules, links, rankings };
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  for (const file of [
    "src",
    "public",
    "next.config.ts",
    "tsconfig.json",
    "next-env.d.ts",
    "postcss.config.mjs",
    "package.json",
  ])
    cpSync(resolve(root, file), resolve(stage, file), { recursive: true });
  symlinkSync(
    resolve(root, "node_modules"),
    resolve(stage, "node_modules"),
    "dir",
  );
  rmSync(resolve(stage, "src/app/api"), { recursive: true, force: true });
  rmSync(resolve(stage, "src/app/admin"), { recursive: true, force: true });
  for (const file of [
    "auth.ts",
    "admin-resources.ts",
    "http.ts",
    "rate-limit.ts",
    "server-status.ts",
    "minecraft.ts",
    "public-cors.ts",
  ])
    rmSync(resolve(stage, "src/lib", file), { force: true });
  write("src/data/snapshot.json", JSON.stringify(snapshot));
  write(
    "src/lib/db.ts",
    `import snapshot from '@/data/snapshot.json';
type Args={where?:Record<string,unknown>;orderBy?:unknown;skip?:number;take?:number;select?:unknown;distinct?:string[]};
function table<T extends object>(rows:T[]){
 function list(args:Args={}){let items=[...rows];if(args.where)items=items.filter(row=>Object.entries(args.where!).every(([k,v])=>(row as Record<string,unknown>)[k]===v));
 const sort=Array.isArray(args.orderBy)?args.orderBy:[args.orderBy];for(const rule of [...sort].reverse()){if(rule&&typeof rule==='object'){const [key,dir]=Object.entries(rule)[0];items.sort((a,b)=>{const x=(a as Record<string,unknown>)[key],y=(b as Record<string,unknown>)[key];const n=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y));return dir==='desc'?-n:n;});}}
 return items.slice(args.skip??0,args.take===undefined?undefined:(args.skip??0)+args.take);}
 return {findMany:async(args:Args={})=>list(args),findFirst:async(args:Args={})=>list(args)[0]??null,findUnique:async(args:Args={})=>list(args)[0]??null,count:async(args:Args={})=>list(args).length};
}
export const db={news:table(snapshot.news),gameMode:table(snapshot.modes),product:table(snapshot.products),rule:table(snapshot.rules),link:table(snapshot.links),leaderboardEntry:table(snapshot.rankings)};
`,
  );
  write(
    "src/lib/content.ts",
    `import snapshot from '@/data/snapshot.json';
import { configSchema } from '@/lib/validation';
export async function getConfig(){return configSchema.parse(snapshot.config);}
export async function getModes(){return snapshot.modes;}
export async function getLinks(){return snapshot.links;}
export function pagination(page:unknown,perPage=9){const n=Math.max(1,Math.floor(Number(page)||1));return {page:n,skip:(n-1)*perPage,take:perPage};}
`,
  );
  write(
    "src/app/news/page.tsx",
    `'use client';
import { useState } from 'react';
import snapshot from '@/data/snapshot.json';
import { NewsCard } from '@/components/features/content-cards';
import { PageHeading } from '@/components/ui/page-heading';
import { Button } from '@/components/ui/button';
export default function News(){const [q,setQ]=useState(''),[category,setCategory]=useState(''),[page,setPage]=useState(1);const entries=snapshot.news.filter(n=>(!category||n.category===category)&&(n.title+' '+n.excerpt).toLowerCase().includes(q.toLowerCase()));const categories=[...new Set(snapshot.news.map(n=>n.category))];return <><PageHeading eyebrow="NETWORK JOURNAL" title="Tin tức & cập nhật" description="Thông báo và câu chuyện từ cộng đồng. Nội dung là bản chụp tại thời điểm xuất bản."/><div className="container page-content"><div className="filter-toolbar"><div className="filter-tabs">{['',...categories].map(c=><button key={c} className={c===category?'active':''} onClick={()=>{setCategory(c);setPage(1);}}>{c||'Tất cả'}</button>)}</div><label>Tìm bài viết<input className="input" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}} placeholder="Nhập từ khóa..."/></label></div><div className="news-grid">{entries.slice((page-1)*9,page*9).map(n=><NewsCard news={n} key={n.id}/>)}</div>{!entries.length&&<p className="empty-state card">Không có bài viết phù hợp.</p>}<nav className="pagination" aria-label="Phân trang"><Button size="sm" variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Trước</Button><span>Trang {page} / {Math.max(1,Math.ceil(entries.length/9))}</span><Button size="sm" variant="outline" disabled={page*9>=entries.length} onClick={()=>setPage(p=>p+1)}>Sau</Button></nav></div></>;}
`,
  );
  write(
    "src/app/leaderboards/page.tsx",
    `'use client';
import { useState } from 'react';
import snapshot from '@/data/snapshot.json';
import { metrics,type Metric } from '@/config/site';
import { PageHeading } from '@/components/ui/page-heading';
import { RankingTable,Avatar } from '@/components/features/ranking-table';
import { Button } from '@/components/ui/button';
export default function Leaderboards(){const [metric,setMetric]=useState<Metric>('playtime'),[page,setPage]=useState(1);const all=snapshot.rankings.filter(e=>e.metric===metric);const real=all.some(e=>!e.isDemo);const entries=all.filter(e=>e.isDemo!==real).sort((a,b)=>b.value-a.value);return <><PageHeading eyebrow="HALL OF FAME" title="Bảng xếp hạng" description="Thành tích từ snapshot khi xuất bản. Kết nối backend riêng để cập nhật nội dung thật."/><div className="container page-content"><div className="filter-tabs leaderboard-tabs">{Object.entries(metrics).map(([key,label])=><button key={key} className={metric===key?'active':''} onClick={()=>{setMetric(key as Metric);setPage(1);}}>{label}</button>)}</div>{!real&&<div className="notice">DEMO — tên, avatar và thành tích minh họa; không phải dữ liệu người chơi thật.</div>}<div className="podium">{entries.slice(0,3).map((e,i)=><div key={e.id} className={'card podium-card podium-'+(i+1)}><span className="podium-rank">#{i+1}</span><Avatar name={e.player} size={66}/><h2>{e.player}</h2><strong>{e.value.toLocaleString('vi-VN')} {e.unit}</strong>{e.isDemo&&<span className="badge badge-demo">DEMO</span>}</div>)}</div><section className="card"><RankingTable entries={entries.slice((page-1)*10,page*10)} offset={(page-1)*10}/><nav className="pagination" aria-label="Phân trang"><Button size="sm" variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Trước</Button><span>Trang {page} / {Math.max(1,Math.ceil(entries.length/10))}</span><Button size="sm" variant="outline" disabled={page*10>=entries.length} onClick={()=>setPage(p=>p+1)}>Sau</Button></nav></section></div></>;}
`,
  );
  write(
    "src/app/admin/page.tsx",
    `'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { PageHeading } from '@/components/ui/page-heading';
export default function StaticAdmin(){const [url,setUrl]=useState('');useEffect(()=>{const value=window.MC_NETWORK?.adminUrl;if(value?.startsWith('https://'))setUrl(value);},[]);return <><PageHeading eyebrow="STATIC HOSTING" title="Quản trị website" description="Bản iNET phục vụ các tệp tĩnh. Đăng nhập và quản trị cần chạy ở backend Node riêng."/><div className="container page-content"><div className="card detail-copy"><h2>Kết nối dashboard đầy đủ</h2><p className="muted">Mã nguồn Next.js đã có đăng nhập, phân quyền và quản trị database. Triển khai bản đó trên hosting Node, rồi cập nhật adminUrl trong inet-config.js.</p>{url?<a href={url} className="button button-primary" rel="noopener noreferrer" target="_blank">Mở dashboard đã kết nối</a>:<p className="notice">Chưa cấu hình URL dashboard. Không có đăng nhập giả trên bản tĩnh.</p>}<Link href="/" className="text-link">Về trang chủ →</Link></div></div></>;}
`,
  );
  write(
    "src/app/admin/layout.tsx",
    `export const metadata={title:'Quản trị',robots:{index:false,follow:false}};export default function Layout({children}:{children:React.ReactNode}){return children;}`,
  );
  for (const directory of ["news", "game-modes", "store"]) {
    const file = resolve(stage, `src/app/${directory}/[slug]/page.tsx`);
    const table =
      directory === "news"
        ? "news"
        : directory === "store"
          ? "product"
          : "gameMode";
    const flag = directory === "news" ? "published" : "enabled";
    writeFileSync(
      file,
      readFileSync(file, "utf8") +
        `\nexport const dynamicParams=false;\nexport async function generateStaticParams(){return (await db.${table}.findMany({where:{${flag}:true}})).map(item=>({slug:item.slug}));}\n`,
    );
  }
  function clean(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) clean(p);
      else if (/\.tsx?$/.test(p)) {
        let s = readFileSync(p, "utf8").replace(
          /export const dynamic\s*=\s*["']force-dynamic["'];?/g,
          "",
        );
        if (p.endsWith("src/app/layout.tsx")) {
          s = `import Script from 'next/script';\n` + s;
          s = s.replace(
            "<body>",
            '<body><Script src="/inet-config.js" strategy="beforeInteractive"/>',
          );
          s = s.replace(
            '<main id="main" tabIndex={-1}>',
            '<main id="main" tabIndex={-1}><div className="inet-banner">Bản tĩnh iNET · Nội dung snapshot · Các tính năng máy chủ cần backend riêng</div>',
          );
        }
        if (p.endsWith("src/app/support/page.tsx")) {
          // Snapshot pages cannot await request-specific searchParams.
          s = s.replace(
            /const \[c,\s*q\]\s*=\s*await Promise\.all\(\[getConfig\(\),\s*searchParams\]\);/,
            'const c = await getConfig(); const q = {type: "SUPPORT"};',
          );
          s = s.replace(
            /Yêu cầu được lưu vào hệ thống ticket để quản trị viên xem và xử\s*lý\. Website chưa gửi email hay thông báo Discord tự động\./,
            "Biểu mẫu chỉ gửi ticket sau khi kết nối backend Node. Bản tĩnh chưa kết nối sẽ tắt nút gửi và thông báo rõ.",
          );
          s = s.replace(
            'const [c,q]=await Promise.all([getConfig(),searchParams]);const type=["REPORT","APPEAL","SUPPORT"].includes(q.type||"")?q.type!:"SUPPORT";',
            'const c=await getConfig();const type="SUPPORT";',
          );
          s = s.replace(
            "Yêu cầu được lưu vào hệ thống ticket để quản trị viên xem và xử lý. Website chưa gửi email hay thông báo Discord tự động.",
            "Biểu mẫu chỉ gửi ticket khi đã kết nối backend Node riêng. Bản tĩnh chưa kết nối sẽ tắt nút gửi và thông báo rõ.",
          );
        }
        writeFileSync(p, s);
      }
    }
  }
  clean(resolve(stage, "src/app"));
  for (const file of ["robots.ts", "sitemap.ts"]) {
    const path = resolve(stage, "src/app", file);
    writeFileSync(
      path,
      readFileSync(path, "utf8") + '\nexport const dynamic=\"force-static\";\n',
    );
  }
  for (const [dir, title] of [
    ["news", "Tin tức"],
    ["leaderboards", "Bảng xếp hạng"],
  ])
    write(
      `src/app/${dir}/layout.tsx`,
      `export const metadata={title:${JSON.stringify(title)}};export default function Layout({children}:{children:React.ReactNode}){return children;}`,
    );
  write(
    "next.config.ts",
    `import type { NextConfig } from 'next';const config:NextConfig={output:'export',trailingSlash:true,poweredByHeader:false,images:{unoptimized:true}};export default config;`,
  );
  write(
    "public/inet-config.js",
    `// Public connection settings. Never put any token or password here.\nwindow.MC_NETWORK = { staticMode: true, apiBase: '', adminUrl: '' };\n`,
  );
  const result = spawnSync(
    process.execPath,
    [resolve(root, "node_modules/next/dist/bin/next"), "build", "--webpack"],
    {
      cwd: stage,
      env: {
        ...process.env,
        STATIC_EXPORT: "1",
        APP_URL: process.env.INET_SITE_URL || "https://ryuuworl.id.vn",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: "inherit",
    },
  );
  if (result.status !== 0)
    throw Error("Static build failed; no output was published.");
  rmSync(out, { recursive: true, force: true });
  cpSync(resolve(stage, "out"), out, { recursive: true });
  writeFileSync(
    resolve(out, "README-INET.txt"),
    "BẢN TĨNH ĐÃ BUILD — Đặt các file này tại gốc website. Không cần npm hoặc build.\nĐọc docs/INET.md trong mã nguồn để kết nối backend, chỉnh nội dung và dùng Git URL.\n",
  );
  console.log("Static iNET site ready: " + out);
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
