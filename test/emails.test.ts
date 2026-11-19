import { describe, expect, it } from "vitest";
import { extractEmails, rankEmails } from "../src/research/emails.js";

describe("email extraction", () => {
  it("finds plain, mailto and obfuscated addresses, skips junk", () => {
    const html = `<a href="mailto:Bill@BartonRoof.com">Email</a> office [at] bartonroof [dot] com
      info&#64;bartonroof&#46;com <img src="logo@2x.png"> someone@example.com noreply@bartonroof.com`;
    expect(extractEmails(html).sort()).toEqual(["bill@bartonroof.com", "info@bartonroof.com", "office@bartonroof.com"]);
  });
  it("ranks own-domain and owner name first, webmail after", () => {
    const r = rankEmails(["x@gmail.com", "info@bartonroof.com", "william@bartonroof.com"], "bartonroof.com", "William");
    expect(r).toEqual(["william@bartonroof.com", "info@bartonroof.com", "x@gmail.com"]);
  });
});
