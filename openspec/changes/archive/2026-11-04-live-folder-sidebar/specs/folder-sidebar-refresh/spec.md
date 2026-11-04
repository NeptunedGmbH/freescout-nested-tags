# Spec Delta

## Purpose

Offene Ordnerleisten derselben Mailbox zeigen nach einer Änderung an eigenen Ordnern dieselbe Liste, einschließlich Name, Icon, Ebene und Reihenfolge.

## ADDED Requirements

### Requirement: Eine sichtbare Ordneränderung wird mitgeteilt
Das System MUST nach dem erfolgreichen Speichern einer sichtbaren Änderung an den eigenen Ordnern einer Mailbox eine Nachricht für diese Mailbox veröffentlichen. Sichtbar sind Umhängen, Umsortieren, Anlegen, Löschen, Umbenennen und das Icon. Eine abgelehnte Änderung MUST NOT veröffentlicht werden.

#### Scenario: Ordner umgehängt
- **WHEN** eine berechtigte Person Onboarding unter Personal speichert
- **THEN** gibt es eine Nachricht für diese Mailbox

#### Scenario: Icon geändert
- **WHEN** eine berechtigte Person das Icon von Personal speichert
- **THEN** gibt es eine Nachricht für diese Mailbox

#### Scenario: Abgelehnt
- **WHEN** ein Umhängen abgelehnt wird
- **THEN** gibt es keine Nachricht

#### Scenario: Nur eine Markierung
- **WHEN** jemand ein Gespräch auf einen Ordner zieht und dabei nur Markierungen setzt
- **THEN** gibt es keine Nachricht für die Ordnerleiste

### Requirement: Die offene Leiste übernimmt die aktuelle Liste
Eine offene Ordnerleiste dieser Mailbox MUST die eigenen Ordner so zeigen, wie sie zum Zeitpunkt des Empfangs gespeichert sind: Name, Icon, Ebene, Reihenfolge und welche Ordner es gibt. Systemordner MUST an ihrer Stelle bleiben. Die Leiste MUST danach weiter aufklappen, das Ordnermenü anbieten und, wo erlaubt, Ordner ziehen lassen.

#### Scenario: Zweite Person hat die Mailbox offen
- **WHEN** die Nachricht ankommt und eine andere Person dieselbe Mailbox mit der Ordnerleiste offen hat
- **THEN** zeigt ihre Leiste die neue Ebene, die neue Reihenfolge und das neue Icon

#### Scenario: Zweites Fenster derselben Person
- **WHEN** die Person, die gespeichert hat, die Mailbox in einem zweiten Fenster offen hat
- **THEN** übernimmt auch dieses Fenster die aktuelle Liste

#### Scenario: Versteckte Ordner
- **WHEN** ein Ordner für den Empfänger nicht angezeigt werden darf
- **THEN** fehlt dieser Ordner in seiner Liste, auch wenn der Absender ihn sieht

### Requirement: Der eigene Kontext der Leiste bleibt
Der Empfänger MUST den Ordner markiert behalten, den er selbst geöffnet hat. Ein laufendes Ziehen auf dieser Seite MUST NOT abgebrochen werden. Der Knopf für einen neuen Ordner und die vorhandenen Seitenleisten-Knöpfe MUST bleiben. Im Chat-Modus MUST die Leiste nicht durch die Ordnerliste ersetzt werden.

#### Scenario: Anderer Ordner ist offen
- **WHEN** der Empfänger Geschlossen geöffnet hat und die Liste von Personal ankommt
- **THEN** bleibt Geschlossen markiert

#### Scenario: Während eines Zugs
- **WHEN** der Empfänger gerade einen Ordner oder ein Gespräch zieht und die Nachricht ankommt
- **THEN** läuft dieser Zug zu Ende, und die Liste wird danach ersetzt

#### Scenario: Chat
- **WHEN** die Seite im Chat-Modus ist
- **THEN** bleibt die Chat-Liste stehen

### Requirement: Unberechtigte erfahren die Liste nicht
Wer die Mailbox nicht sehen darf, MUST aus der Nachricht keine Ordnernamen, Icons oder Ebenen erfahren.

#### Scenario: Fremde Mailbox
- **WHEN** eine Person ohne Zugriff auf die Mailbox die Nachricht empfangen würde
- **THEN** enthält die Antwort für sie keine Ordnerliste
