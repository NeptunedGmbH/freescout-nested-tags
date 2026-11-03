# Design

## Context

Siehe proposal.md. Tags 1.0.49 und Custom Folders sind installiert und werden von FreeScout-Updates überschrieben. Custom Folders speichert Name, Tag, Filter und Reihenfolge in `folders.meta` und ersetzt `meta` beim Speichern komplett. Die Query eines Custom Folders filtert auf genau eine `tag_id`. Die Seitenleiste ist ein flaches `<li data-folder_id>` in `mailboxes/partials/folders.blade.php`. `fsAjax` endet in `$.ajax` (`public/js/main.js`). Anlegen eines Ordners lädt die Seite im success-Callback neu, bevor ein globales `ajaxSuccess` liefe.

## Goals / Non-Goals

**Goals:**

- Die Spec `nested-folders` erfüllen, ohne Tags, Custom Folders oder den Core zu patchen.
- Die bisherige Ordner-Query, die Zähler und die Filter unverändert lassen.

**Non-Goals:**

- Eigener Ordnertyp, Nachfahren in der Elternliste, Workflow-Bedingung „Tag oder Unter-Tags“, API-Feld `parent`.
- Gmail-Einstellungen „Show“, „Hide“ und „Show if unread“, und ein Limit von 5.000 Labels. Die Sichtbarkeit bleibt „Nur anzeigen für“ von Custom Folders.
- Gespräche auf einen Ordner ziehen. Das ist ein eigenes Modul, Change `drop-on-custom-folders` im Repo `freescout-folder-drop`. Dieses Modul setzt keine Tags per Drag.
- Ebenen per Ziehen umsortieren. Die Ebene setzt das Feld „Unterordnen unter“, auch als vorausgewählter Wert beim Anlegen eines Unterlabels. Die bestehende Reihenfolge der Custom Folders bleibt die Geschwisterfolge.

## Decisions

0. **Browser-Code in TypeScript, Server in PHP.** FreeScout lädt Module als PHP und das Browser-Skript als Datei. Die Oberfläche liegt in TypeScript und wird vor dem Ausliefern nach `Public/js/module.js` übersetzt. Im Container gibt es kein Node. Der übersetzte Stand wird mit ausgeliefert. Alternativen: das Skript von Hand in JavaScript schreiben. Verworfen, weil beide Module dieselbe Oberfläche in TypeScript halten sollen. Die Typen enden an den globalen FreeScout-Funktionen (`$`, `fsAjax`, `laroute`). Dafür reicht eine kleine Deklaration.

1. **Eigenes Modul `NestedTags`, Alias `nestedtags`.** Quelle ist dieses Repo. Die laufende Kopie liegt unter `/data/Modules/NestedTags`, wie die anderen Module. Alternative: Patch in Custom Folders. Verworfen, weil das nächste Modul-Update den Patch löscht. Begründung: ADR 4.

2. **Tabelle `folder_tree`.** Spalten `folder_id` (Primärschlüssel) und `parent_folder_id` (nullable, Index). Keine Sortierspalte. Alternative: `parent_id` in `folders.meta`. Verworfen, weil Custom Folders `meta` beim Speichern neu setzt. Alternative: `parent_id` an `tags`. Verworfen, weil Tags global sind und `überfällig` in Mailbox 2 und 4 verschieden hängen darf. Begründung: ADR 4.

3. **Kein eigener Ordnertyp.** Die Seitenleiste ordnet die vorhandenen `<li>` nur um. Ein Klick bleibt der bisherige Ordner-Link. Alternative: Typ 210 mit eigener Query. Verworfen, weil die Custom-Folder-Query das Gmail-Klickverhalten schon hat und eine zweite Liste dieselben Tags doppelt zeigen würde. Begründung: ADR 4.

4. **Regeln serverseitig.** Eine reine Funktion prüft dieselbe Mailbox, Typ Custom Folder und keinen Zyklus, auch nicht über Nachfahren. Gmail nennt keine maximale Tiefe, deshalb gibt es keine Produktgrenze bei 4 Ebenen. Fehlt der Elternordner beim Anzeigen, gilt der Eintrag als oberste Ebene und die Zeile wird entfernt. Verschieben eines Ordners lässt seine Nachfahren an ihm hängen.

