import { createPool } from "./db.js";
import { migrate } from "./migrate.js";
import { activeNiche, activateNicheVersion, publishNicheVersion } from "./niches/registry.js";
import { roofing } from "./niches/roofing.js";
import { discover } from "./research/discover.js";
import { auditProspects } from "./research/audit.js";
import { buildAndReview } from "./build/pipeline.js";
import { enrichLicenses } from "./research/enrich.js";

const [cmd, ...args] = process.argv.slice(2);
const pool = createPool();
try {
  await migrate(pool);
  if (!(await activeNiche(pool))) await activateNicheVersion(pool, await publishNicheVersion(pool, roofing), "cli");
  if (cmd === "discover") console.log(await discover(pool, args.join(" ")));
  else if (cmd === "audit") console.log(await auditProspects(pool, Number(args[0] ?? 50)));
  else if (cmd === "build") console.log(JSON.stringify(await buildAndReview(pool, Number(args[0])), null, 1));
  else if (cmd === "licenses") console.log(await enrichLicenses(pool));
  else if (cmd === "build-name") {
    const r = await pool.query(`SELECT id FROM prospects WHERE business_name = $1`, [args.join(" ")]);
    if (!r.rowCount) throw new Error("no prospect with that name");
    const out = await buildAndReview(pool, Number(r.rows[0].id));
    console.log(JSON.stringify({ verdict: out.verdict, url: (out as any).url, failed: (out as any).checks?.filter((c: any) => !c.pass) }));
  }
  else console.log("usage: npm run cli -- discover <area>");
} finally {
  await pool.end();
}
