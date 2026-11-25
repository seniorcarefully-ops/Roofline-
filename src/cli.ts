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
  else if (cmd === "audit") console.log(await auditProspects(pool, Number(args[0] ?? 50), args[1] ? args[1].split(",") : undefined));
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
  else if (cmd === "email-reapply") {
    // Re-apply recorded verification results (no new checks, no credits).
    const r = await pool.query(`UPDATE prospects p SET contact_verified = true
      FROM (SELECT DISTINCT ON (subject_id) subject_id, detail FROM events WHERE track='email_verify' ORDER BY subject_id, id DESC) e
      WHERE e.subject_id = p.id::text AND e.detail->>'status' IN ('valid','verified') AND NOT (e.detail->>'catch_all')::bool
        AND p.contact_email = e.detail->>'email'`);
    // Published-on-own-site catch-all addresses (approved 2026-11-20): sendable, flagged, capped in the queue.
    const c = await pool.query(`UPDATE prospects p SET contact_verified = true, contact_catch_all = true
      FROM (SELECT DISTINCT ON (subject_id) subject_id, detail FROM events WHERE track IN ('email_verify','email_search') ORDER BY subject_id, id DESC) e
      WHERE e.subject_id = p.id::text AND e.detail->>'status' IN ('valid','verified') AND (e.detail->>'catch_all')::bool
        AND p.contact_email IS NOT NULL AND lower(p.contact_email) = lower(coalesce(e.detail->>'email', e.detail->>'chosen'))`);
    console.log({ markedVerified: r.rowCount, catchAllPublished: c.rowCount });
  }
  else if (cmd === "score") console.log(JSON.stringify(await (await import("./research/score.js")).scoreAll(pool)));
  else if (cmd === "guess-emails") console.log(await (await import("./research/emails.js")).guessEmails(pool, Number(args[0] ?? 50)));
  else if (cmd === "queue-leads") console.log(JSON.stringify(await (await import("./outreach/instantly.js")).queueLeads(pool, { minScore: Number(args[0] ?? 60), limit: Number(args[1] ?? 50) })));
  else if (cmd === "ensure-campaign") console.log(await (await import("./outreach/instantly.js")).ensureCampaign(args[0] ?? "roofing"));
  else if (cmd === "discover-niche") {
    // Discover for a specific niche without changing which niche is live: discover-niche <niche> <area>
    const { NICHES } = await import("./niches/index.js");
    const cfg = NICHES[args[0]!]; if (!cfg) throw new Error("unknown niche");
    const latest = (await pool.query(`SELECT id, config FROM niche_versions WHERE niche_id = $1 ORDER BY version DESC LIMIT 1`, [cfg.niche])).rows[0];
    const id = latest && JSON.stringify(latest.config) === JSON.stringify(cfg) ? Number(latest.id) : await publishNicheVersion(pool, cfg);
    console.log(await discover(pool, args.slice(1).join(" "), 3, { id, config: cfg }));
  }
  else if (cmd === "build-top") {
    // Build a preview for the best qualified prospect of a niche: build-top <niche>
    const r = await pool.query(`SELECT p.id, p.business_name FROM prospects p JOIN niche_versions v ON v.id = p.niche_version_id
      WHERE v.niche_id = $1 AND p.prospect_state = 'qualified' AND p.website_state = 'none'
      ORDER BY (SELECT count(*) FROM audit_findings f WHERE f.prospect_id = p.id) DESC, p.google_review_count DESC NULLS LAST LIMIT 1`, [args[0]]);
    if (!r.rowCount) throw new Error("no qualified prospect");
    const out: any = await buildAndReview(pool, Number(r.rows[0].id));
    console.log(JSON.stringify({ business: r.rows[0].business_name, verdict: out.verdict, url: out.url, optin: out.url?.replace("/p/", "/s/"), failed: out.checks?.filter((c: any) => !c.pass) }));
  }
  else if (cmd === "daily") console.log(JSON.stringify(await (await import("./automation/daily.js")).runDaily(pool)));
  else if (cmd === "import-supersearch") console.log(await (await import("./research/supersearch.js")).importSupersearch(pool, args[0]!));
  else if (cmd === "supersearch-report") console.log(JSON.stringify(await (await import("./research/supersearch.js")).supersearchReport(pool)));
  else if (cmd === "test-send" || cmd === "test-restore") {
    const r = await pool.query(`SELECT p.id FROM prospects p JOIN previews pv ON pv.prospect_id = p.id WHERE pv.token = $1`, [args[0]]);
    const m = await import("./outreach/instantly.js");
    console.log(JSON.stringify(cmd === "test-send" ? await m.testSend(pool, Number(r.rows[0].id), args[1]!) : await m.testRestore(pool, Number(r.rows[0].id))));
  }
  else if (cmd === "stuck") {
    const r = await pool.query(`SELECT id, business_name, website_state, place_id IS NOT NULL AS has_place FROM prospects WHERE website_state IN ('build_queued','building','reviewing')`);
    const out = [];
    for (const p of r.rows) {
      try { const x: any = await buildAndReview(pool, Number(p.id)); out.push({ ...p, verdict: x.verdict }); }
      catch (e) { out.push({ ...p, error: e instanceof Error ? e.stack?.split("\n").slice(0, 3).join(" | ") : String(e) }); }
    }
    console.log(JSON.stringify(out));
  }
  else console.log("usage: npm run cli -- discover <area>");
} finally {
  await pool.end();
}
