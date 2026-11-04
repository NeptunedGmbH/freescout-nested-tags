# Spec Delta

## Purpose

Baut aus den Ordnern einer schon angebundenen Mailbox die Custom Folders und stellt die Gmail-Hierarchie darüber wieder her.

## ADDED Requirements

### Requirement: Nutzerordner werden kurze Custom Folders
Der Befehl MUST die Ordner über die gespeicherte Verbindung der gewählten Mailbox lesen. Jeder Nutzerordner MUST ein Custom Folder dieser Mailbox werden. Das Trennzeichen des Servers MUST die Ebene trennen. Der Tag MUST der kurze Name des letzten Segments sein. Dieser Ordner MUST unter dem vorigen Segment liegen.

#### Scenario: Verschachteltes Label
- **WHEN** die Mailbox den Ordner `Personal/Onboarding` führt
- **THEN** liegt Onboarding unter Personal, und die Tags heißen `Personal` und `Onboarding`

#### Scenario: Oberstes Label
- **WHEN** die Mailbox einen Nutzerordner ohne Trennzeichen führt
- **THEN** steht der neue Ordner auf der obersten Ebene

### Requirement: Systemordner bleiben draußen
Der Befehl MUST NOT aus dem Posteingang oder aus Gmail-Systemordnern einen Custom Folder anlegen. Dazu gehören Gesendet, Entwürfe, Spam, Papierkorb, Alle, Markiert und Wichtig, samt des Behälters `[Gmail]`.

#### Scenario: Posteingang
- **WHEN** die Liste den Posteingang enthält
- **THEN** entsteht daraus kein Ordner

#### Scenario: Gesendet
- **WHEN** die Liste `[Gmail]/Sent Mail` enthält
- **THEN** entsteht daraus kein Ordner

### Requirement: Vorhandener Ordner wird wiederverwendet
Trifft der kurze Name einen Custom Folder dieser Mailbox, MUST der Befehl diesen Ordner verwenden. Der Vergleich MUST die Großschreibung ignorieren und die gespeicherte Schreibweise behalten. Anzeigename und Icon MUST bleiben. Ein zweiter Ordner für denselben Tag MUST NOT entstehen.

#### Scenario: Tag existiert schon
- **WHEN** diese Mailbox schon einen Ordner mit dem Tag `onboarding` hat und die Liste `Personal/Onboarding` führt
- **THEN** bleibt dieser Ordner samt Anzeigename und Icon und liegt unter Personal

#### Scenario: Zweiter Lauf
- **WHEN** derselbe Befehl erneut läuft und die Ordner schon so liegen
- **THEN** entsteht kein weiterer Ordner für denselben Tag

### Requirement: Eigene Ordner bleiben
Ein Custom Folder dieser Mailbox, den die Ordnerliste nicht kennt, MUST bleiben, inklusive seiner bisherigen Ebene.

#### Scenario: Ordner nur in FreeScout
- **WHEN** diese Mailbox einen Custom Folder hat und die Liste keinen Ordner mit diesem Tag führt
- **THEN** bleiben der Ordner und seine Ebene

### Requirement: Nichts wird zurückgeschrieben
Der Befehl MUST NOT im Postfach einen Ordner anlegen, umbenennen oder löschen. Er MUST NOT Gespräche anlegen oder Tags an Gesprächen ändern. Er MUST NOT eine andere Anmeldung verlangen als die gespeicherte Verbindung.

#### Scenario: Nur lesen
- **WHEN** der Befehl Custom Folders anlegt
- **THEN** bleiben die Ordner im Postfach unverändert und die Tags der Gespräche auch

### Requirement: Unvollständige Liste schreibt nichts
Kommt die Ordnerliste nicht vollständig an, MUST der Befehl nichts schreiben.

#### Scenario: Verbindung bricht ab
- **WHEN** die Ordnerliste nur zum Teil ankommt
- **THEN** bleibt der Stand vor diesem Lauf unverändert

### Requirement: Andere Mailbox bleibt ruhig
Der Befehl MUST nur die gewählte Mailbox verändern.

#### Scenario: Zweites Postfach
- **WHEN** der Befehl für eine Mailbox läuft
- **THEN** bleiben die Ordner der anderen Mailbox unverändert
