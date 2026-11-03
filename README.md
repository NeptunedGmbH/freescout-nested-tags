# NestedTags

Early prototype. No release yet.

Nests custom folders the way Gmail nests labels. The sidebar shows the short folder name, indented. On a conversation the path reads `Personal/Onboarding`. A click opens only that label.

Tags and custom folders are left unchanged. The level lives in its own `folder_tree` table.

License: [MIT](LICENSE).

## Installation

This repository is the FreeScout module. It belongs in `Modules/NestedTags`. In this setup that is `/data/Modules/NestedTags`.

```bash
docker cp . freescout-app:/data/Modules/NestedTags
docker exec -w /www/html freescout-app php artisan module:enable NestedTags
docker exec -w /www/html freescout-app php artisan freescout:module-install nestedtags
```

`freescout:module-install` creates the public symlink and runs the migration.

## Rollback

Deactivate the module. The `folder_tree` table can stay. Folders that were already deleted together with their subfolders do not come back.

```bash
docker exec -w /www/html freescout-app php artisan module:disable nestedtags
```

## UpdateGuard

[UpdateGuard](https://github.com/00MY00/UpdateGuard) checks the module from the fields in `module.json`.

The read-only check is `nestedtags:health`:

```bash
php artisan nestedtags:health
php artisan nestedtags:health --json
```

Exit code 0 means healthy, exit code 1 does not. The command does not write, does not migrate, and does not open an outbound connection.

`version.txt` on `main` is the version line. There is no release yet, so there is no `NestedTags.zip` or `SHA256SUMS`. Automatic download through UpdateGuard waits for that. `scripts/sha256sums.sh` and `.github/workflows/sha256sums.yml` are in place and do not create a release themselves.

## UI

The browser code lives in `src/module.ts` and is built on the host into `Public/js/module.js`. The container has no Node.

```bash
npm install
npm run build
```
