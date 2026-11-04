# Spec Delta

## Purpose

Offene Ordnerleisten übernehmen einen neuen Stand, ohne Zeilen neu aufzubauen, die sich nicht verändert haben.

## ADDED Requirements

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
