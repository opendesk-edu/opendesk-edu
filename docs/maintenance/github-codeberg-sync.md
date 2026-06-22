# GitHub ↔ Codeberg Sync

This repository is mirrored on both platforms, but sync is **manual** (run on demand).

| Platform | URL |
|----------|-----|
| GitHub | https://github.com/opendesk-edu/opendesk-edu |
| Codeberg | https://codeberg.org/opendesk-edu/opendesk-edu |

## Syncing GitHub → Codeberg

```bash
git checkout main
git pull github main
git push --force codeberg main
```

This pushes the current `main` branch (and all commits) to Codeberg, overwriting the remote history.

## Syncing Codeberg → GitHub

The Codeberg CI has a workflow (`.forgejo/workflows/github-sync.yml`) that mirrors to GitHub on push. If it fails or you need an immediate sync:

```bash
git checkout main
git pull codeberg main
git push --force github main
```

## Prerequisites

- Access to both remotes configured:
  ```bash
  git remote add github git@github.com:opendesk-edu/opendesk-edu.git
  git remote add codeberg git@codeberg.org:opendesk-edu/opendesk-edu.git
  ```
- SSH keys or tokens set up for both platforms
