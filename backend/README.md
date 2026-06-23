# backend (merge-queue target)

This directory represents the **`backend`** target for the Trunk Merge Queue graph-mode demo.

A PR that changes anything under `backend/` is reported as impacting the `backend` target
(see [`scripts/upload-impacted-targets.sh`](../scripts/upload-impacted-targets.sh)). In graph mode,
PRs impacting disjoint targets (`frontend` vs `backend`) can merge in parallel; in linear mode they
merge one at a time. The `open-prs` script alternates PRs between this target and `frontend/` so the
graph has parallel lanes to show.

The `notes-*.md` files here are throwaway churn created by the PR-traffic script.
