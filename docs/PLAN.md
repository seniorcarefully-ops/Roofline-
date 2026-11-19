# Automated Website Business — Living Plan & Claude Handoff

**Document version:** 1.1  
**Updated:** November 18, 2026 (America/Los_Angeles)  
**Stage:** Planning. Implementation is not authorized by this document.  
**First niche:** Roofing. Architecture must support selecting other niches.  
**Purpose:** One editable source of truth for the business, offers, acquisition workflow, agent responsibilities, requirements, decisions, and implementation roadmap.

## 1. Instructions for Claude — read first

We are outlining an automated business before building it. Read this entire document and preserve the confirmed decisions. Do not create a website, scaffold an application, deploy, buy services, send outreach, or activate agents until Micah explicitly authorizes implementation.

Your first assignment is to:

1. Restate the business and customer journey briefly.
2. Map the agents, shared records, queues, and integrations needed for one complete workflow.
3. Propose the simplest practical architecture and staged implementation plan. Separate one-time setup, recurring software costs, usage costs, and human handoffs. Use verified current pricing before estimating vendor costs.
4. Identify unresolved decisions and dependencies; distinguish them from decisions already confirmed here.
5. Describe concrete acceptance checks for each build phase.
6. Return the plan for review. Do not begin coding as part of this planning assignment.

Keep explanations straightforward. Prefer a small dependable system over unnecessary frameworks or a large collection of independently improvising agents. An agent role is a responsibility; it does not necessarily require its own application, model, or computer.

## 2. Business objective

Create a business that agents operate from prospect discovery through sales, customer onboarding, fulfillment, updates, marketing, billing, reporting, and follow-up. Micah sets direction, budgets, permissions, and policies and handles unresolved exceptions.

Start with roofers. Prove one repeatable acquisition workflow, then scale it and reuse the system for another selected niche. Automation reliability and commercial success must be measured; neither profitability nor sales are guaranteed.

## 3. Confirmed decisions

| Topic | Confirmed direction |
|---|---|
| Initial market | Roofing companies; initial geographic area still to be selected |
| Expandability | Select another niche without rebuilding the underlying business system |
| Public presentation | Main website presents one niche-specific brand at a time |
| Website offer | Flat $150/month; no tiers, setup fee, or long-term commitment; cancel anytime; routine updates included |
| SMS offer | Independent $200/month AI missed-call response service; does not include the website |
| Marketing offer | Independent $500/month automated marketing system combining content and paid ads management |
| Advertising spend | Customer pays separately from the $500 management subscription |
| Value promise | AI SMS and marketing: if customers are not getting value, they do not pay; each service must show its value through insights |
| Acquisition channel | Start with researched cold email and move interested prospects to opted-in SMS |
| Initial email | Exact approved wording is locked in section 6 |
| Audit | Short, prospect-specific audit attached to the initial email |
| Preview delivery | Hosted, mobile-friendly preview link delivered through SMS after appropriate opt-in; email fallback |
| Quality review | Separate builder and reviewer responsibilities; approved sites enter Ready to send |
| Purchase | Customer can purchase directly from the preview; ask questions through SMS |
| Domain | Connect their existing domain to the new site; generally no registrar transfer; customer retains ownership |
| Website updates | Requests by email or customer dashboard |
| Continuous improvement | An agent tests hooks, targeting, and strategy through a measured feedback loop |
| Present stage | Planning and handoff only; no further implementation until explicitly requested |

Earlier $120 website pricing, $300 SMS pricing, and treating content/ads as two separately priced $500 services are superseded.

## 4. Offers and service boundaries

### 4.1 Managed website — $150/month

A professionally presented, initially one-page scrolling business website, including hosting, HTTPS, maintenance, mobile layout, clear contact actions, and routine updates to text, photos, services, hours, and business information.

Customer-facing promise: no setup fee, no long-term commitment, cancel anytime, and updates requested anytime through email or a dashboard. Final terms must define turnaround, included changes, larger feature requests, domain renewal responsibility, site ownership/export, cancellation, and hosting handoff.

