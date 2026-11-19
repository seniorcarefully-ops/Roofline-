import { createPool } from "./db.js";
import { migrate } from "./migrate.js";
import { activeNiche, activateNicheVersion, publishNicheVersion, refreshNiche } from "./niches/registry.js";
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
  else if (cmd === "niche-refresh") console.log(await refreshNiche(pool, roofing, "cli"));
  else if (cmd === "twilio-numbers") {
    const t = await import("./sms/twilio.js");
    console.log(JSON.stringify({ owned: await t.listOwnedNumbers(), available: await t.searchNumbers(args[0] ?? "509") }));
  }
  else if (cmd === "twilio-buy") {
    const t = await import("./sms/twilio.js");
    if (!/^\+1\d{10}$/.test(args[0] ?? "")) throw new Error("usage: twilio-buy +1XXXXXXXXXX");
    console.log(JSON.stringify(await t.buyNumber(args[0]!, "Roofline main")));
  }
  else if (cmd === "sms-test") {
    // Owner test only: one message to a number the owner gave permission for.
    const t = await import("./sms/twilio.js");
    const to = args[0]!;
    if (!/^\+1\d{10}$/.test(to)) throw new Error("usage: sms-test +1XXXXXXXXXX");
    const r = await t.sendSms(to, "Roofline test: this is the new Roofline number (509) 390-8200. Reply STOP to opt out.", "+15093908200");
    await pool.query(`INSERT INTO messages(channel, direction, idempotency_key, provider_id, status, body, meta) VALUES ('sms','outbound',$1,$2,$3,$4,$5)`,
      [`sms-test:${r.sid}`, r.sid, r.status, "owner test", JSON.stringify({ to })]);
    await new Promise((res) => setTimeout(res, 15000));
    console.log(JSON.stringify({ sent: r, after15s: await t.messageStatus(r.sid) }));
  }
  else console.log("usage: npm run cli -- discover <area>");
} finally {
  await pool.end();
}
