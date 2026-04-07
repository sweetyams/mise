---
inclusion: auto
description: Git branching strategy, commit conventions, and workflow rules for this project.
---

# Git Workflow

## Critical Rules

- Always work on feature branches — never push directly to `main`
- `main` auto-deploys to Vercel production
- Commit after each logical unit of work
- Push to remote regularly (at least every hour of active work)
- **NEVER run destructive git commands (checkout, restore, reset, stash) without first committing or stashing ALL uncommitted work.** Always run `git stash` or `git add . && git commit -m "wip: save before revert"` before any operation that could discard changes. This is non-negotiable.

## Branch Naming

```
feature/<feature-name>
fix/<bug-description>
refactor/<description>
kiro/<description>
```

## Commit Message Format

```
feat: add launch creation interface
fix: correct ingredient relationship mapping
refactor: extract validation to separate module
chore: update dependencies
wip: progress on batch tracking (use sparingly)
```

## Workflow

```bash
# Start work
git checkout -b feature/your-feature-name

# During work — commit incrementally
git add path/to/file
git commit -m "feat: description"
git push origin feature/your-feature-name

# End of session
git add .
git commit -m "wip: end of session"
git push origin feature/your-feature-name
```

## PR to Main

1. Push feature branch
2. Run `npm run build:check` locally — must pass (runs typecheck + lint + build)
3. Open PR on GitHub: feature branch → main
4. Merge only after build passes
5. Delete branch after merge
