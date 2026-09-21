# Request usage and rate limiting

NavigationLink disables automatic route prefetching by default. Links still use client navigation and pending feedback; destinations load when clicked. Explicit prefetch overrides remain possible. School accounts/grading/completion views no longer fetch unrelated teacher assignments.

## Enable the Vercel firewall limit

The repository cannot activate firewall protection through an app deployment. The local Vercel login must be valid and the directory linked to the existing Deskonekt project. Never create a new project for this operation.

```sh
vercel login
vercel link
vercel firewall overview
bash scripts/stage-request-limit.sh
vercel firewall diff
vercel firewall publish
```

The script stages one rule, not a deployment or publication. Run it once; check for an existing rule with the same name first. Publishing applies ALL pending firewall changes, so review the diff for unrelated drafts before publishing. Check any platform pricing prompt before proceeding.

Alternatively, in the existing project's Firewall → Configure → Custom Rules, create a rate limit with the same OR path conditions in the script. Use a fixed 60-second window, 600 requests, IP key, and HTTP429 response.

The rule covers teacher, student, admin, login and auth paths, including server-action POST requests and route-data GET requests. It excludes framework static assets, images, and public landing pages. It is a starting ceiling for runaway dynamic requests, not a total bandwidth cap or a dedicated brute-force-login defense. No in-memory serverless counter or extra database request is used.

Many staff can share one school IP. Start at600/minute across the matching paths and monitor429s and allowed traffic; increase the threshold if normal school use hits it. Downloads, normal navigation and invitation batches count towards the bucket. A rate-limited action may need manual retry after the window resets: do not automatically retry account creation or email sending. A distributed attack across many IPs requires additional firewall controls.

Verify in Firewall traffic that the rule is active and inspect its rate-limited events. Test bursts only on an isolated test deployment/project, never against real school users. Compare function invocations and request counts before/after deployment of the prefetch change. Disable this specific rule and publish to roll back; there is no database migration.

References: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting and https://vercel.com/docs/cli/firewall

## Current activation status

Prepared locally, not activated. On2026-09-21 the CLI reported an invalid authentication token and an unlinked workspace. An authenticated project owner must complete the steps above. Application deployment alone does not enable this rule.
