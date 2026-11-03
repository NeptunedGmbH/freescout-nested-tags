# NestedTags

Früher Prototyp. Noch kein Release.

Verschachtelt Custom Folders so, wie Gmail Labels verschachtelt. Die Seitenleiste zeigt den kurzen Ordnernamen eingerückt. Am Gespräch steht der Pfad `Personal/Onboarding`. Ein Klick öffnet nur dieses Label.

Tags und Custom Folders werden nicht verändert. Die Ebene liegt in der eigenen Tabelle `folder_tree`.

Lizenz: [MIT](LICENSE).

## Installation

Das Repository ist das FreeScout-Modul. Es kommt nach `Modules/NestedTags`. In diesem Setup ist das `/data/Modules/NestedTags`.

```bash
docker cp . freescout-app:/data/Modules/NestedTags
docker exec -w /www/html freescout-app php artisan module:enable NestedTags
docker exec -w /www/html freescout-app php artisan freescout:module-install nestedtags
```

`freescout:module-install` legt die öffentliche Verknüpfung und führt die Migration aus.

## Rollback

Modul deaktivieren. Die Tabelle `folder_tree` darf bleiben. Ordner, die mitsamt ihren Unterordnern schon gelöscht wurden, kommen dadurch nicht zurück.

```bash
docker exec -w /www/html freescout-app php artisan module:disable nestedtags
```

## UpdateGuard

[UpdateGuard](https://github.com/00MY00/UpdateGuard) prüft das Modul über die Angaben in `module.json`.

Die nur lesende Prüfung ist `nestedtags:health`:

```bash
php artisan nestedtags:health
php artisan nestedtags:health --json
```

Exit-Code 0 bedeutet gesund, Exit-Code 1 nicht. Der Befehl schreibt nicht, migriert nicht und baut keine Verbindung nach außen auf.

`version.txt` auf `main` ist die Versionszeile. Ein Release und damit `NestedTags.zip` plus `SHA256SUMS` gibt es noch nicht. Der automatische Download über UpdateGuard wartet darauf. `scripts/sha256sums.sh` und `.github/workflows/sha256sums.yml` sind vorbereitet und legen selbst kein Release an.

## Oberfläche

Der Browser-Code liegt in `src/module.ts` und wird auf dem Host nach `Public/js/module.js` übersetzt. Im Container gibt es kein Node.

```bash
npm install
npm run build
```
