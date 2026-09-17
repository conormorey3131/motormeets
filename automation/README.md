# Motor Meets cloud automation

This work has two independently deployable parts. Neither needs the owner's laptop once deployed.

## Monday social packs

The GitHub workflow runs each Monday at 08:00 in Europe/Dublin (including daylight saving changes). It selects events overlapping the following Tuesday through Monday inclusive. GitHub's scheduler can be delayed; this is a target start time, not an exact delivery guarantee.

It builds 1080×1350 Meta graphics, 1080×1920 TikTok graphics, captions for each platform, a JSON editorial brief, and an offline download-page preview. Public downloads are published under the repository's Releases page. It does not post to social accounts.

Run locally with Python 3.12 and Pillow:

```
python automation/weekly.py --html index.html --monday 2026-09-21 --out pack
python automation/render.py --pack pack
python -m unittest discover -s automation -p 'test_*.py'
node --test automation/approvals/worker.test.mjs
```

GitHub secrets required only for WhatsApp delivery: `WA_TOKEN`, `WA_PHONE_ID`, `WA_RECIPIENT` (international digits), `WA_VERSION`, `WA_PACK_TEMPLATE`. The pack template must be approved by Meta in language `en`, with one body text parameter containing the release download URL. Suggested body: “Your Motor Meets weekly content pack is ready. Download graphics and captions: {{1}}”. Approval by Meta is not guaranteed.

The design is rendered independently using the Motor Meets logo and green/orange palette. It does not alter the Canva master. Website listings are the editorial source; organiser accuracy is not independently verified. Existing records missing valid ISO dates are reported in `events.json`; do not invent their dates. Overflowing text fails the render rather than clipping silently. Review unusually large packs before uploading to a platform's carousel limit.

## WhatsApp event approvals

The existing form actually uses Web3Forms. Connect its server-side webhook to the Worker while retaining the Titan email copy. Web3Forms requires a webhook-enabled paid plan; confirm the current plan before purchasing anything. If unavailable, choose a separate email-forwarding ingestion service as a follow-up; Titan inbox access is not implemented here.

1. Create or sign in to a Cloudflare account, create a D1 database, run `approvals/schema.sql`, and copy `wrangler.toml.example` to `wrangler.toml` with the real database ID. Deploy `worker.mjs` using Wrangler. Account creation, terms and any billing require the owner.
2. Create a Meta WhatsApp Business sender, register its number, and create a narrowly scoped production token. The owner's receiving number is separate and must be kept in secrets, never source code. No real number is committed here.
3. Create an approved utility template named `motormeets_event_review`, language `en`, with six body variables in order: event name, date, venue, description summary, listing/payment note, organiser URL. Two quick-reply buttons in order: Approve, Deny. Example body: “New Motor Meets submission: {{1}}. Date: {{2}}. Venue: {{3}}. Details: {{4}}. Listing: {{5}}. Organiser: {{6}}. Review the full submission email before approving.”
4. Configure Worker secrets `INTAKE_SECRET` (random 32 bytes or more), `WA_TOKEN`, `WA_PHONE_ID`, `WA_RECIPIENT`, `META_APP_SECRET`, `META_VERIFY_TOKEN`, `GITHUB_TOKEN`. Set `WA_VERSION` to the currently supported Graph API version. Give the GitHub token Contents write access to **only this repository**; do not reuse the interactive laptop token.
5. Register `https://WORKER_HOST/webhooks/whatsapp` in Meta and subscribe to messages. Verify with the configured `META_VERIFY_TOKEN`.
6. In the Web3Forms dashboard, set the webhook to `https://WORKER_HOST/intake/INTAKE_SECRET`. Keep the secret URL out of public form HTML and logs. Keep the current email delivery enabled.
7. Test an actual form submission, a denied event, an approved event, repeated delivery of the same request, an unauthorised reply, a temporary GitHub failure, and a website update made concurrently. Confirm the approved event is visible after GitHub Pages finishes deploying before treating the service as live.

The Worker validates inputs and Meta webhook signatures, checks the receiving account and authorised reviewer number, stores a durable queue, and publishes only after approval. Repeated decisions cannot change a completed decision. Unsent reviews and approved publications retry every five minutes. Identical normalised submissions are deduplicated. Contact name/email are not included in the public repository. GitHub conflicts are retried against the current file. Set up Cloudflare error alerts when deploying and inspect `last_error` in D1 for persistent failures. Transport failure after Meta accepts a notification can cause a duplicate notification; publication remains idempotent.

Approval inserts an ordinary calendar event in `index.html`, triggering the existing GitHub Pages deployment. Paid/featured status is **not** inferred from a form selection; Stripe payment verification is a separate integration. The legacy map has its own data and requires separate coordinates; this implementation does not invent a map pin or update that legacy map.

## Activation status

The included code and sample pack are not proof of live external integrations. The live form remains unchanged until the Worker, Meta sender and webhook have been configured and the full approval test passes. The GitHub schedule runs only after the workflow is on the default branch and Actions is enabled.

References: [Web3Forms webhooks](https://docs.web3forms.com/getting-started/pro-features/webhooks), [GitHub scheduling](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#onschedule), [Cloudflare D1](https://developers.cloudflare.com/d1/get-started/).
