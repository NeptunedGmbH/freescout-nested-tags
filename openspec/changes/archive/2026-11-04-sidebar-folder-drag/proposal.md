# Proposal

## Why

Ordner lassen sich nur in der Ordnerverwaltung umhängen. Wer das Postfach offen hat und Ordner bearbeiten darf, soll denselben Baum in der Seitenleiste ziehen können. Wird ein Unterordner dabei zum Hauptordner, dürfen die Gespräche den Tag des alten Hauptordners nicht behalten.

## What Changes

- Berechtigte Personen ziehen einen eigenen Ordner in der Seitenleiste auf einen anderen eigenen Ordner, zwischen Geschwister oder auf die oberste Ebene. Systemordner bleiben fest.
- Der gezogene Ordner nimmt seine Unterordner mit. Ein Zyklus, eine fremde Mailbox oder ein fehlendes Recht ändert nichts.
- **BREAKING** gegenüber dem Change `nest-custom-folders`: Herausnehmen aus der Verschachtelung lässt die Tags der alten Hauptordner nicht mehr stehen. Gespräche im verschobenen Ast verlieren den Tag jedes Hauptordners, der danach nicht mehr darüber liegt, und bekommen den Tag jedes neuen Hauptordners. Gespräche außerhalb des Astes behalten ihre Tags.
- Dieselbe Tag-Regel gilt für jedes Umhängen, auch über das Feld „Unterordnen unter“ und das Ziehen in der Ordnerverwaltung. Zwei Wege dürfen nicht zwei Ergebnisse haben.

## Capabilities

### New Capabilities

- `nested-folders`: Ziehen in der Seitenleiste, neue Geschwisterfolge und der Tag-Abgleich beim Umhängen. Die Fähigkeit liegt noch nicht unter `openspec/specs/`, sondern im offenen Change `nest-custom-folders`. Dieser Change ergänzt sie.

### Modified Capabilities

- Keine. Unter `openspec/specs/` gibt es noch keine Requirement.

## Impact

- Modul NestedTags: Seitenleiste, `folder_tree`, Tag-Abgleich, die bestehende Sortierung der Custom Folders (`meta.order`).
- Der Satz in `nest-custom-folders`, der das Entfernen der Hauptordner-Tags verbietet, wird in diesem Zug angepasst, damit die beiden Changes sich nicht widersprechen.
- FolderDrop bleibt das Ziehen von Gesprächen. Ein Ordner-Zug darf kein Gespräch ablegen, ein Gespräch-Zug darf keinen Ordner umhängen.
- Tags, Custom Folders und der Core bleiben ungepatcht. Kein neues Datenbankschema, solange die Geschwisterfolge über `meta.order` ausdrückbar ist.
