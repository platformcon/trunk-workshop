# trunk-workshop

A small demo repo for the Trunk PlatformCon workshop covering
**Merge Queue** and **Flaky Tests**. It's a Next.js + TypeScript app with Vitest unit tests and
Playwright e2e tests. Both suites emit JUnit XML for Trunk to ingest, and each suite contains one
**intentionally flaky** test so the Flaky Tests dashboard has something real to detect and quarantine.

## App

- `app/` — Next.js App Router pages (`/` home, `/cart`).
- `lib/money.ts` — `formatCurrency(cents, currency)`.
- `lib/cart.ts` — `cartTotal(items)` reducer + `CartItem` type.

## Running tests

```bash
npm install

# Unit (Vitest) → writes test-results/unit-junit.xml
npm run test:unit

# E2E (Playwright) → writes test-results/e2e-junit.xml
npx playwright install --with-deps   # first time only
npm run build                        # e2e runs against the production server
npm run test:e2e
```

JUnit reports land in `test-results/`. The CI workflows clear that directory before each run so a
reused runner can't re-upload stale results (which would corrupt flake detection).

### Flaky tests (on purpose)

`tests/unit/flaky.test.ts` and `tests/e2e/flaky.spec.ts` each fail ~30% of the time via a random
roll. They are isolated and never affect real app behavior — they exist only to produce a flake
signal for the workshop. Playwright is configured with `retries: 0` so Trunk sees the true
pass/fail signal.

## Opening PRs (filling the queue)

`scripts/open-prs.ts` opens throwaway PRs against `main` to fill the Merge Queue. It uses the
[`gh` CLI](https://cli.github.com/), which must be installed and authenticated (`gh auth login`, or
a `GITHUB_TOKEN` / `GH_TOKEN` env var).

```bash
# Open 6 PRs (leave them for a manual `/trunk merge` in the demo)
npm run open-prs -- --count 6

# Open 3 PRs and post `/trunk merge` on each so they enter the queue automatically
npm run open-prs -- --count 3 --queue
```

Each PR branches off the latest `main`, makes a tiny safe change (a unique `playground/notes-*.md`
file), and gets a realistic conventional-commit title. Branch names are timestamped so reruns don't
collide.

## CI workflows

- `.github/workflows/unit-tests.yml` / `e2e-tests.yml` — run on push + PR, execute the suites with
  `continue-on-error: true` (so quarantine can keep CI green), then upload to Trunk via
  `trunk-io/analytics-uploader@v1`. The upload step is guarded by
  `if: ${{ !cancelled() && secrets.TRUNK_API_TOKEN != '' }}`, so it's green before setup and active
  once the secrets exist.
- `.github/workflows/generate-traffic.yml` — scheduled + manual; runs `open-prs --queue`. Gated on
  the `TRAFFIC_ENABLED` repo variable, so it's **off by default**.

See [`SETUP.md`](./SETUP.md) for the steps to wire up Trunk and reach the Final state.
