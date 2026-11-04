# Proposal

## Why

Nach dem Verschieben eines eigenen Ordners steht der Baum im speichernden Tab schon. Die anschließende Polycast-Nachricht ersetzt `#folders` trotzdem komplett, weil der bisherige Vergleich die flache Server-Reihenfolge prüft. Die ändert sich bei jedem Umhängen und Umsortieren, auch wenn Name, Zähler, Eltern und Geschwister schon stimmen. Die Leiste zuckt ein zweites Mal.

## What Changes

- Vor jedem Zeichnen vergleicht die offene Leiste den sichtbaren Baum mit dem Stand aus der Nachricht. Ohne Unterschied gibt es keinen DOM-Schreibzugriff.
- Weichen nur Name oder Zähler ab, werden nur diese Texte gesetzt. Die Zeile bleibt.
- Weichen Eltern oder Reihenfolge ab, werden vorhandene Zeilen an die neue Stelle gesetzt. Neue Ordner kommen dazu, verschwundene fallen weg. Der Inhalt von `#folders` wird nicht ersetzt.
- Der Vergleich der flachen Server-Reihenfolge entfällt.
- Icon, aufgeklappter Zustand, der selbst geöffnete Ordner, der Knopf „Neuer Ordner“ und ein laufender Zug bleiben unangetastet.

## Capabilities

### New Capabilities

- Keine. `openspec/specs/` enthält noch keine Fähigkeiten. Die Änderung führt `folder-sidebar-refresh` aus dem noch nicht archivierten Change `live-folder-sidebar` fort.

### Modified Capabilities

- `folder-sidebar-refresh`: Die offene Leiste übernimmt Name, Zähler, Ebene und Reihenfolge durch einen Abgleich. Sie baut den Baum nicht neu, wenn dieser Stand schon sichtbar ist.

## Impact

- Nur `src/module.ts` in NestedTags. Kein PHP, keine Migration, kein Eingriff in FreeScout, Custom Folders, IconPicker oder FolderDrop.
- Andere offene Leisten derselben Mailbox sehen die Änderung weiter über dieselbe Nachricht.
- Der Poll-Takt bleibt.
