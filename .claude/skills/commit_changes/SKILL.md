---
name: commit_changes
description: Commit all working-tree changes onto a feature branch, push it, and open a PR against a base branch for manual review. Invoke as "run commit_changes <ssh-passphrase> <feature-branch> <base-branch>".
---

# commit_changes

Takes **three** arguments, in order:

1. `<ssh-passphrase>` — passphrase for `~/.ssh/id_ed25519` (used only to push).
2. `<feature-branch>` — the branch to commit onto and push (created if it doesn't exist).
3. `<base-branch>` — the PR target (normally `main`).

Result: a pushed feature branch + an open PR `<feature-branch> → <base-branch>`.
**Never pushes to the base branch directly.** The user reviews and merges the PR.

- Remote: `git@github.com:nage1234/book-an-appointment.git` (SSH for push).
- PR creation uses the **`gh`** CLI (its own auth). Prerequisite:
  `brew install gh && gh auth login`. If `gh` is missing or `gh auth status`
  fails, still do steps 1–6 (commit + push the branch), then stop at step 7 and
  tell the user to either set up `gh` or open the PR from GitHub's "Compare &
  pull request" prompt. Don't try to work around it with a raw API token.

## Security notes (say once, then proceed)

- The passphrase is on the command line — it can land in shell history / the
  process list. Longer term: a passphrase-less deploy key, or `ssh-add` once per
  session outside Claude.
- Never write the passphrase to a committed file, echo it, or put it in the
  commit/PR text. The askpass helper is made in a temp dir and deleted at once.

## Steps

1. **Check args.** All three are required. If `<feature-branch>` or
   `<base-branch>` is missing, stop and ask.

2. **Review** the working tree:
   ```
   git status --short && git diff --stat HEAD
   ```
   Nothing staged/unstaged/untracked → report "nothing to commit" and stop.

3. **Read the actual diff** (`git diff` / `git diff --cached`) enough to write an
   honest commit + PR summary. If anything looks like a secret (`.env`, keys,
   tokens) — even an innocuous filename — stop and ask.

4. **Switch to the feature branch** (carries the uncommitted changes across):
   ```
   git rev-parse --verify <feature-branch>   # exists?
   git checkout <feature-branch>             # if it exists
   git checkout -b <feature-branch>          # otherwise (from current HEAD)
   ```
   Run from a base branch that's synced with `origin/<base-branch>` so the PR
   diff is just the new work. If HEAD was ahead of `origin/<base-branch>` with
   unrelated commits, note that the PR will include them.

5. **Stage + commit:**
   ```
   git add -A
   git commit -m "<summary>" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
   ```

6. **Push the feature branch** — passphrase fed to `ssh-add` via a throwaway
   askpass helper, all in one Bash call so `SSH_PASS` never persists:
   ```bash
   PASS='<arg 1>'; FEATURE='<arg 2>'
   ASKPASS_DIR="$(mktemp -d)"
   printf '#!/bin/sh\nprintf "%%s\\n" "$SSH_PASS"\n' > "$ASKPASS_DIR/askpass.sh"
   chmod 700 "$ASKPASS_DIR/askpass.sh"
   eval "$(ssh-agent -s)"
   SSH_PASS="$PASS" DISPLAY=:0 SSH_ASKPASS="$ASKPASS_DIR/askpass.sh" SSH_ASKPASS_REQUIRE=force \
     ssh-add ~/.ssh/id_ed25519 < /dev/null
   git push -u origin "$FEATURE"
   push_status=$?
   ssh-agent -k
   rm -rf "$ASKPASS_DIR"
   exit $push_status
   ```

7. **Open the PR** (no SSH needed — `gh` uses its own token):
   ```bash
   gh pr create --base <base-branch> --head <feature-branch> \
     --title "<short title>" \
     --body "$(cat <<'EOF'
   ## Summary
   <1–3 bullets>

   ## Test plan
   <how it was checked>

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```
   If `gh` says a PR already exists for the branch, fetch and report its URL
   instead: `gh pr view <feature-branch> --json url -q .url`.

8. **Return to the base branch** so the next `commit_changes` starts clean:
   ```
   git checkout <base-branch>
   ```
   Tell the user: after they merge the PR, `git checkout <base-branch> && git pull`.

9. **Report:** the commit hash + message, the pushed branch, and the **PR URL**.

## On failure

- Wrong passphrase → `ssh-add` prints "Bad passphrase", the push fails with a
  permission error. Report it; don't retry.
- `git push` rejected (non-fast-forward on the feature branch) → report; do **not**
  force-push.
- `gh` not authenticated → stop, tell the user to `gh auth login`. The commit and
  branch push already succeeded, so they can also open the PR manually.
- Always run the `ssh-agent -k` + `rm -rf "$ASKPASS_DIR"` cleanup, even on failure.
