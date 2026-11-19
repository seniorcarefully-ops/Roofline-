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
    const r = await t.sendSms(to, "Roofline Websites test: this is the Roofline Websites number (509) 390-8200. Reply STOP to opt out.", "+15093908200");
    await pool.query(`INSERT INTO messages(channel, direction, idempotency_key, provider_id, status, body, meta) VALUES ('sms','outbound',$1,$2,$3,$4,$5)`,
      [`sms-test:${r.sid}`, r.sid, r.status, "owner test", JSON.stringify({ to })]);
    await new Promise((res) => setTimeout(res, 15000));
    console.log(JSON.stringify({ sent: r, after15s: await t.messageStatus(r.sid) }));
  }
  else if (cmd === "ai-test") {
    const { claude, CONVERSATION_MODEL } = await import("./ai/client.js");
    const m = await claude.messages.create({
      model: CONVERSATION_MODEL, max_tokens: 200,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: "Reply with exactly: Roofline Websites assistant online." }],
    } as any);
    const text = m.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    console.log(JSON.stringify({ stop: m.stop_reason, text, usage: m.usage }));
  }
  else if (cmd === "ai-eval") console.log(JSON.stringify(await (await import("./ai/eval.js")).runEval()));
  else if (cmd === "find-emails") console.log(await (await import("./research/emails.js")).findEmails(pool, Number(args[0] ?? 50), { verify: args[1] !== "noverify" }));
  else if (cmd === "verify-emails") console.log(await (await import("./research/emails.js")).verifyPending(pool, Number(args[0] ?? 100)));
  else if (cmd === "email-report") {
    const r = await pool.query(`SELECT detail->>'status' AS status, (detail->>'catch_all')::bool AS catch_all, split_part(detail->>'email','@',2) AS domain_kind,
      count(*) FROM events WHERE track='email_verify' GROUP BY 1,2,3 ORDER BY 4 DESC`);
    console.log(JSON.stringify(r.rows.map((x) => ({ ...x, domain_kind: /gmail|yahoo|hotmail|outlook|aol|icloud|comcast/.test(x.domain_kind) ? "webmail" : "own-domain" }))));
  }
  else console.log("usage: npm run cli -- discover <area>");
} finally {
  await pool.end();
}