5. **Speichern über `$.ajaxPrefilter`.** Das Modul hängt `parent_folder_id` in die bestehenden Formulare. Der Prefilter erkennt den Ajax der Custom Folders, schreibt die Ebene nach erfolgreichem Anlegen oder Speichern (die Antwort enthält `id`) und ruft erst danach den ursprünglichen success-Callback auf. So überlebt das Anlegen den Reload. Löschen mit Nachfahren zeigt erst die Namen der Unterordner. Nach der Bestätigung löscht das Modul die Unterordner, nimmt die Tags der gelöschten Ordner von den Gesprächen dieser Mailbox und lässt den Custom-Folders-Callback den gewählten Ordner löschen. Gespräche bleiben. Ein Tag, den eine andere Mailbox noch an einem Ordner hat, bleibt als Datensatz. Alternative: Kinder eine Ebene hochziehen. Verworfen, weil Gmail die Unter-Labels mitlöscht und nur die Nachrichten behält. Alternative: nur globales `ajaxSuccess`. Verworfen, weil der Reload beim Anlegen vorher passiert.

6. **Pfad nur am Gespräch, kurzer Name in der Leiste.** Die Seitenleiste zeigt den Ordnernamen, den Custom Folders schon setzt, und rückt ihn nur ein. Am Gespräch wird der Pfad `Personal/Onboarding` aus den Ordnernamen gebaut. Die Tag-Auswahl zeigt denselben Baum mit eingerücktem eigenem Namen. `href` und der abgeschickte Wert bleiben der Tag-Name. Hängen mehrere Ordner am selben Tag, gibt es am Gespräch keinen Pfad. Ein umbenannter Elternordner ändert den angezeigten Pfad, weil er aus den aktuellen Ordnernamen entsteht.

7. **Aufklappen im Browser.** Schlüssel `nestedtags.collapse.<mailboxId>`, Wert die zugeklappten Ordner-IDs. Ohne Eintrag ist der Baum offen. Dark Mode nutzt `body.dm`.

8. **Recht.** Schreiben nur, wenn `CustomFolder::canUserUpdateMailboxCustomFolders($mailbox)` wahr ist. Lesen der Zuordnung für die Seitenleiste darf jeder, der die Mailbox sieht. Versteckte Ordner („Nur anzeigen für“) fehlen schon in der Ordnerliste. Ein sichtbares Kind ohne sichtbaren Elternordner bleibt auf der obersten Ebene.

9. **UpdateGuard vollständig.** `module.json` nennt `latestVersionUrl` (Inhalt von `version.txt`, eine Versionszeile), `latestVersionZipUrl` (`NestedTags.zip`), `sha256sumsUrl` und `healthCommand` `nestedtags:health`. Der Befehl ist nur lesend, hat `--json` und endet mit 0 oder 1. `interop.json` nennt FreeScout, PHP, Tags und Custom Folders als `required_dependency` und FolderDrop als `optional_integration`. `updateGuard.migrations` ist `backward-compatible`, weil die einzige Migration die neue Tabelle `folder_tree` anlegt und bestehende Tabellen nicht verändert. `scripts/sha256sums.sh` und der GitHub-Workflow schreiben `SHA256SUMS` im Format `<64 hex>  NestedTags.zip`. Der Health-Check läuft ohne veröffentlichte Release. Die Versions-URL antwortet erst, wenn das Repo und das Release existieren.

## Risks / Trade-offs

- [Custom Folders ändert Formular, Ajax-URL oder die Antwort ohne `id`] → der Prefilter prüft URL und `response.id` und lässt fremde Requests durch. Ein Update kann die Ebene beim Speichern verfehlen. Dann bleibt die letzte gültige Zeile stehen.
- [Tags 1.0.49 ändert das Markup `.tag-name`] → der Pfad fehlt, der Tag-Name bleibt lesbar, die Suche funktioniert weiter.
- [Seitenleiste wird nach dem ersten Paint per Ajax neu gebaut] → das Script hängt sich an dieselben `<li data-folder_id>` und läuft auch nach einem erneuten Einfügen der Liste.
- [Zwei Ordner, ein Tag] → kein Pfad, wie in der Spec. Die Seitenleiste zeigt beide Ordner trotzdem im Baum.

## Migration Plan

Modul nach `/data/Modules/NestedTags` legen, öffentlich verknüpfen, aktivieren, Migration laufen lassen. Bestehende Ordner haben keine Zeile und gelten als oberste Ebene. Rollback: Modul deaktivieren. Die Tabelle darf bleiben. Ordner, die mitsamt ihren Unterordnern schon gelöscht wurden, kommen dadurch nicht zurück. Tags und Gespräche, die nicht über dieses Löschen verändert wurden, bleiben.
