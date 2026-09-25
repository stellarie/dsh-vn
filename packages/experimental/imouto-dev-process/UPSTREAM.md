# Import provenance

Imported from `stellarie/imouto-dev` revision `79a76eed37ce21f9406051b0bc46c53db931e3dd`.

- `tools/dsh-plugin.ts` and `tools/blackboard/**` supply maintained TypeScript sources.
- `canon/protocol.md` supplies `imouto-blackboard`.
- `canon/standards/**` supplies `imouto-standards`.
- `canon/imouto-plan.md` supplies the portable `imouto-plan`.

The repository owner authorized this import into `stellarie/dsh-vn`.

## Driver skill store

Imported verbatim from the imouto-driver global skill store at `.imouto/skills`, read at imouto-driver revision `92b88f11ab2af1c6fa9ec8699cb6bbd48470c8f2`. That store is runtime state outside version control, so it pins no revision of its own.

- `code-review`
- `codebase-analysis`
- `how-claude-thinks` with its 14 pages
- `kotlin-guidelines` with its 7 pages
- `prove-a-regression-test-catches-its-bug`, absorbed into `test-driven-development` on 2026-09-22
- `rust-guidelines` with its 10 pages
- `systematic-debugging`
- `test-driven-development`
- `verification-before-completion`
- `writing-ste100`

`imouto-dispatch` is excluded. It drives the Claude and Codex host dispatch commands, so it is not portable.

The repository owner authorized this import into `stellarie/dsh-vn`.

## Superpowers

Adapted from the Superpowers plugin, version 6.3.0, read from the Claude plugin cache under `.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0`.

- `brainstorming` supplies `brainstorming`.
- `writing-plans` supplies the plan quality bar in `executing-plans`.
- The pipeline order in `executing-plans` follows the source's chain.

The plugin is MIT licensed, copyright 2025 Jesse Vincent. Both skills are rewritten for the blackboard workflow and are not copies.

## Local repairs

- `imouto-plan` is derived, not copied. The dispatch command, private notes path, and fixed reviewer names are rewritten for the packaged catalog.
- The imported page bodies are unchanged. Some pages retain historical attribution lines that name private wiki paths.
