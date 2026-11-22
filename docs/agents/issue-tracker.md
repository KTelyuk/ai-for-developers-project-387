# Issue tracker: GitHub Issues

Tickets for this repo live as GitHub issues in `KTelyuk/ai-for-developers-project-387`. `docs/spec.md` describes the whole service as built; a spec for a new change is a GitHub issue (see below), and its implementation brings `docs/spec.md` up to date. Use the `gh` CLI for all issue operations (locally from bash: `mise exec -- gh ...`, since `gh` is a mise tool; on a GitHub Actions runner `gh` is preinstalled and authenticated through `GH_TOKEN`, so call `gh ...` directly).

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

Both a spec and a ticket are new GitHub issues; the trail runs **request → spec → tickets**, each linked to the one before.

- **Request**: the incoming issue a person opened. It stays open while the spec and tickets are worked; never close or relabel it from a skill.
- **Spec**: a new issue titled `Спецификация: <тема>`, labelled `spec` and `ready-for-agent`, its body opening with `Исходное обращение: #<request>`. Then post a comment on the request linking the spec.
- **Tickets**: sub-issues of the spec (`--parent <spec>`), labelled `ready-for-agent`, with native blocking edges. `## Parent` names the spec.
- **Approval**: the person confirms the spec and ticket list in a comment on the request. A PR implementing the spec links that comment's URL; if behaviour or scope changes materially, ask on the request instead of deciding.

Labels `spec` and `ready-for-agent` mark issues the skills prepared, so automatic triage skips them.

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
