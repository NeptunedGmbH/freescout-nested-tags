# Proposal

## Why

Verschiebt jemand einen eigenen Ordner oder ändert sein Icon, sieht das nur der eigene Bildschirm. FreeScout veröffentlicht dafür nichts. Andere offene Seitenleisten bleiben stehen, bis die Seite neu aufgebaut wird.

## What Changes

- NestedTags veröffentlicht nach einer sichtbaren Änderung an den eigenen Ordnern einer Mailbox eine Nachricht über den bestehenden Polycast-Weg.
- Eine offene Ordnerleiste, die diese Mailbox zeigt, holt sich daraus die aktuelle Liste und zeichnet Verschachtelung, Aufklappen, Menü und Ziehen neu.
- Mit gemeint sind Umhängen, Umsortieren, Anlegen, Löschen, Umbenennen und das Icon. Eine reine Markierung an einem Gespräch löst die Nachricht nicht aus.
- Der Core von FreeScout wird nicht geändert. Der vorhandene Kanal für Gesprächslisten bleibt, wie er ist.

## Capabilities

### New Capabilities

- `folder-sidebar-refresh`: Offene Ordnerleisten derselben Mailbox zeigen nach einer Änderung an eigenen Ordnern dieselbe Liste, einschließlich Icon.

### Modified Capabilities

## Impact

- Modul NestedTags: Ereignis, Versand nach dem Speichern, Empfang in der Seitenleiste.
- Custom Folders bleibt der Speicher für Name und Icon. IconPicker bleibt das Auswahlfeld. Beide werden nicht gepatcht.
- FolderDrop bleibt die Markierung beim Ziehen eines Gesprächs. Seine Ablageziele müssen nach dem Ersetzen der Liste weiter gelten.
- Polycast pollt weiter alle 5 Sekunden. Es kommt kein neuer Socket dazu.
