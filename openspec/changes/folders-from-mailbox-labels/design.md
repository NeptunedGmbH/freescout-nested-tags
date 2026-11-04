# Design

## Context

Siehe proposal.md. FreeScout speichert die Abruf-Verbindung an der Mailbox. `MailHelper::getMailboxClient` öffnet genau diese Verbindung. Gmail legt jedes Label als IMAP-Ordner ab. Die Ebene steckt im Pfad, getrennt durch das Trennzeichen des Servers, bei Gmail `/`. `Personal/Onboarding` ist ein Ordnername, keine Eltern-ID. `[Gmail]` und seine Kinder sind Systemordner. Die Ebene in FreeScout schreibt `FolderTree::setParent`.

## Goals / Non-Goals

**Goals:**

- Die Ordnerliste kommt vollständig an, bevor etwas geschrieben wird.
- Neue Ordner haben dieselbe Meta-Form wie ein von Hand angelegter Custom Folder. Der Zähler zählt aktive Gespräche.
- Die Elternkante läuft über `setParent`.

**Non-Goals:**

- Keine zweite Anmeldung, kein Schreiben ins Postfach, keine Tags an Gesprächen, keine neuen Gespräche. Der normale Abruf bleibt auf dem, was an der Mailbox eingestellt ist.

## Decisions

1. **Die gespeicherte Verbindung listet die Ordner.** `getFolders` liefert `full_name` und `delimiter`. Systemordner fallen über den Namen (`INBOX`, Präfix `[Gmail]`) und über die besonderen IMAP-Attribute für Gesendet, Entwürfe, Spam, Papierkorb und Alle. Alternative: eine Gmail-API mit eigenem Token. Verworfen, weil die Mailbox schon angebunden ist.

2. **Der Pfad wird am Trennzeichen zerlegt, Eltern zuerst.** Das letzte Segment ist der kurze Tag. Trifft es einen Ordner dieser Mailbox, bleiben Anzeigename und Icon. Sonst entstehen Tag und Ordner, dann `setParent`. Der ganze Pfad wird kein Tag-Name.

3. **Custom Folders und Tags bleiben ungepatcht.** Der Befehl schreibt die Zeilen, die diese Module schon lesen. Kein HTTP gegen den Ordner-Dialog.

## Risks / Trade-offs

- [Ein Server, der nicht Gmail ist, hat keine Label-Ordner] → die Liste enthält dann nichts außer dem Posteingang, der Befehl legt nichts an. Die beiden heutigen Postfächer sind so ein Fall.
- [Ein Segment trifft einen Ordner nur wegen der Großschreibung] → die gespeicherte Schreibweise bleibt, es entsteht kein zweiter Ordner.
- [Die neuen Ordner sind leer, bis ein Gespräch den Tag trägt] → dieser Change setzt keine Tags an Gespräche. Die Hierarchie steht trotzdem.

## Migration Plan

`nestedtags:folders-from-mailbox` mit der Mailbox-ID. Ohne vollständige Ordnerliste endet er vor dem ersten Schreibzugriff. Zurücknehmen heißt die angelegten Ordner in FreeScout von Hand löschen. Das Postfach bleibt unberührt.

## Open Questions

Keine.
