# Issue tracker: GitHub Issues

Tickets for this repo live as GitHub issues in `KTelyuk/ai-for-developers-project-387`. The project has one spec, kept in git at `docs/spec.md` next to the code it describes. Use the `gh` CLI for all issue operations (from bash: `mise exec -- gh ...`, since `gh` is a mise tool).

## Conventions

- **Create an issue**: `gh issue create --title "..." --body-file <file> --label <triage-label>`. Bodies use `## Что сделать` and `## Критерии приёмки` (checkboxes); refer to other tickets by `#<number>` or by title.
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **List issues**: `gh issue list --state open --json number,title,labels --label <label>`.
- **Sub-issue**: `gh issue create --parent <parent> ...`, or `gh issue edit <parent> --add-sub-issue <child>`.
- **Blocking**: GitHub's native issue dependencies. `gh issue create --blocked-by <n>,<n> ...` or `gh issue edit <child> --add-blocked-by <blocker>`. A ticket is unblocked when every blocker is closed; count open blockers with `gh issue view <n> --json blockedBy --jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`.
- **Comment**: `gh issue comment <number> --body-file <file>`.
- **Labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`.
- **Close a ticket**: the implementing commit ends its subject with `(#<number>)`, and the PR body says `Closes #<number>`, so merging into `main` closes the issue. To close by hand, comment what was done with the commit hash, then `gh issue close <number> --reason completed`.

Issues and PRs share one number space, so a bare `#42` may be either: resolve with `gh issue view 42`, falling back to `gh pr view 42`.

## When a skill says "publish to the issue tracker"

A spec goes to `docs/spec.md`; a ticket is a new GitHub issue.

## When a skill says "fetch the relevant ticket"

Read it as in **Read an issue** above. The user normally passes the issue number (`#12` or `12`).

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: an issue labelled `wayfinder:map`, holding the Destination / Notes / Decisions-so-far / Not-yet-specified / Out-of-scope body.
- **Child ticket**: a sub-issue of the map with the question in the body, labelled `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`).
- **Blocking**: native dependencies, as in **Blocking** above.
- **Frontier query**: the map's open sub-issues (`gh issue view <map> --json subIssues`), dropping any with an open blocker or an assignee; first in map order wins.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n>` with the answer, then `gh issue close <n> --reason completed`, then append a context pointer (`[title](issue URL): gist`) to the map's Decisions so far with `gh issue edit <map> --body-file <file>`.
