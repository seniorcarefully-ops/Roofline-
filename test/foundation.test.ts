import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type pg from "pg";
import { freshDb } from "./helpers.js";
import { roofing } from "../src/niches/roofing.js";
import { activateNicheVersion, activeNiche, publishNicheVersion } from "../src/niches/registry.js";
import { transition, TransitionError } from "../src/state.js";
import { claim, enqueue, fail, runOnce } from "../src/jobs.js";
import { renderInitialEmail, LOCKED_BODY } from "../src/outreach/template.js";
import { checkInitialEmailGate } from "../src/outreach/gate.js";
import { grantSms, withdrawSms, isStopMessage, toE164 } from "../src/outreach/consent.js";

let pool: pg.Pool;
beforeEach(async () => {
  if (pool) await pool.end();
  pool = await freshDb();
});
afterAll(() => pool?.end());

async function prospect(versionId: number, extra: Record<string, unknown> = {}) {
  const r = await pool.query(
    `INSERT INTO prospects(niche_version_id, business_name, contact_email, contact_verified, contact_first_name)
     VALUES ($1, 'Acme Roofing', 'owner@acmeroof.test', true, 'Dana') RETURNING id`,
    [versionId],
  );
  const id = Number(r.rows[0].id);
  for (const [k, v] of Object.entries(extra)) await pool.query(`UPDATE prospects SET ${k} = $2 WHERE id = $1`, [id, v]);
  return id;
}

async function makeSendable(id: number) {
  await pool.query(`UPDATE settings SET outreach_paused = false, daily_email_cap = 10`);
  await transition(pool, id, "prospect_state", "qualified", "test");
  for (const s of ["build_queued", "building", "reviewing", "approved", "ready_to_send"])
    await transition(pool, id, "website_state", s, "test");
  const pv = await pool.query(
    `INSERT INTO previews(prospect_id, version, content_hash, token) VALUES ($1::bigint, 1, 'h', 'tok' || $1::text) RETURNING id`, [id]);
  await pool.query(`INSERT INTO reviews(preview_id, verdict, checks, reviewer) VALUES ($1,'approved','{}','reviewer')`,
    [pv.rows[0].id]);
  await pool.query(`INSERT INTO audit_documents(prospect_id, file_path, sha256) VALUES ($1,'a.pdf','x')`, [id]);
  for (const code of ["broken_links", "no_tap_to_call", "no_estimate_cta"])
    await pool.query(
      `INSERT INTO audit_findings(prospect_id, code, summary, detail, source_url, evidence_path, captured_at, verified)
       VALUES ($1,$2,'s','d','https://acmeroof.test','e.png',now(),true)`, [id, code]);
}

describe("niche switching", () => {
  it("preserves existing prospects' original brand version", async () => {
    const v1 = await publishNicheVersion(pool, roofing);
    await activateNicheVersion(pool, v1, "owner");
    const id = await prospect(v1);
    const v2 = await publishNicheVersion(pool, { ...roofing, niche: "mechanics",
      brand: { ...roofing.brand, name: "OtherBrand" } });
    await activateNicheVersion(pool, v2, "owner");
    expect((await activeNiche(pool))!.config.brand.name).toBe("OtherBrand");
    const r = await pool.query(`SELECT niche_version_id FROM prospects WHERE id=$1`, [id]);
    expect(Number(r.rows[0].niche_version_id)).toBe(v1);
  });
});

describe("state transitions", () => {
  it("rejects illegal moves and logs legal ones", async () => {
    const id = await prospect(await publishNicheVersion(pool, roofing));
    await expect(transition(pool, id, "website_state", "ready_to_send", "t")).rejects.toThrow(TransitionError);
    await transition(pool, id, "website_state", "build_queued", "t");
    const ev = await pool.query(`SELECT * FROM events WHERE subject_id=$1`, [String(id)]);
    expect(ev.rows).toHaveLength(1);
  });

  it("events are append-only", async () => {
    const id = await prospect(await publishNicheVersion(pool, roofing));
    await transition(pool, id, "website_state", "build_queued", "t");
    await pool.query(`DELETE FROM events`);
    await pool.query(`UPDATE events SET actor='x'`);
    const ev = await pool.query(`SELECT actor FROM events`);
    expect(ev.rows).toEqual([{ actor: "t" }]);
  });
});

describe("jobs", () => {
  it("dedupes by key and never double-claims", async () => {
    const a = await enqueue(pool, "build", {}, { key: "build:1" });
    const b = await enqueue(pool, "build", {}, { key: "build:1" });
    expect(a).toBe(b);
    const [x, y] = await Promise.all([claim(pool), claim(pool)]);
    expect([x, y].filter(Boolean)).toHaveLength(1);
  });

  it("retries then opens an exception", async () => {
    await enqueue(pool, "build", {}, { maxAttempts: 2 });
    let j = (await claim(pool))!;
    expect(await fail(pool, j, "boom")).toBe("retry");
    await pool.query(`UPDATE jobs SET run_after = now()`);
    j = (await claim(pool))!;
    expect(await fail(pool, j, "boom")).toBe("failed");
    expect((await pool.query(`SELECT * FROM exceptions`)).rowCount).toBe(1);
  });

  it("runOnce completes a handled job", async () => {
    await enqueue(pool, "noop", {});
    expect(await runOnce(pool, { noop: async () => {} })).toBe(true);
    expect((await pool.query(`SELECT status FROM jobs`)).rows[0].status).toBe("done");
  });
});

