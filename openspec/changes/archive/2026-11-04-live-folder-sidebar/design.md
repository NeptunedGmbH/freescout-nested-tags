# Design

## Context

Siehe proposal.md. Die Ordnerleiste ist das serverseitig gerenderte `#folders` (`mailboxes/partials/folders.blade.php`). Das Icon eines eigenen Ordners ist die Glyphicon-Klasse auf dem `li` und dem `i`. Name und Icon speichert Custom Folders. Die Ebene speichert NestedTags. Polycast ist der Broadcast-Treiber und pollt alle 5 Sekunden. `PolycastServiceProvider` ruft `processPayload` auf, wenn die Ereignisklasse das anbietet, und verwirft eine leere Antwort. `RealtimeConvList` hängt an `conv_list.{Ordner}` und liefert Gesprächszeilen, nur nach einem neuen Beitrag. FolderDrop hört Ziehen am `document` und sucht die Ziele bei jedem `dragover` neu.

## Goals / Non-Goals

**Goals:**

- Eine gespeicherte Änderung an eigenen Ordnern erreicht offene Leisten derselben Mailbox über Polycast.
- Die Liste wird beim Empfang für genau diesen Nutzer gerendert.
- Nach dem Ersetzen gelten Verschachtelung, Aufklappen, Menü, Ordnerziehen und Gespräch-Ablegen weiter.

**Non-Goals:**

- Den Poll-Takt oder den Kanal `conv_list` ändern.
- Die Gesprächsliste eines Ordners live nachziehen, wenn nur eine Markierung gesetzt wurde.
- FreeScout-Core, Custom Folders, IconPicker oder FolderDrop patchen.

## Decisions

1. **Neues Ereignis im Modul, nicht der Gesprächskanal.** NestedTags sendet ein `ShouldBroadcastNow` auf `nestedtags.folders.{mailboxId}`. Die Nutzlast speichert nur die Mailbox-Id. Alternative: `RealtimeConvList` mitschicken. Verworfen, weil der Kanal Gesprächszeilen eines Systemordners trägt und bei einem Icon nicht feuert.

2. **Rendern beim Empfang.** `processPayload` läuft im Poll des Empfängers. Es lädt die Ordner so, wie die Mailbox-Ansicht sie für `auth()->user()` lädt, und rendert `mailboxes/partials/folders`. Darf der Nutzer die Mailbox nicht sehen, ist die Antwort leer. Die aktive Zeile im HTML ist bedeutungslos. Alternative: das HTML schon beim Speichern einfrieren. Verworfen, weil dann „Nur anzeigen für“ und ein veraltetes Icon des Absenders beim Empfänger landen.

3. **Versand nur nach erfolgreichem Speichern.** `setParent` sendet nach dem Schreiben. Der bestehende Ajax-Haken auf Anlegen, Ändern und Löschen der Custom Folders sendet nach Erfolg. Ändern deckt Name und Icon ab, IconPicker schreibt das Icon in dasselbe Formular. Ein abgelehntes Umhängen und ein FolderDrop-Drop senden nicht. Alternative: bei jedem Zählerwechsel senden. Verworfen, weil die Spec eine reine Markierung ausnimmt.

4. **Der Client ersetzt nur die Zeilen.** Er merkt sich `data-folder_id` der markierten Zeile, ersetzt den Inhalt von `#folders`, setzt die Markierung wieder und lässt die bestehende Verschachtelung neu zeichnen. `#folders.chats` ignoriert er. Liegt ein Ordner- oder Gesprächszug, merkt er sich die Nachricht und ersetzt erst bei `dragend`. Der Knopf „Neuer Ordner“ steht außerhalb von `#folders` und bleibt. Alternative: die ganze Seitenleiste samt Zahnrad tauschen. Verworfen, weil die Spec die vorhandenen Knöpfe lässt.

5. **Kein Patch an FolderDrop.** Die Ablage hört am Dokument und bewertet die Zeile unter dem Zeiger neu. Nach dem Ersetzen gilt das nächste `dragover`. Ein laufender Zug wird nicht durch das Ersetzen zerrissen, siehe Entscheidung 4.

## Risks / Trade-offs

- [Bis zu 5 Sekunden Verzug] → der bestehende Poll bleibt. Kein zweiter Takt.
- [Zwei Nachrichten überholen sich] → beide rendern den aktuellen Stand, die spätere Antwort zeigt denselben Stand.
- [Die Teilvorlage braucht `$mailbox`, `$folders` und `$folder`] → `$folder` ist ein beliebiger sichtbarer Ordner nur fürs Rendern. Die Markierung setzt der Client.
- [Ersetzen mitten in der Verschachtelung] → NestedTags zeichnet den Baum aus den neuen Zeilen neu. Der Einklapp-Zustand bleibt im vorhandenen `localStorage`.

## Migration Plan

PHP und gebautes JS nach `/data/Modules/NestedTags` kopieren und `freescout:clear-cache` ausführen. Keine Migration. Rollback: die vorigen Moduldateien zurücklegen und den Cache leeren. Liegen gebliebene Polycast-Zeilen verfallen mit dem normalen Aufräumen von FreeScout.

## Open Questions

Keine.
