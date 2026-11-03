# 4. Verschachtelung klont Gmail-Labels

Date: 2026-11-03

## Status

Accepted

Löst [2. Hierarchie an Custom Folders in eigener Tabelle](0002-hierarchie-an-custom-folders-in-eigener-tabelle.md) ab

Löst [3. Kein eigener Ordnertyp](0003-kein-eigener-ordner-typ.md) ab

Baut auf [1. Record architecture decisions](0001-record-architecture-decisions.md)

## Kontext

Die Ordner in der Mailbox sollen sich so anfühlen wie Labels in Gmail, weil die Leute Gmail kennen. Zur Wahl stand ein stärkeres Modell: ein Klick auf den Elternordner zeigt auch die Gespräche der Unterordner, und ein Unter-Tag setzt den Eltern-Tag mit. Das ist nicht das, was Gmail tut. Gmail verschachtelt nur die Anzeige.

## Entscheidung

Die Verschachtelung ist ein 1:1-Klon der Gmail-Labels, so wie Nutzer sie bedienen.

Verworfen:

- Eltern-Klick zeigt die Gespräche der Unter-Tags.
- Ein Unter-Tag setzt den Eltern-Tag.
- Den Pfad in den gespeicherten Tag-Namen schreiben. Gmail speichert `Personal/Onboarding` als einen Namen. Bei uns bleibt der kurze Tag-Name der Schlüssel für Workflows, Suche und API. Der Pfad ist nur die Anzeige.

Was die Oberfläche daraus macht, steht in der OpenSpec `nested-folders`.

## Konsequenzen

- Es gibt keinen eigenen Ordnertyp. Link, Query und Zähler bleiben die des Custom Folders, weil der Klick bei Gmail nur das Label selbst öffnet.
- Die Beziehung liegt in `folder_tree` dieses Moduls, nicht an `tags` und nicht in `folders.meta`. Tags sind global, Ordner gehören zu einer Mailbox, und Custom Folders überschreibt `meta` beim Speichern.
- Die Hersteller-Module Tags und Custom Folders bleiben unangetastet.