describe("locked email", () => {
  it("renders the exact approved wording", () => {
    const e = renderInitialEmail({ company: "Acme Roofing", firstName: "Dana",
      findings: ["a", "b", "c"], senderName: "Micah", optInUrl: "https://rooflinewebsites.com/t/abc" });
    expect(e.subject).toBe("A new website for Acme Roofing");
    expect(e.body).toBe(LOCKED_BODY.replace("[First Name]", "Dana").replace("[X]", "a").replace("[Y]", "b")
      .replace("[Z]", "c").replaceAll("[Company]", "Acme Roofing").replace("[Name]", "Micah").replace("[Link]", "https://rooflinewebsites.com/t/abc"));
    expect(e.body).toContain("or enter it here: https://rooflinewebsites.com/t/abc. No obligation.");
    expect(e.body).not.toMatch(/Want to see it/);
  });
  it("refuses to pad findings", () => {
    expect(() => renderInitialEmail({ company: "A", firstName: null,
      findings: ["a", "b", ""] as [string, string, string], senderName: "M", optInUrl: "https://x.test/t" })).toThrow();
  });
});

describe("send gate", () => {
  it("blocks sending when no approved preview exists", async () => {
    const id = await prospect(await publishNicheVersion(pool, roofing));
    const g = await checkInitialEmailGate(pool, id);
    expect(g.ok).toBe(false);
    expect(g.reasons.join()).toMatch(/not ready_to_send/);
    expect(g.reasons.join()).toMatch(/not approved/);
  });

  it("passes when every prerequisite is met, findings in priority order", async () => {
    const id = await prospect(await publishNicheVersion(pool, roofing));
    await makeSendable(id);
    const g = await checkInitialEmailGate(pool, id);
    expect(g.reasons).toEqual([]);
    expect(g.findings![0]).toBe("a tap-to-call button on mobile");
  });

  it("blocks when paused or suppressed", async () => {
    const id = await prospect(await publishNicheVersion(pool, roofing));
    await makeSendable(id);
    await pool.query(`INSERT INTO suppressions(channel,address,reason) VALUES ('email','owner@acmeroof.test','unsub')`);
    await pool.query(`UPDATE settings SET outreach_paused = true`);
    const g = await checkInitialEmailGate(pool, id);
    expect(g.reasons).toEqual(expect.arrayContaining(["outreach is paused", "address is on suppression list"]));
  });
});

describe("sms consent", () => {
  it("records evidence and STOP suppresses", async () => {
    const id = await prospect(await publishNicheVersion(pool, roofing));
    const phone = await grantSms(pool, id, "(206) 555-0142", "Sure, text me at 206-555-0142", "email_reply:1");
    expect(phone).toBe("+12065550142");
    expect(isStopMessage(" STOP ")).toBe(true);
    await withdrawSms(pool, phone, "STOP", "sms:1");
    expect((await pool.query(`SELECT sms_state FROM prospects`)).rows[0].sms_state).toBe("withdrawn");
    await expect(grantSms(pool, id, phone, "ok", "email_reply:2")).rejects.toThrow(/suppressed/);
    expect(toE164("123")).toBeNull();
  });
});

import { renderNoWebsiteEmail, LOCKED_NO_SITE_BODY } from "../src/outreach/template.js";
describe("no-website email", () => {
  it("renders approved wording with verified listing facts", () => {
    const e = renderNoWebsiteEmail({ company: "Acme Roofing", firstName: null, reviewCount: 12, rating: 4.6, senderName: "Micah", optInUrl: "https://rooflinewebsites.com/t/x" });
    expect(e.subject).toBe("A website for Acme Roofing");
    expect(e.body).toContain("Hi Acme Roofing team,");
    expect(e.body).toContain("You have 12 reviews averaging 4.6 stars, but no website linked to your listing");
    expect(e.body.split("\n").length).toBe(LOCKED_NO_SITE_BODY.split("\n").length);
  });
  it("refuses unverified or thin data", () => {
    expect(() => renderNoWebsiteEmail({ company: "A", firstName: null, reviewCount: 3, rating: 5, senderName: "M", optInUrl: "https://x.test/t" })).toThrow();
  });
  it("gate uses listing facts instead of audit, still needs approved preview", async () => {
    const v = await publishNicheVersion(pool, roofing);
    const id = Number((await pool.query(`INSERT INTO prospects(niche_version_id, business_name, outreach_template,
      google_rating, google_review_count, contact_email, contact_verified) VALUES ($1,'NoSite Roofing','no_website',4.7,20,'a@b.test',true)
      RETURNING id`, [v])).rows[0].id);
    let g = await checkInitialEmailGate(pool, id);
    expect(g.ok).toBe(false);
    expect(g.reasons.join()).toMatch(/not ready_to_send/);
    await pool.query(`UPDATE settings SET outreach_paused=false`);
    await transition(pool, id, "prospect_state", "qualified", "t");
    for (const s of ["build_queued", "building", "reviewing", "approved", "ready_to_send"]) await transition(pool, id, "website_state", s, "t");
    const pv = await pool.query(`INSERT INTO previews(prospect_id, version, content_hash, token) VALUES ($1::bigint,1,'h','tok' || $1::text) RETURNING id`, [id]);
    await pool.query(`INSERT INTO reviews(preview_id, verdict, checks, reviewer) VALUES ($1,'approved','{}','r')`, [pv.rows[0].id]);
    g = await checkInitialEmailGate(pool, id);
    expect(g).toMatchObject({ ok: true, template: "no_website" });
  });
});
