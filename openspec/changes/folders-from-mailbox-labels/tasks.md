# Tasks

## 1. Pfad der Mailbox-Ordner

- [x] 1.1 Eine reine Funktion macht aus Ordnernamen, Trennzeichen und Systemmarken die Elternketten. `Personal/Onboarding` wird Onboarding unter Personal. Posteingang und `[Gmail]/Sent Mail` fallen weg. Verify: `php tests/tree_rules_test.php` deckt diese drei Fälle ab.

## 2. Befehl

- [x] 2.1 `nestedtags:folders-from-mailbox` öffnet die gespeicherte Verbindung der Mailbox, liest die Ordnerliste vollständig und legt fehlende Segmente in der bekannten Meta-Form an. Kanten gehen über `setParent`. Eine unvollständige Liste schreibt nichts. Verify: ein Test mit einer festen Ordnerliste legt keine zweite Zeile an, wenn der kurze Tag schon einen Ordner hat, und lässt einen Ordner stehen, den die Liste nicht kennt.