### 4.2 AI missed-call response — $200/month

An independent service that can work with the customer's existing website. Through a compatible phone integration, detect eligible missed calls and initiate permitted SMS follow-up. Answer business questions, capture job details, qualify inquiries, and notify the business. Handle inbound customer texts as supported by the agreed scope.

Use approved customer-specific knowledge. Do not invent availability, prices, quotes, or appointments. Escalate uncertainty and requests requiring a person. Define usage allowance, number setup, supported phone systems, escalation rules, and messaging consent before activation.

### 4.3 Automated marketing system — $500/month

One coordinated service that:

- Researches the business, niche, audience, competitors, and relevant content opportunities.
- Creates and publishes content on agreed connected channels.
- Creates and manages authorized paid campaigns within approved budgets.
- Collects analytics, reports results, and adjusts activity within agreed rules.
- Highlights the value delivered rather than only showing activity counts.

Content and paid advertising share strategy, business information, assets, and reporting. Ad spend is separate and paid by the customer. Define platforms, posting volume, asset types, campaign scope, approvals, and optimization limits before selling the final scope.

### 4.4 Independent purchasing

No tier ladder or required bundles. Each subscription can be bought or canceled independently. Buying SMS or marketing does not require buying the website.

| Selection | Monthly service fees |
|---|---:|
| Website only | $150 |
| SMS only | $200 |
| Marketing only | $500 |
| Website + SMS | $350 |
| Website + marketing | $650 |
| SMS + marketing | $700 |
| All three | $850 |

Advertising spend is additional where applicable. Do not add unapproved discounts, setup fees, or bundles.

## 5. Dynamic niche branding

The owner chooses the active niche internally. The main public website changes its brand name/logo, colors, imagery, copy, examples, FAQs, terminology, and niche-specific offer presentation.

For roofing, the site should feel like a dedicated roofing website service. If switched to mechanics, it should present a dedicated mechanic website service. Do not show a public niche picker or general multi-industry agency presentation.

Each niche configuration should also supply prospecting criteria, outreach variables, audit priorities, builder requirements, and approved sales knowledge. Scope the actual configurable fields during planning.

Preserve existing customer sites, subscriptions, previews, old campaign links, consent records, sender identity, and conversations when switching niches. Existing conversations must continue under the brand and permissions originally used. Do not silently apply the new niche to existing customers.

Brand names, domains, and visual identities have not been selected. Names used in an earlier exploratory draft are not approved business names. Niche focus does not authorize invented specialization history, testimonials, or exclusivity claims.

### 5.1 Niche-hopping growth model (confirmed November 18, 2026)

The engine runs one niche at a time through the same repeatable playbook: configure niche → discover → audit → build → review → outreach → measure. When a niche is proven and its addressable market is being exhausted, the engine moves to the next small-business niche and repeats. Volume goal: 100,000+ cold emails/month across niches.

Planning assumptions (to be replaced with measured Stage 1 data): roofing supports roughly 10,000–20,000 emails/month for its first year (about 30,000–50,000 reachable prospects, one sequence each). Planning conversion: 0.2% of emails to paid customers; 0.5% stretch.

Proposal, not yet decided: run proven niches in parallel rather than strictly in sequence, each under its own niche brand, domain and sending domains, so earlier niches keep producing while new ones ramp.

### 5.2 Decisions and proposals from November 18, 2026

Confirmed direction (Micah):
- Audit is a conversion piece: attention, evidence of the issue, and one call to action — opt in by SMS to see the site we built.
- Voice: a real person who only builds websites for this niche. Never claim to be local to a prospect unless true.
- AI SMS is both our sales assistant and the $200/month product; build one engine on Twilio + Claude, reused for both.
- Post-purchase domain connection is one step via Entri Connect (assisted fallback for unsupported providers).
- Customer portal: simple, clean; self-serve site updates with visible results; manage subscriptions and add/remove upsells (Stripe Customer Portal).
- Brand phone number per niche: calls go to voicemail, then the AI SMS assistant follows up, demonstrating the upsell. Each niche brand gets its own number, greeting, and AI knowledge from its niche configuration; existing conversations keep the brand they started under.
- Growth is self-funding: after the jumpstart, acquisition spend is capped at a share of collected revenue.

