# Design

## Context

Siehe proposal.md. Die Nachricht liefert das flache HTML der Ordnerleiste und, wenn das Lesen klappt, die Icons. Eltern und Geschwister stecken nicht im HTML. Der Client hat sie in `nodes`, nach einem Zug zusätzlich im schon umgebauten DOM. `replaceFolderList` vergleicht heute einen Stempel dieser flachen Liste. Ein Verschieben ändert die flache Reihenfolge, der Stempel weicht ab, und `#folders` wird per `innerHTML` ersetzt. `nestSidebar` hängt Kinder danach mit `appendChild` erneut an, auch wenn sie schon richtig liegen.

## Goals / Non-Goals

**Goals:**

- Ein Abgleich entscheidet vor jedem Schreibzugriff, ob der sichtbare Baum vom gewünschten Stand abweicht.
- Eine schon richtige Leiste bleibt unangetastet, auch wenn die flache Server-Reihenfolge eine andere ist.
- Eine echte Abweichung versetzt vorhandene `li`, statt sie zu ersetzen.

**Non-Goals:**

- Den Poll-Takt, die Nutzlast oder den Versand der Nachricht ändern.
- IconPicker, FreeScout, Custom Folders oder FolderDrop anfassen.
- Zähler, die sich ohne Ordnernachricht ändern, live nachziehen.

## Decisions

1. **Verglichen wird der sichtbare Baum, nicht die flache Liste.** Zum Stand gehören die Ordner-Ids, der Name, der Zähler im eigenen Link, `data-active-count`, die Eltern und die Geschwisterreihenfolge. Die oberste Ebene ist die Server-Reihenfolge ohne die Zeilen, die einen Elternordner haben. Der Stempel und `retitleFolderStamp` entfallen. Alternative: den Stempel nach dem lokalen Zug auf die neue flache Reihenfolge umschreiben. Verworfen, weil dieselbe flache Folge zwei verschiedene Bäume beschreiben kann und der Stempel genau deshalb beim Verschieben immer abweicht.

2. **Eltern kommen vom Baum, nach der Nachricht neu geladen.** Das HTML allein belegt ein Umhängen nicht. Vor dem Strukturvergleich lädt der Client den Baum einmal. Erst danach wird gezeichnet. Stimmen DOM und dieser Stand überein, endet der Abgleich ohne Schreibzugriff. Die eigene Verschiebe-Nachricht trifft einen schon gesetzten Baum und zeichnet nicht. Alternative: den Vergleich mit den lokalen `nodes` abkürzen und den Ajax sparen. Verworfen, weil ein fremdes Umhängen dieselbe flache Folge behalten kann. Die lokalen `nodes` wären dann alt, der Vergleich würde fälschlich passen, und die andere Leiste bliebe stehen. Ein Ajax pro Nachricht ist kein Zeichnen. Alternative: die Eltern in die Nachricht legen. Verworfen, weil der Baum-Ajax dieselben Daten schon liefert und die Nutzlast dafür nicht wachsen muss.

3. **Eine Funktion setzt Zeilen, und sie setzt nur, was abweicht.** `placeAt` verschiebt ein `li` nur, wenn der nächste Ordner-Nachbar an dieser Stelle ein anderer ist. Zeilen ohne `data-folder_id` bleiben. Der eigene Link behält sein `i`. Name, `no-active` und der Zähler werden nur bei Abweichung geschrieben. Fehlt ein Ordner, kommt das `li` aus dem geparsten HTML dazu. Ein überzähliger Ordner wird entfernt. Eine leere Kinderliste und ihr Pfeil fallen weg. `nestSidebar` und `placeTopLevel` benutzen dasselbe `placeAt`, damit ein zweites Zeichnen nach dem Dialog oder nach `paint` nichts mehr versetzt. Alternative: `innerHTML` behalten, wenn der Vergleich scheitert. Verworfen, weil das die Icons und den Einklapp-Zustand der unbeteiligten Zeilen abreißt.

4. **Der Dialog zeichnet den Zug nicht doppelt.** `applyFolderMove` setzt den Baum einmal. Der anschließende `loadTree` aktualisiert nur Pfade und Markierungen. Er ruft nicht mehr `paint` auf. Die spätere Nachricht läuft durch denselben Abgleich und findet keinen Unterschied.

5. **Icons, Zug und Chat bleiben davor.** Die Icon-Nachricht geht vor dem Abgleich raus. IconPicker entscheidet selbst, ob es malt. Ein laufender Ordner- oder Gesprächszug hält die Nutzlast zurück. Nach `dragend` läuft sie durch denselben Abgleich. `#folders.chats` wird nicht angefasst. Eine ältere Antwort, deren Baum-Ajax später zurückkommt, wird verworfen.

6. **Systemordner zieht der Abgleich nicht in den Block der eigenen Ordner.** Die Server-Sortierung stellt Systemordner vor die eigenen Ordner mit gesetzter Reihenfolge. Der lokale Zug sortiert nur innerhalb des bestehenden Blocks. Danach ist die oberste Ebene dieselbe wie die aus dem HTML abgeleitete, und der Abgleich versetzt sie nicht.

## Risks / Trade-offs

- [Jede Ordnernachricht lädt den Baum] → nur dann, nicht bei jedem Poll. Ohne Unterschied folgt kein DOM-Schreibzugriff.
- [Ein Zählerwechsel durch das Tag-Abgleichen sieht aus wie eine Inhaltsänderung] → es wird nur der Zähler der betroffenen Zeile gesetzt. Der Baum wird nicht versetzt.
- [Zwei Antworten überholen sich] → ein Zähler verwirft die ältere, noch offene Baum-Antwort.
- [Die erste Seite ist noch flach] → derselbe Ablauf zieht Kinder in die Listen. Das ist das erste Zeichnen, kein zweites.

## Migration Plan

TypeScript bauen, `Public/js/module.js` nach `/data/Modules/NestedTags/Public/js/module.js` kopieren, `chown nginx:www-data`, Cache als `nginx` leeren. Kein PHP. Rollback: die vorige `module.js` zurücklegen und den Cache leeren.

## Open Questions

Keine.
