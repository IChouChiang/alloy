# Branch Protection Baseline

Apply these settings to main in GitHub repository settings.

## Required settings
1. Require a pull request before merging
2. Require approvals: at least 1
3. Dismiss stale approvals when new commits are pushed
4. Require status checks to pass before merging
5. Required status checks:
   - Python tests (3.11)
   - UI build (Node 20)
6. Require conversation resolution before merging
7. Restrict who can push directly to main
8. Do not allow force pushes
9. Do not allow branch deletion
10. Enable auto-delete head branches after merge

## Merge strategy
- Default: Squash merge
- Rebase merge: only when commit-level history must be preserved
- Avoid merge commits for regular feature work

## Branch model
- Use short-lived branches:
  - feat/*
  - fix/*
  - refactor/*
  - chore/*
- Keep branches 1-3 days when possible
- For larger features, use stacked PRs instead of one long-lived branch
