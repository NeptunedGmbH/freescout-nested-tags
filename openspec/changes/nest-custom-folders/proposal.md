# Proposal

## Why

In einer Mailbox liegen 22 Custom Folders nebeneinander (Recruiting, Onboarding, Lohnbuchhaltung, Sister Act und weitere). FreeScout kann diese Ordner nicht schachteln. Tags und Custom Folders bleiben flach, und es gibt kein Modul dafür. Wer Gmail kennt, erwartet Labels, die in der Seitenleiste untereinander hängen.

## What Changes

- Custom Folders einer Mailbox lassen sich wie Gmail-Labels unter einem schon vorhandenen Ordner anlegen, dorthin verschieben und wieder herausnehmen. Der ganze Ast zieht mit.
- Die Seitenleiste zeigt den eigenen Ordnernamen, eingerückt und klappbar. Ein Klick öffnet nur dieses Label. Die Zahl am Ordner zählt nicht die Kinder mit.
- Ein Unter-Tag setzt weder den Eltern-Tag noch die Unter-Tags. Workflows, Suche und API treffen weiter den kurzen Tag-Namen.
- Am Gespräch steht der Pfad `Personal/Onboarding`. Die Tag-Auswahl zeigt denselben Baum. Gespeichert bleibt der kurze Name.
- Löschen eines Ordners löscht die darunter liegenden Ordner mit, nimmt deren Tags von den Gesprächen dieser Mailbox und lässt die Gespräche bestehen. Die Rückfrage nennt die Unterordner vorher.
- Bestehende Ordner starten oben. Die Hersteller-Module und der Core werden nicht verändert.

## Capabilities

### New Capabilities

- `nested-folders`: Gmail-gleiche Verschachtelung der Custom Folders einer Mailbox. Die Ebene ist Anzeige. Löschen eines Elternordners entfernt die Unterordner und ihre Tags von den Gesprächen dieser Mailbox.

### Modified Capabilities

## Impact

- Neues FreeScout-Modul `NestedTags` neben den installierten Modulen Tags 1.0.49 und Custom Folders.
- Neue Tabelle `folder_tree`. Keine Spalte an `tags` oder `folders`, kein Schreibzugriff auf `folders.meta`.
- Seitenleiste der Mailbox und die Verwaltungsseite der Custom Folders. Die Tag-Auswahl von Tags 1.0.49 zeigt den Pfad.
- Zwei Mailboxen können denselben Tag verschieden einhängen. `überfällig` ist so ein geteilter Tag.
- Gespräche auf einen Ordner ziehen gehört nicht hierher. Dafür gibt es das Modul im Repo `freescout-folder-drop`.
