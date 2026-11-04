# folder-sidebar-refresh Specification

## Purpose

Offene Ordnerleisten derselben Mailbox zeigen nach einer Änderung an eigenen Ordnern dieselbe Liste, einschließlich Name, Icon, Ebene und Reihenfolge.

## Requirements

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

### Requirement: Gleicher Baum wird nicht gezeichnet
Die offene Leiste MUST den ankommenden Stand mit dem sichtbaren Baum vergleichen, bevor sie zeichnet. Gleich sind dieselben Ordner, dieselben Namen, dieselben sichtbaren Zähler, dieselben Eltern und dieselbe Geschwisterreihenfolge. Stimmt das, MUST keine Zeile verschoben, ersetzt oder neu aufgebaut werden.

#### Scenario: Das eigene Verschieben kommt zurück
- **WHEN** die Person einen Ordner verschoben hat, die Leiste den neuen Baum schon zeigt und die Nachricht genau diesen Stand bringt
- **THEN** bleibt jede Zeile an ihrer Stelle, und die Leiste zuckt nicht

#### Scenario: Speichern im Dialog
- **WHEN** die Person den Elternordner im Dialog speichert und die Leiste den Ordner danach schon an der neuen Stelle zeigt
- **THEN** zeichnet die später eintreffende Nachricht den Baum nicht erneut

#### Scenario: Nach einem laufenden Zug
- **WHEN** die Nachricht während eines Zugs ankommt und der Baum nach dem Zug dem Stand schon entspricht
- **THEN** zeichnet die Leiste nach dem Zug nichts neu

#### Scenario: Chat
- **WHEN** die Seite im Chat-Modus ist
- **THEN** bleibt die Chat-Liste stehen

### Requirement: Name und Zähler bleiben an der Zeile
Weichen nur Name oder sichtbarer Zähler ab, MUST die Leiste nur diese Texte an der bestehenden Zeile setzen. Eltern, Reihenfolge und die Zeile selbst MUST bleiben.

#### Scenario: Nur der Zähler
- **WHEN** der sichtbare Zähler eines Ordners anders ist und Eltern sowie Reihenfolge gleich bleiben
- **THEN** zeigt dieselbe Zeile den neuen Zähler und bleibt an ihrer Stelle

#### Scenario: Nur der Name
- **WHEN** nur der Name eines Ordners anders ist
- **THEN** steht der neue Name in derselben Zeile

#### Scenario: Zähler erscheint oder verschwindet
- **WHEN** ein Ordner einen sichtbaren Zähler bekommt oder verliert
- **THEN** ändert sich nur dieser Zähler an der bestehenden Zeile

### Requirement: Eine andere Struktur versetzt vorhandene Zeilen
Weichen Eltern oder Reihenfolge ab, MUST die Leiste vorhandene Zeilen an die neue Stelle setzen. Ein neuer Ordner MUST an seiner Stelle erscheinen. Ein entfernter Ordner MUST verschwinden. Eine schon vorhandene Zeile MUST NOT durch eine neue ersetzt werden. Systemordner MUST an ihrer Stelle bleiben.

#### Scenario: Jemand anders hängt um
- **WHEN** eine andere Person Onboarding unter Personal speichert
- **THEN** steht Onboarding unter Personal, und die übrigen Zeilen bleiben dieselben

#### Scenario: Geschwister tauschen
- **WHEN** zwei eigene Ordner derselben Ebene die Reihenfolge tauschen und die Leiste noch die alte zeigt
- **THEN** stehen sie in der neuen Reihenfolge, und die übrigen Zeilen bleiben

#### Scenario: Neuer Ordner
- **WHEN** ein eigener Ordner neu angelegt wurde
- **THEN** erscheint er an seiner Stelle, und die schon sichtbaren Ordner bleiben

#### Scenario: Ordner entfernt
- **WHEN** ein eigener Ordner gelöscht wurde
- **THEN** fehlt er, und die übrigen Zeilen bleiben

#### Scenario: Systemordner
- **WHEN** ein eigener Ordner verschoben wird
- **THEN** bleiben Posteingang und die anderen Systemordner an ihrer Stelle

### Requirement: Icon und Einklappen überstehen den Abgleich
Ein Lucide- oder Emoji-Icon MUST stehen bleiben, solange sich das Icon nicht geändert hat. Ein zugeklappter Ordner MUST zugeklappt bleiben. Der selbst geöffnete Ordner MUST markiert bleiben. Der Knopf für einen neuen Ordner MUST bleiben.

#### Scenario: Eigenes Verschieben mit Icon
- **WHEN** die Leiste an einem Ordner ein Lucide- oder Emoji-Icon zeigt und die eigene Verschiebe-Nachricht zurückkommt
- **THEN** bleibt dieses Icon stehen, ohne zwischendurch zu verschwinden

#### Scenario: Nur das Icon ändert sich
- **WHEN** sich nur das Icon eines Ordners ändert
- **THEN** wechselt das Icon, und die Zeilen werden nicht neu aufgebaut

#### Scenario: Zugeklappt bleibt zu
- **WHEN** Personal zugeklappt ist und eine andere Person einen anderen Ordner verschiebt
- **THEN** bleibt Personal zugeklappt

#### Scenario: Anderer Ordner ist offen
- **WHEN** der Empfänger Geschlossen geöffnet hat und die Liste von Personal ankommt
- **THEN** bleibt Geschlossen markiert
