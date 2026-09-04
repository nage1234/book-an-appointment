---
name: commit-changes
description: Stage, commit, and push all current changes straight to the main branch. Takes the SSH key passphrase as the single argument. Invoke as "/commit-changes <passphrase>".
---

# commit-changes

Commits everything in the working tree and pushes to `origin/main`.

- Remote: `git@github.com:nage1234/book-an-appointment.git` (SSH).
- SSH key: `~/.ssh/id_ed25519`. The argument to this skill is that key's **passphrase**.
- **Committing directly to `main` is intentional here** — the user asked for it
  "for now". Do not create a branch.

## Security notes (tell the user once, then proceed)

- The passphrase is passed on the command line — it can land in shell history and
  the process list. Prefer, longer term: a passphrase‑less deploy key, or
  `ssh-add` once per session outside Claude.
- Never write the passphrase into a file that gets committed, echo it into normal
  output, or put it in the commit message. The askpass helper below is created in
  a temp dir and deleted immediately.

## Steps

1. **Review** what will be committed:
   ```
   git status --short && git diff --stat HEAD
   ```
   If nothing is staged/unstaged and nothing untracked → report "nothing to commit" and stop.

2. **Look at the actual diff** (`git diff` / `git diff --cached`) enough to write
   an honest commit message. Do not commit files that look like secrets
   (`.env`, keys, tokens) — stop and ask if any appear.

3. **Stage** everything: `git add -A`

4. **Commit** with a concise message summarizing the change set:
   ```
   git commit -m "<summary>" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
   ```

5. **Push to main**, feeding the passphrase to `ssh-add` via a throwaway askpass
   helper (no passphrase on `ssh-add`'s own argv, no interactive prompt):
   ```bash
   PASS='<the skill argument>'
   ASKPASS_DIR="$(mktemp -d)"
   printf '#!/bin/sh\nprintf "%%s\\n" "$SSH_PASS"\n' > "$ASKPASS_DIR/askpass.sh"
   chmod 700 "$ASKPASS_DIR/askpass.sh"

   eval "$(ssh-agent -s)"
   SSH_PASS="$PASS" DISPLAY=:0 SSH_ASKPASS="$ASKPASS_DIR/askpass.sh" SSH_ASKPASS_REQUIRE=force \
     ssh-add ~/.ssh/id_ed25519 < /dev/null

   git push origin main
   push_status=$?

   ssh-agent -k
   rm -rf "$ASKPASS_DIR"
   exit $push_status
   ```
   Pass the real passphrase in place of `<the skill argument>` when running this;
   keep it inside a single Bash call so `SSH_PASS` never persists.

6. **Report**: the commit hash, the one‑line message, and `git push` result
   (branch, `main -> main`, commit range). If the push was rejected (non‑fast‑forward),
   say so and stop — do not force‑push.

## On failure

- Wrong passphrase → `ssh-add` prints "Bad passphrase"; the push then fails with
  a permission error. Report that the passphrase was rejected; don't retry.
- Always run the `ssh-agent -k` + `rm -rf "$ASKPASS_DIR"` cleanup even on failure.