PROPOSED, awaiting approval:
- Locked email change to add an SMS opt-in link (see section 6.2).
- Growth governor numbers (see section 20.1).

### 5.3 Owner decisions, November 19, 2026

- Goal: 1,000 paying subscribers. Start small; scale to thousands, then potentially hundreds of thousands, of emails per month under the growth governor.
- Fully agent-operated: no human-delivered sales, support, or service is offered. Emails, replies, SMS and support are handled by agents. The owner builds and directs the system; exceptions route to the owner only when the system cannot resolve them.
- Brand persona: Roofline uses a brand character (photoreal human image, fictional "family of roofers" brand legend) as its public face and as the sender identity on outreach. Owner considers this acceptable brand storytelling.
- Guardrails kept: the persona makes no checkable professional claims (licenses, years, specific jobs, reviews, awards); case studies and results stay real; legally required sender identity (business name, postal address) stays real; agents disclose being AI where required (SMS first message; when asked; AI-bot disclosure laws such as California's); a discreet footer line notes the brand character.

## 6. LOCKED: initial cold email

Preserve this exact subject and body unless Micah explicitly approves a revision. Populate placeholders only with verified information. Do not reintroduce “Want to see it?”

**Subject: A new website for [Company]**

Hi [First Name],

I noticed your website is missing [X], [Y], and [Z]. I’ve attached a short audit showing what I found.

I went ahead and built a new website for [Company] that addresses these issues.

Just reply with your cell number and permission to text you the preview, or enter it here: [Link]. No obligation.

—[Name]

(Opt-in link approved November 18, 2026.)

Operational requirements:

- Include the promised audit attachment. Its findings must be accurate, relevant, and evidenced; do not invent three failures to fill placeholders.
- Use an appropriate supported greeting if a first name cannot be verified; agree the fallback during setup.
- Sender identification, business postal address, commercial disclosure, and unsubscribe mechanism belong in the required footer/setup. They are not a license to rewrite the approved hook.
- Since this email says the site has already been built, an actual built and reviewed preview is a send prerequisite. No email may assert a nonexistent preview exists.

**Timing resolution:** Earlier brainstorming proposed building only after a phone opt-in. The newly locked email requires building before the initial email. The working flow therefore builds and reviews before outreach. If Micah chooses build-after-opt-in instead, explicitly resolve the conflict and obtain approval for corresponding truthful email wording; do not silently change either decision.

### 6.1 LOCKED: no-website variant (approved November 18, 2026)

Used only for businesses whose Google listing has no website and at least 5 reviews. [N] and [Rating] come only from the Google listing. No audit attachment. The prebuilt, reviewed preview requirement still applies.

**Subject: A website for [Company]**

Hi [First Name],

I came across [Company] on Google. You have [N] reviews averaging [Rating] stars, but no website linked to your listing, so homeowners who find you there can’t see your services or request an estimate online.

I went ahead and built a website for [Company] using your public business information.

Just reply with your cell number and permission to text you the preview, or enter it here: [Link]. No obligation.

—[Name]

### 6.2 Opt-in link revision (APPROVED November 18, 2026; now part of the locked email)

Current locked line: "Just reply with your cell number and permission to text you the preview. No obligation."
Proposed: "Just reply with your cell number and permission to text you the preview, or enter it here: [link]. No obligation."
A/B test APPROVED November 18, 2026 (Micah: "Approve test"): variant A = current locked email with audit attachment + opt-in link; variant B = no attachment, audit hosted on the link page (wording below), judged on purchases.

Variant B wording (approved for the test only):

Subject: A new website for [Company]

Hi [First Name],

I noticed your website is missing [X], [Y], and [Z]. I put together a short audit showing what I found, and I went ahead and built a new website for [Company] that fixes these issues.

You can see both here: [Link]. Or just reply with your cell number and I'll text you the preview. No obligation.

—[Name]
I build websites just for [niche plural].

Deliverability note: links and attachments in a first cold email lower inbox placement. Recommended rollout is a controlled A/B test against the current locked control.

## 7. Main acquisition journey

1. Select niche, geography, criteria, campaign limits, and sending identity.
2. Agent 001 discovers and qualifies prospects, verifies business/contact details, and prepares evidence for a short audit.
3. Build an actual personalized website preview for each selected outreach prospect.
4. Reviewer checks the preview against the build criteria; fix or replace failures. Place approved previews in Ready to send.
5. Agent 002 populates the locked email, attaches the audit, verifies send prerequisites, and sends through the configured email system.
6. Classify replies. If a prospect replies with their own cell number and relevant permission, record the permission and start the SMS handoff. If ambiguous, clarify before sending.
7. The SMS assistant introduces the sender and itself as AI, acknowledges the request, answers questions, and delivers the approved preview promptly. A prebuilt approved site should not be delayed to create a waiting period.
8. If genuine final edits are needed, the assistant reports the real status while the builder/reviewer finish them. Never claim edits are happening when they are not.
9. The preview includes a clear $150/month purchase action. SMS remains available for questions.
10. On purchase, stop prospect sequences, create the customer/subscription record, confirm site details, connect the domain, verify launch, and send confirmation.
11. Offer the independent SMS and marketing services when relevant and permitted; the helpful SMS experience itself demonstrates the SMS product.
12. Route eligible non-buyers to bounded follow-up or nurture; suppress rejections/opt-outs appropriately.

Initial email is the acquisition channel. Human cold calling was discussed as a possible later channel, not a launch dependency. Automated AI voice outreach needs a separately approved plan.

## 8. Agent responsibilities

The identifiers below describe responsibilities, not mandatory separate infrastructure. Agent 001 and 002 match Micah's named roles; later identifiers organize the remaining work.

| ID | Role | Responsibilities | Output / next step |
|---|---|---|---|
| 001 | Prospect researcher and auditor | Search approved sources; check fit, mobile usability and contact friction; verify details; deduplicate; retain audit evidence | Qualified prospect + audit + verified build brief |
| 002 | Email outreach and reply handling | Populate the locked template; verify approved preview/audit; send within limits; classify replies; capture SMS permission | SMS handoff, follow-up, closed prospect, or suppression |
| 003 | Strategy and experimentation | Evaluate targeting, hooks, conversion, objections, timing, and economics; propose controlled tests | Evidence-backed recommendations; approved experiments |
| 004 | Website builder | Populate approved niche designs using verified facts; make revisions or replacements | Preview awaiting quality review |
| 005 | Independent quality reviewer | Check factual accuracy and functional/visual criteria; approve, request edits, or request replacement | Ready to send, change list, or escalation |
| 006 | SMS sales assistant | Prompt permitted response; transparent AI identity; status-aware conversation; preview delivery; questions; checkout and relevant upsells | Purchase, qualified follow-up, escalation, or opt-out |
| 007 | Email follow-up and nurture | Send limited approved sequences and genuine case studies to eligible recipients | Re-engagement or closed record |
| 008 | Customer onboarding and launch | Confirm details, approvals, authorized domain/phone/channel connections, launch verification | Activated subscribed service |
| 009 | Website maintenance and support | Turn email/dashboard requests into revisions; check, publish within permissions, notify, retain rollback | Completed request or exception |
| 010 | Marketing fulfillment | Research, create, publish, manage authorized ads, collect analytics | Customer marketing activity and performance |
| 011 | Insights and value reporting | Aggregate verified operational, conversion, cost, and customer outcomes | Owner reports and customer value summaries |

Billing, scheduling, state changes, consent gates, retries, and suppression should use deterministic software where possible. Models assist with reasoning and communication; they should not improvise billing amounts, permissions, or delivery guarantees.

## 9. Queues and shared prospect record

Maintain separate lifecycle fields so a prospect's outreach status cannot be confused with their website-production or permission status.

| Track | Suggested states |
|---|---|
| Prospect | Discovered → Qualified → Contacted → Interested → Purchased / Closed |
| Website | Build queued → Building → Reviewing → Changes requested / Replacement requested → Approved → Ready to send → Sent → Customer approved → Live |
| Messaging | Email eligible / Suppressed; SMS permission missing / Granted / Withdrawn |
| Update request | Received → Needs clarification / Preparing → Reviewing → Published → Customer notified |
| Exceptions | Open → Assigned → Resolved / Paused |

At minimum, store: prospect/business identity, niche and brand snapshot, source URLs, audit findings and attachment, verified contact details, preview/version, review results, outreach and message history, permission evidence, opt-outs, assigned experiment variant, timestamps, purchase/subscription IDs, customer approvals, and next action.

Every transition should be logged. Apply duplicate prevention and safe retries to messages, charges, jobs, and publishing. Put a cap on revision/replacement loops and escalate rather than run indefinitely.

## 10. Prospecting and audit criteria

Focus on active, credible businesses with specific fixable website weaknesses rather than simply declaring a design unattractive.

Possible criteria:

- Mobile overflow, unreadable text, or difficult navigation.
- Missing or buried tap-to-call and quote/estimate actions.
- Broken or unusable forms/links.
- Unclear services or service areas.
- Inaccurate/outdated business information supported by verifiable evidence.
- Directions/location problems when a customer-facing location matters.

Use Google and approved search/business-data sources in accordance with provider access rules. Verify findings with page inspection and mobile checks. Capture evidence, source, and timestamp. Never invent lost revenue, conversion rates, rankings, or sales impact.

Final qualification thresholds, geography, data vendors, research limits, and initial campaign volume remain to be selected.

## 11. Website generation, review, and preview

Build a repeatable production system from polished niche designs and structured business information. Avoid generating unrelated bespoke code for every prospect unless a specific requirement justifies it.

Minimum review requirements:

- Correct business name, services, phone, and service area.
- Authorized logos/photos and approved assets; no fabricated reviews, projects, insurance, licenses, credentials, or customer claims.
- Clean mobile/desktop presentation, readable copy, and accessibility basics.
- Clear call/contact/estimate actions with expected behavior.
- No broken images, links, or confusing business identities.
- Appropriate page metadata and clear purchase action tied to the right prospect/version.
- Unapproved concept pages excluded from indexing and prevented from collecting real homeowner inquiries.

The reviewer returns Approved, Specific edits, or Replacement requested. Test functionality as well as model-based review. Keep versions and rollback.

Preview experience: hosted one-page scroll; works on mobile; clearly distinguish the prospect's illustrative website from our purchase controls; show $150/month, included service, and purchase button. Do not expose our SMS opt-in number as the roofer's public business number unless separately verified.

The preview is opened from SMS/email; do not depend on an interactive website scrolling inside an email. Screenshots/GIFs or an AI-narrated walkthrough are optional later experiments, not first-release dependencies.

Cost-per-preview and delivery speed are measured targets. “Pennies per site” is an aspiration for efficient generation, not an established all-in cost. Track research, assets, generation, hosting, failed builds, review, and support.

## 12. SMS handoff, conversation, and upsell

Start the permitted conversation promptly after opt-in. Record the actual consent scope, wording, timestamp, source, and recipient number. Configure provider registration, sender identification, opt-outs, and permission handling before launch. A scraped number or third party supplying another person's number is not equivalent to that person's permission.

Suggested initial message for later approval:

> Hi [First Name], this is [Brand]'s AI assistant. Thanks for requesting your website preview for [Company]. I'll send it here, and you can ask me questions about it. Reply STOP to unsubscribe.

Deliver the approved link immediately when available. If there is a real production issue, explain honestly; do not promise an untested completion time or manufacture a delay.

The AI should sound natural and helpful while being transparent about its identity. Keep answers grounded in approved pricing, scope, and business facts. Provide human escalation and stop conditions.

A suggested upsell explanation for later approval:

> The assistant you're texting is also available for your business. It can follow up with eligible missed callers, answer questions, and collect job details while you're working. That service is $200/month, separately.

Keep upselling relevant and within messaging permissions; do not overload the conversation or hold the preview hostage. Never repeat unsupported claims that everyone leaves after 60 seconds or that results will increase by a guaranteed amount.

## 13. Follow-up and case studies

| Response | Treatment |
|---|---|
| No reply | Limited approved email sequence; stop after the defined sequence rather than message indefinitely |
| Interested but not ready | Relevant permitted follow-up; record a requested future contact date where given |
| Not right now | Clarify whether and when follow-up would be welcome |
| Clear rejection | Close the sales sequence; do not automatically enroll in nurture |
| Stop / unsubscribe / consent withdrawal | Suppress the relevant marketing channel and honor broader stop requests |
| Purchase | Stop prospecting sequences and transition to customer service |

Case studies must be authentic, permissioned, and supported. Clearly attribute published third-party examples; do not imply their results are ours. Until our own results exist, use clearly labeled demonstrations and evidence-backed explanations of improvements.

## 14. Continuous strategy feedback loop

Track the full journey: qualified prospects → delivered email → positive reply → valid SMS opt-in → preview delivered → engaged conversation → checkout → purchase → retained customer.

Also measure: bounce/complaint/opt-out rates, cost per prospect, preview costs, build/review time, defects, recurring support time, service gross contribution, acquisition payback, refunds, cancellations, and retention.

Agent 003 should:

1. Identify a bottleneck and a testable hypothesis.
2. Propose a controlled targeting, hook, CTA, timing, or follow-up change.
3. Obtain approval for changes to locked copy, prices, promises, budgets, or channel permissions.
4. Run approved variants with recorded assignments and bounded spend.
5. Compare purchases and retention alongside opt-ins, not just opens or phone numbers.
6. Report uncertainty and avoid declaring a winner from tiny samples.
7. Feed supported improvements back into the approved workflow.

The locked email is the initial control. Do not silently rewrite it in the name of optimization.

## 15. Customer onboarding and domain connection

After purchase: create the correct customer and independent subscription, confirm content/contact information and inquiry destinations, collect launch approval, and connect the domain.

Use an authorized automated domain-connection integration where supported. The customer signs in and approves access; our system changes necessary website records. Keep the domain in the customer's account. Preserve email/unrelated DNS, retain old settings, handle root/www and HTTPS, and provide rollback.

Provide assisted setup for unsupported providers, missing login access, or prior designers controlling the domain. A registrar transfer is not a prerequisite. Never request passwords by email.

Review useful existing URLs and redirects before replacing a site. Verify the live site, phone links, forms, DNS, and HTTPS before confirming launch. Phone and marketing channel connections are separate onboarding steps for customers who buy those services.

## 16. Updates, support, billing, and cancellation

- Email and dashboard requests become tickets tied to the correct customer/site.
- Prepare changes, clarify ambiguity, check, publish within approved rules, and notify.
- Keep versions, audit history, and rollback.
- Monitor uptime, forms, certificates, jobs, and integration failures.
- Automate independent recurring billing, receipts, failed-payment handling, and cancellations under agreed policy.
- Respect customer-approved budgets and service permissions; require explicit purchase for a new subscription.
- Define what happens to hosting, content, data, phone numbers, and domain configuration when a service ends.

## 17. AI value promise and insights

**Confirmed principle for SMS and marketing:** “If you're not getting the value from it, you don't pay.” Both services need visible insights that show the value delivered.

| SMS value insights | Marketing value insights |
|---|---|
| Eligible missed callers contacted | Content created and published |
| Conversations started | Reach and engagement |
| Qualified inquiries captured | Website visits attributed to content/ads |
| Estimate requests | Attributable inquiries and conversions |
| Business-confirmed bookings | Ad spend and cost per tracked lead |
| Confirmed attributable outcomes | Business-confirmed bookings/revenue where available |

Distinguish activity from outcomes, and estimates from verified results. Missing data should appear as unknown, not invented zeroes or fabricated revenue.

Guarantee mechanics remain unresolved: introductory vs ongoing; request window; waived charge vs refund; scope of refund; cancellation handling; usage costs; and how “value” will be presented. Earlier 60-day language was discussed, not finalized. Do not publish a settled guarantee policy until approved.

## 18. Owner and customer interfaces

Owner workspace: niche/brand configuration; prospects and audits; outreach/replies; SMS conversations; build/review/ready queues; customers/subscriptions; updates; marketing activity; costs/revenue; experiments; exceptions; and pause/spend controls.

Customer workspace: their website/preview; approval; domain/service connections; update requests; conversations as appropriate; independent billing/cancellation; and purchased-service insights.

Show only functionality that actually works. Do not present demo data as real business performance or claim disconnected agents are operating. Tenant isolation and server-side authorization are required before customer use.

## 19. Integration categories — selection pending

| Need | Discussed option / requirement |
|---|---|
| Search/business discovery | Google-related discovery and permitted search/data sources; choose actual access method |
| Email outreach | Instantly discussed; select sending accounts, identity, authentication, and reply events |
| SMS/telephony | Choose provider, missed-call integration, consent flow, business registration, and messaging allowance |
| AI | Choose models/providers by task, quality, cost, and data requirements |
| Payments | Subscription provider with independent services and reliable billing events |
| Domain connection | Entri Connect or compatible Domain Connect integration considered; validate support and costs |
| Hosting/storage/queue | Choose an economical production platform with durable state, jobs, logs, and backups |
| Organic marketing | Authorized supported publishing and analytics connections |
| Paid ads | Authorized ad-account access and customer-set budgets |

No vendor subscriptions, accounts, or spend are authorized by this plan. Customer authorization, identity verification, and unsupported-provider exceptions remain real handoffs. A chat session alone is not continuous business infrastructure.

## 20. Roadmap and acceptance gates

All phases below are pending authorization and implementation; they are not claims of completion.

| Phase | Deliverable | Acceptance gate |
|---|---|---|
| 0 — Plan | Confirm requirements, unresolved terms, architecture, integrations, budget, and work boundaries | Micah approves implementation scope |
| 1 — Foundation | Shared records, niche configuration, owner permissions, queue/event model, logs | Switching niche preserves existing records; access and task safety verified |
| 2 — Research and production | Prospect discovery, evidence-based audit, repeatable builder, independent reviewer, approved previews | Prospect audit is accurate; preview fixes verified problems; review catches real defects |
| 3 — Outreach and SMS | Locked-template sending, attached audit, reply handling, permission capture, SMS delivery, questions, suppression | Full test prospect journey works; no email claims an unbuilt site; opt-outs stop sending |
| 4 — Purchase and launch | Checkout, independent subscription, customer approval, domain connection, launch checks | Authorized customer can purchase and launch; email settings preserved |
| 5 — Service operations | Update intake, revisions, approvals, publishing, billing, monitoring, cancellation | A real update and service cancellation complete reliably with history |
| 6 — AI SMS fulfillment | Customer phone connection, permitted missed-call response, approved knowledge, handoff, insights | Missed-call event produces correct eligible response and verified reporting |
| 7 — Marketing fulfillment | Research/content/publishing/ads workflows, budgets, integrations, analytics | Authorized activity runs within scope/budget and reports real outcomes |
| 8 — Optimization and scale | Controlled experiments, payback/retention reporting, increasing volume, additional niches | Measured economics and service capacity justify expansion |

Target a complete small pilot before thousands of emails per month. The pilot size, thresholds, timeline, and budget are not yet committed. Do not promise guaranteed sales or unattended resolution of every exception.

### 20.1 Growth governor (jumpstart approved; remaining numbers proposed)

- Jumpstart (APPROVED Nov 18, 2026): $150/month for email acquisition until 10 paying subscribers or 90 days. Operating costs (hosting, Instantly plan, Twilio, APIs) are tracked separately and count against total spend.
- After jumpstart: monthly acquisition spend <= 30% of trailing-30-day collected revenue.
- Acquisition spend covers cold email infrastructure and data, plus retargeting. Proposed split once retargeting is live: up to 70% cold email/data, up to 30% retargeting; the strategy agent may shift within the cap based on measured cost per customer.
- Retargeting channels: paid ads (Meta, Google) to roofers who opened a preview or the audit page (pixel on preview/opt-in pages, disclosed); free email follow-up within the approved sequence; SMS only to people with recorded consent. Each retargeting campaign has its own budget, frequency cap, and stop rules (purchase, opt-out, rejection).
- Scale-up gates (all required): cost to acquire a customer <= 3 months of its revenue; monthly cancellations < 8%; email bounce < 2% and spam complaints < 0.1%.
- If a gate fails, spend freezes at the current level and the owner is notified. Every automated purchase is logged.

## 21. Decisions still needed

- [ ] Brand name, domain strategy, first geography, and sender identity.
- [ ] Initial prospect criteria, data sources, volume, and research limits.
- [ ] Confirm build-before-email as the production gate for the locked email; resolve explicitly if a different timing is requested.
- [ ] Audit format, evidence standard, personalization fallback, and approved footer.
- [ ] Email provider/accounts and permitted sending ramp/limits.
- [ ] Provider-reviewed SMS opt-in, registration, permissions, number/phone compatibility, usage allowance, and stop rules.
- [ ] Website designs, launch scope, update turnaround, larger-work boundary, ownership/export, cancellation/handoff, and domain renewal policy.
- [ ] Marketing channels, publishing quantity, campaign scope, approval rules, and ad budget controls.
- [ ] Exact AI value-promise terms and supporting measurement.
- [ ] Owner/customer access, operational approvals, spend caps, escalation rules, backup/retention, and retry limits.
- [ ] Integration choices, actual costs, pilot budget, acceptance thresholds, and implementation authorization.

## 22. Document maintenance

This is the living master document. Update this same file rather than create competing plans. Retain its history. For each revision:

1. Read the current version.
2. Incorporate the latest explicit decisions into the relevant sections.
3. Preserve locked copy unless Micah explicitly approves a change.
4. Mark proposals and open questions clearly; do not turn assumptions into approved requirements.
5. Update the date/version and append a short change-log entry.
6. Keep implementation status accurate and separate from planned behavior.

External edits made in Claude do not automatically synchronize here. Bring the revised file or decisions back so the master can be updated.

## 23. Change log

| Date | Change |
|---|---|
| November 16, 2026 | Original roofing checklist created around the earlier $120 website offer. |
| November 18, 2026 | Approved $150/month email jumpstart budget; main brand domain rooflinewebsites.com approved. |
| November 18, 2026 | Confirmed niche-hopping growth model and 100k+/month email goal (5.1). |
| November 18, 2026 | Approved and locked the no-website email variant (6.1). Confirmed continuous outreach improvement through approved, controlled experiments measured on purchases and retention. Implementation authorized and under way; see STATUS.md. |
| November 17, 2026 | Consolidated subsequent decisions into this living plan: $150 website, $200 SMS, unified $500 marketing; niche-specific main-site switching; agent roles, audit/email/SMS/preview journey, review queues, value reporting, domain connection, customer operations, roadmap, and planning-only Claude handoff. Locked exact approved email and removed “Want to see it?”; made its prebuilt-preview requirement explicit. |

## Implementation references

References are starting points, not a substitute for checking current provider requirements during setup:

- Email requirements: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- Gmail sender guidelines: https://support.google.com/mail/answer/81126
- Messaging policy example: https://www.twilio.com/en-us/legal/messaging-policy
- Domain connection: https://www.entri.com/products/connect
- Domain Connect: https://www.domainconnect.org/
