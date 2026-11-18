import { createPool } from "./db.js";
import { migrate } from "./migrate.js";
import { activeNiche, activateNicheVersion, publishNicheVersion } from "./niches/registry.js";
import { roofing } from "./niches/roofing.js";
import { discover } from "./research/discover.js";
import { auditProspects } from "./research/audit.js";

const [cmd, ...args] = process.argv.slice(2);
const pool = createPool();
try {
  await migrate(pool);
  if (!(await activeNiche(pool))) await activateNicheVersion(pool, await publishNicheVersion(pool, roofing), "cli");
  if (cmd === "discover") console.log(await discover(pool, args.join(" ")));
  else if (cmd === "audit") console.log(await auditProspects(pool, Number(args[0] ?? 50)));
  else console.log("usage: npm run cli -- discover <area>");
} finally {
  await pool.end();
}
