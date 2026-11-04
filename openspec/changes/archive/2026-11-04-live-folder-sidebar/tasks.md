# Tasks

## 1. Ereignis

- [x] 1.1 Ereignisklasse im Modul NestedTags, `ShouldBroadcastNow`, Kanal `nestedtags.folders.{mailboxId}`, Nutzlast nur die Mailbox-Id. `processPayload` rendert `mailboxes/partials/folders` für `auth()->user()` und gibt bei fehlendem Mailbox-Zugriff ein leeres Array zurück. Die markierte Zeile im HTML ist nicht maßgeblich. Verify: `php -l` auf der neuen Klasse ist ohne Fehler, und ein Aufruf von `processPayload` ohne Recht liefert ein leeres Array, ohne die Teilvorlage zu rendern.

## 2. Versand

- [x] 2.1 Nach einem erfolgreichen `setParent` das Ereignis für diese Mailbox senden. Ein abgelehntes Umhängen sendet nicht. Nach erfolgreichem Anlegen, Ändern und Löschen über den bestehenden Custom-Folders-Ajax dasselbe Ereignis senden. Ein FolderDrop-Drop sendet nicht. Verify: die Aufrufe stehen nach dem Schreiben und nicht im Ablehnungszweig, und die Ajax-Erfolge für create, update und delete rufen denselben Versand auf.

## 3. Empfang

- [x] 3.1 Wenn Polycast steht und die Seite eine Mailbox-Ordnerleiste hat, den Kanal abonnieren. `#folders.chats` ignorieren. Vor dem Ersetzen die `data-folder_id` der markierten Zeile merken, den Inhalt von `#folders` ersetzen, die Markierung wieder setzen und die bestehende Verschachtelung neu zeichnen. Während eines Ordner- oder Gesprächszugs das Ersetzen bis `dragend` aufschieben. „Neuer Ordner“ bleibt außerhalb von `#folders`. Verify: `npm run build` erzeugt `Public/js/module.js`, darin stehen der Kanalname, die Prüfung auf `chats` und das Aufschieben bis `dragend`.

## 4. Auslieferung

- [x] 4.1 Geänderte PHP und gebautes JS nach `/data/Modules/NestedTags` kopieren und `php artisan freescout:clear-cache` ausführen. Verify: die Prüfsummen der geänderten Dateien im Container `freescout-app` stimmen mit dem Repo überein, und der Cache-Befehl endet mit Code 0.

## Workflow follow-up

- Den Change nach dem Review mit `openspec archive` archivieren.
