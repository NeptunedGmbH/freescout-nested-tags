# 2. Hierarchie an Custom Folders in eigener Tabelle

Date: 2026-11-03

## Status

Superseded by [4. Verschachtelung klont Gmail-Labels](0004-verschachtelung-klont-gmail-labels.md)

Baut auf [1. Record architecture decisions](0001-record-architecture-decisions.md)

## Kontext

FreeScout-Tags sind global und der Name ist eindeutig. Custom Folders gehören zu einer Mailbox. Dieselbe Tag-Zeile, zum Beispiel `überfällig`, hängt in mehr als einer Mailbox. Custom Folders schreibt beim Speichern das Feld `folders.meta` komplett neu. Die Module Tags und Custom Folders werden vom Hersteller aktualisiert und liegen nicht in diesem Repo.

## Entscheidung

Die Verschachtelung ist eine Beziehung zwischen Custom Folders einer Mailbox. Sie liegt in der Tabelle `folder_tree` dieses Moduls (`folder_id`, `parent_folder_id`).

Verworfen:

- Eltern-Spalte an `tags`. Eine globale Hierarchie kann denselben Tag nicht in zwei Mailboxen verschieden hängen.
- Eltern-Id in `folders.meta`. Das nächste Speichern des Ordners in Custom Folders würde sie löschen.
- Den Schrägstrich in den Tag-Namen schreiben, wie Gmail es intern tut. Workflows, Suche und die API treffen den Tag über den bisherigen Namen. Ein umbenannter Name würde diese Treffer ändern.
- Die Hersteller-Module patchen. Ein Update überschreibt den Patch.

## Konsequenzen

- Die Hierarchie ist pro Mailbox, auch wenn der Tag global ist.
- Tag-Namen, Gesprächszuordnung und `folders.meta` bleiben Eigentum von Tags und Custom Folders.
- Dieses Modul kann deaktiviert werden, ohne Tags oder Ordnerinhalte zu verlieren.
