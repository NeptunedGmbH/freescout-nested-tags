# Proposal

## Why

Ein bestehendes Postfach wird in FreeScout angebunden. Die Mails tragen Labels nach dem Gmail-Muster, und Gmail zeigt diese Labels als Ordner der Verbindung, die FreeScout schon hat. Daraus sollen die Custom Folders entstehen, mit derselben Hierarchie. Eine zweite Anmeldung bei Google ist nicht nötig und sieht die Mails nicht besser.

## What Changes

- Ein Befehl liest die Ordner der schon gespeicherten Postfach-Verbindung.
- Jeder Nutzer-Ordner wird ein Custom Folder. `Personal/Onboarding` wird Onboarding unter Personal. Der Tag ist der kurze Name.
- Posteingang und die Systemordner von Gmail werden übersprungen.
- Ein kurzer Name, den diese Mailbox schon als Ordner hat, wird wiederverwendet. Anzeigename und Icon bleiben.
- Ordner, die es nur in FreeScout gibt, bleiben. Andere Mailboxen bleiben. Es wird nichts ins Postfach zurückgeschrieben.
- Lässt sich die Ordnerliste nicht vollständig lesen, bleibt der Stand unverändert.

## Capabilities

### New Capabilities

- `folders-from-mailbox-labels`: Custom Folders und ihre Ebene entstehen aus den Ordnern einer Mailbox, die in FreeScout schon angebunden ist.

### Modified Capabilities

Keine. `nested-folders` und `folder-sidebar-refresh` bleiben. Neue Kanten laufen über den bestehenden Schreibweg.

## Impact

- Ein Artisan-Befehl in NestedTags. Er benutzt die vorhandene Abruf-Verbindung der Mailbox. Keine neue Berechtigung, keine Migration.
- Custom Folders und Tags bleiben ungepatcht.
- Gespräche werden nicht angefasst. Die neuen Ordner stehen, auch wenn noch kein Gespräch den Tag trägt.
- Die beiden heutigen Postfächer holen nur INBOX von einem Server, der nicht Gmail ist. Dort gibt der Befehl keine Label-Hierarchie her.
