/**
 * open-prs.ts — open N throwaway PRs against `main` to fill the Trunk Merge Queue.
 *
 * Used live in the workshop to fill the queue, and reused by the scheduled
 * `generate-traffic.yml` workflow to keep the queue + flake history alive.
 *
 * Transport: the `gh` CLI (must be installed and authenticated). It picks up
 * auth from `gh auth login` or a `GITHUB_TOKEN` / `GH_TOKEN` env var.
 *
 * Required env:
 *   - gh auth (via `gh auth login`) OR `GITHUB_TOKEN` / `GH_TOKEN`
 *   - `GITHUB_REPOSITORY` (owner/repo) — optional locally (gh infers it from the
 *     git remote), but set automatically in GitHub Actions.
 *
 * Usage:
 *   npm run open-prs -- --count 6           # open 6 PRs, leave them for manual /trunk merge
 *   npm run open-prs -- --count 3 --queue   # open 3 PRs and post `/trunk merge` on each
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";

interface Options {
  count: number;
  queue: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { count: 3, queue: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--count") {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`--count must be a positive integer, got: ${argv[i]}`);
      }
      opts.count = value;
    } else if (arg === "--queue") {
      opts.queue = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function run(cmd: string, args: string[]): string {
  // Capture stderr instead of inheriting it, so git's chatty output (remote PR-create
  // hints, "Switched to a new branch", fetch summaries) stays out of the script's
  // output. It's still attached to the thrown error if a command fails.
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

// Realistic-looking conventional-commit prefixes, cycled across PRs.
const TITLES = [
  "fix: correct rounding in cart total display",
  "feat: add quantity badge to cart link",
  "chore: tidy up store copy",
  "fix: guard against empty cart render",
  "feat: surface item subtotals on cart page",
  "chore: bump demo catalog prices",
];

function main(): void {
  const opts = parseArgs(process.argv.slice(2));

  // Branch off the freshest main.
  run("git", ["fetch", "origin", "main"]);

  // A single timestamp seed keeps branch names unique across reruns without
  // relying on per-iteration clock reads.
  const seed = Date.now();

  for (let i = 0; i < opts.count; i++) {
    const branch = `workshop/${seed}-${i}`;
    // Alternate the impacted target so graph mode has disjoint PRs to merge in
    // parallel (frontend PRs vs backend PRs form two independent lanes).
    const target = i % 2 === 0 ? "frontend" : "backend";
    const title = `${TITLES[i % TITLES.length]} (${target})`;

    run("git", ["checkout", "-B", branch, "origin/main"]);

    // Tiny, safe, conflict-free change scoped to one target dir, so CI can compute
    // the PR's impacted target from its changed files.
    mkdirSync(target, { recursive: true });
    const notePath = `${target}/notes-${seed}-${i}.md`;
    writeFileSync(notePath, `# ${target} change\n\nGenerated PR ${i + 1} — impacts the \`${target}\` target.\n`);

    run("git", ["add", notePath]);
    run("git", ["commit", "-m", title]);
    run("git", ["push", "-u", "origin", branch, "--force"]);

    const url = run("gh", [
      "pr",
      "create",
      "--base",
      "main",
      "--head",
      branch,
      "--title",
      title,
      "--body",
      "Automated workshop traffic PR. Safe to merge or close.",
    ]);
    console.log(`Opened PR: ${url}`);

    if (opts.queue) {
      run("gh", ["pr", "comment", url, "--body", "/trunk merge"]);
      console.log(`  → queued via /trunk merge`);
    }
  }

  // Return to main so the working tree is left in a sane state.
  run("git", ["checkout", "main"]);
  console.log(`Done: opened ${opts.count} PR(s)${opts.queue ? " and queued them" : ""}.`);
}

main();
