# Tasks

## 1. Modulgerüst

- [x] 1.1 Modul `NestedTags` (Alias `nestedtags`) mit `module.json`, Provider, Route und Migration `folder_tree` (`folder_id` Primärschlüssel, `parent_folder_id` nullable mit Index) anlegen. Verify: `php -l` auf den neuen PHP-Dateien ist ohne Fehler, die Migration nennt beide Spalten.
- [x] 1.2 README beschreibt Installation nach `/data/Modules/NestedTags`, Aktivieren und den Rollback (Modul aus). Verify: die drei Schritte stehen im README.

## 2. Baumregeln

- [x] 2.1 Regeln für dieselbe Mailbox, nur Custom Folders, kein Selbstbezug und kein Zyklus über Nachfahren als reine Funktion implementieren. Keine Tiefengrenze. Verify: ein PHP-Test ohne Datenbank fällt bei Zyklus, Selbstbezug und fremder Mailbox durch, lässt eine gültige Kante zu und lässt eine fünfte Ebene zu.
- [x] 2.2 Speicherpfad legt an, ändert und entfernt die Zeile nur nach bestandener Regel und nur mit `CustomFolder::canUserUpdateMailboxCustomFolders`. Verschieben nimmt die Nachfahren mit. Löschen eines Ordners löscht die darunter liegenden Ordner, nimmt ihre Tags von den Gesprächen dieser Mailbox und lässt einen Tag stehen, den eine andere Mailbox noch an einem Ordner hat. Eine Zeile mit fehlendem Elternordner gilt beim Lesen als oberste Ebene und wird entfernt. Verify: der PHP-Test deckt Ablehnung ohne Recht, Mitziehen des Astes, Löschen der Nachfahren samt Tag-Ablösen und die fehlende Elternzeile ab.

## 3. Verwaltung und Seitenleiste

- [x] 3.1 Feld „Unterordnen unter“ in die Formulare der Custom Folders setzen, auch vorausgewählt beim Anlegen eines Unterlabels. Ein `$.ajaxPrefilter` speichert die Ebene nach erfolgreichem Anlegen oder Speichern, bevor der bisherige success-Callback (inklusive Reload) läuft. Löschen mit Unterordnern nennt deren Namen und entfernt sie erst nach der Bestätigung. Verify: im Script steht der Prefilter auf dem Custom-Folders-Ajax, die Rückfrage nennt die Unterordner, und der ursprüngliche Callback läuft erst nach der eigenen Antwort.
- [x] 3.2 Seitenleiste rückt sichtbare Custom Folders unter den sichtbaren Elternordner ein und lässt den eigenen Ordnernamen stehen. Zweige mit Kindern klappen auf und zu, der Zustand liegt unter `nestedtags.collapse.<mailboxId>`. Ohne Eintrag ist der Baum offen. Ein Kind ohne sichtbaren Elternordner bleibt oben. Dark Mode unter `body.dm`. Verify: das Script liest `data-folder_id`, schreibt den Ordnernamen nicht in einen Pfad um, schreibt denselben Schlüssel und die CSS-Datei enthält eine `body.dm`-Regel.

## 4. Tag-Pfad

- [x] 4.1 Pro Mailbox eine Map von Tag-Name auf Ordnerpfad mit `/` ausgeben. Mehrere Ordner am selben Tag ergeben keinen Pfad. Am Gespräch ersetzt das Script nur den sichtbaren Text. Die Tag-Auswahl zeigt den Baum mit eingerücktem eigenem Namen. `href` und abgeschickter Wert bleiben der Tag-Name. Verify: ein PHP-Test baut `Personal/Onboarding`, nach Umbenennung des Elternordners `Team/Onboarding`, und liefert bei zwei Ordnern mit demselben Tag keinen Pfad. Im Script wird der Select-Wert nicht umgeschrieben.

## 5. Laufende Instanz

- [x] 5.1 Modul in den Container `freescout-app` legen, öffentlich verknüpfen, aktivieren und die Migration ausführen. Verify: die Tabelle `folder_tree` existiert und das Modul ist aktiv. Die Module Tags und Custom Folders sind unverändert.

## 6. UpdateGuard

- [x] 6.1 `nestedtags:health` mit `--json`, `version.txt`, `interop.json`, `latestVersionUrl`, `latestVersionZipUrl`, `sha256sumsUrl` und `updateGuard.migrations` = `backward-compatible`. Verify: `php artisan nestedtags:health --json` endet mit 0 und `"status":"ok"`, und der Befehl schreibt nichts.

## Workflow follow-up

- Den Change nach dem Review mit `openspec archive` archivieren.
