# Antigravity AI Assistant Workspace Rules

These project-scoped rules govern behavior, validations, and Git workflows for the Antigravity assistant in this workspace.

## 1. Codebase Architecture Reference
- **Static Recon Map**: Always reference [.agents/architecture.json](file:///e:/proxync/.agents/architecture.json) to understand the codebase modules, file structures, technologies, and ports without doing redundant full directory scans.

## 2. Git Commits, Pushing, and Changelog Guidelines
- **NO Automatic Commits**: Do NOT run `git commit` after editing files unless and until the user explicitly requests it. Once code is written and verified, stop and present the changes to the user for testing.
- **NO Automatic Pushing**: Do NOT push code to remote branches (e.g. `git push`) unless the user explicitly directs you to do so.
- **Structured Branching**: When the user asks you to commit, first create a dedicated local feature branch following the format: `feature/main-<feature-name>`. Commit only the relevant changes to this branch.
- **Changelog Updates**: Immediately when the user instructs you to commit changes, write a detailed changelog entry into [.agents/changelog.json](file:///e:/proxync/.agents/changelog.json) capturing the timestamp, branch name, modified files list, and feature summary BEFORE performing the git commit.

## 3. Dependency Tracking and Code Propagation
- **Propagate Dependent Edits**: When editing any file, trace and identify all of its dependents, consumers, or related files (imports, TS models, configuration defaults). Modify these related files in the same turn to prevent integration or runtime issues.

## 4. Strict Compile-Time Validations
- **Syntax and Compiler Checks**: Always validate your changes before finishing a turn. Run compiler checks (e.g. `npm run build` or `npx tsc --noEmit`) to verify that TSX/TS tags, imports, and syntaxes are free of compilation errors.
