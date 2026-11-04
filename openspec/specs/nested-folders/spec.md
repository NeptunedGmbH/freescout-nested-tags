# nested-folders Specification

## Purpose

Custom Folders einer Mailbox lassen sich bedienen wie verschachtelte Gmail-Labels. Die Ebene ändert die Anzeige. Ein Gespräch liegt nur in den Ordnern, deren Tag es selbst trägt.

## Requirements

### Requirement: Unter einem bestehenden Ordner anlegen
Das System MUST einen Custom Folder beim Anlegen und beim Bearbeiten unter einen anderen Custom Folder derselben Mailbox legen können. Der Elternordner MUST schon existieren. Systemordner MUST NOT Eltern oder Kinder sein. Die Farbe eines Ordners MUST NOT von seinem Elternordner übernommen werden.

#### Scenario: Nest label under
- **WHEN** eine berechtigte Person Onboarding anlegt und Personal als übergeordneten Ordner wählt
- **THEN** liegt Onboarding unter Personal

#### Scenario: Unterlabel vom Elternordner aus
- **WHEN** eine berechtigte Person an Personal ein Unterlabel anlegt und es Lohnbuchhaltung nennt
- **THEN** liegt der neue Ordner unter Personal

#### Scenario: Herausnehmen
- **WHEN** eine berechtigte Person bei Onboarding den übergeordneten Ordner entfernt
- **THEN** steht Onboarding auf der obersten Ebene und seine eigenen Unterordner bleiben unter Onboarding

#### Scenario: Ast mitnehmen
- **WHEN** Onboarding unter Personal liegt, Lohnbuchhaltung unter Onboarding, und Onboarding unter Projekte gelegt wird
- **THEN** liegt Lohnbuchhaltung weiter unter Onboarding und Onboarding unter Projekte

#### Scenario: Andere Mailbox
- **WHEN** eine Person einen Ordner unter einen Custom Folder einer anderen Mailbox legen will
- **THEN** lehnt das System die Zuordnung ab und die bisherige Ebene bleibt

#### Scenario: Bestehende Ordner
- **WHEN** das Modul zum ersten Mal aktiv ist und noch keine Zuordnung gespeichert wurde
- **THEN** steht jeder bestehende Custom Folder auf der obersten Ebene

#### Scenario: Ziehen in der Ordnerliste
- **WHEN** eine berechtigte Person in der Ordnerverwaltung einen Ordner nach rechts auf den darüber liegenden Ordner zieht
- **THEN** liegt der gezogene Ordner darunter, und seine Unterordner bleiben an ihm

#### Scenario: Ziehen nach links
- **WHEN** eine berechtigte Person einen untergeordneten Ordner in der Ordnerverwaltung nach links zieht
- **THEN** steht er auf der obersten Ebene und seine Unterordner bleiben an ihm

### Requirement: Keine Zyklen
Das System MUST eine Zuordnung ablehnen, die einen Ordner unter sich selbst oder unter einen seiner Nachfahren legt. Die abgelehnte Zuordnung MUST NOT gespeichert werden.

#### Scenario: Unter den eigenen Nachfahren
- **WHEN** Lohnbuchhaltung unter Onboarding liegt und jemand Onboarding unter Lohnbuchhaltung legen will
- **THEN** bleibt Onboarding, wo es war

### Requirement: Seitenleiste zeigt den kurzen Namen im Baum
Die Seitenleiste MUST jeden sichtbaren Custom Folder mit seinem eigenen Namen zeigen, eingerückt unter dem sichtbaren Elternordner. Den Pfad MUST die Seitenleiste dort nicht anzeigen. Ein Ordner mit sichtbaren Kindern MUST sich auf- und zuklappen lassen. Der Zustand MUST pro Mailbox erhalten bleiben. Ohne gemerkten Zustand MUST der Zweig offen sein. Die Zahl am Ordner MUST die eigene Zahl dieses Ordners bleiben und MUST NOT die Kinder mitzählen.

#### Scenario: Kurzer Name
- **WHEN** Onboarding unter Personal liegt und der Nutzer die Mailbox öffnet
- **THEN** steht unter Personal der Name Onboarding, nicht der Pfad Personal/Onboarding

#### Scenario: Zugeklappt
- **WHEN** der Nutzer Personal zuklappt und die Mailbox erneut öffnet
- **THEN** bleibt Personal zu und Onboarding ist verborgen, bis Personal wieder aufgeht

#### Scenario: Versteckter Elternordner
- **WHEN** Personal für den aktuellen Nutzer nicht sichtbar ist und Onboarding sichtbar ist
- **THEN** erscheint Onboarding auf der obersten Ebene und Personal fehlt

#### Scenario: Eigene Zahl
- **WHEN** Personal keine eigenen Gespräche hat und Onboarding welche hat
- **THEN** zeigt Personal keine Anzahl aus Onboarding

### Requirement: Klick öffnet nur dieses Label
Ein Klick auf einen Ordner MUST die Gespräche öffnen, die den Tag dieses Ordners tragen. Die bisherigen Filter des Ordners MUST gelten. Gespräche eines Unterordners tragen den Tag des Hauptordners mit und erscheinen deshalb auch dort.

#### Scenario: Unterordner liegt im Hauptordner
- **WHEN** ein Gespräch den Tag von Onboarding trägt und Onboarding unter Personal liegt
- **THEN** trägt das Gespräch auch den Tag von Personal und erscheint in beiden Ordnern, soweit die Filter passen

#### Scenario: Filter bleiben
- **WHEN** ein Custom Folder nur aktive eigene Gespräche anzeigt
- **THEN** zeigt der geöffnete Ordner weiterhin nur diese Gespräche, auf jeder Ebene

### Requirement: Unterordner tragen den Tag des Hauptordners
Ein Gespräch, das den Tag eines Unterordners trägt, MUST auch den Tag jedes Hauptordners darüber tragen. Das gilt für Gespräche, die schon so markiert sind, und wenn ein Gespräch auf den Unterordner gezogen wird. Liegt ein bisheriger Hauptordner nach einem Umhängen nicht mehr darüber, MUST sein Tag von den Gesprächen dieses Astes in dieser Mailbox weg. Gespräche außerhalb des Astes MUST ihn behalten. Workflows, Suche und die API MUST den Tag über seinen bisherigen Namen treffen.

#### Scenario: Nachträglich
- **WHEN** Onboarding unter Personal liegt und ein Gespräch schon den Tag von Onboarding trägt
- **THEN** trägt das Gespräch auch den Tag von Personal

#### Scenario: Reinziehen
- **WHEN** jemand ein Gespräch auf Onboarding zieht und Onboarding unter Personal liegt
- **THEN** trägt das Gespräch den Tag von Onboarding und den Tag von Personal

#### Scenario: Suche
- **WHEN** jemand nach dem bisherigen Tag-Namen von Onboarding sucht
- **THEN** findet die Suche dieselben Gespräche wie vor der Verschachtelung

### Requirement: Am Gespräch steht der Pfad
Wo ein Tag an einem Gespräch sichtbar ist, MUST das System den Pfad der Ordnernamen dieser Mailbox mit `/` anzeigen. In der Tag-Auswahl MUST derselbe Baum stehen, jede Zeile mit dem eigenen Ordnernamen und eingerückt. Gespeichert und gesucht MUST der bisherige Tag-Name werden.

#### Scenario: Pfad am Gespräch
- **WHEN** ein Gespräch den Tag von Onboarding trägt und Onboarding unter Personal liegt
- **THEN** zeigt die Anzeige `Personal/Onboarding` und der gespeicherte Name bleibt der bisherige Tag-Name

#### Scenario: Umbenennen des Elternordners
- **WHEN** der Ordner Personal in Team umbenannt wird und ein Gespräch den Tag von Onboarding trägt
- **THEN** zeigt die Anzeige `Team/Onboarding` und die gespeicherten Tag-Namen bleiben

#### Scenario: Tag ohne Ordner
- **WHEN** ein Gespräch einen Tag trägt, der in dieser Mailbox an keinem Custom Folder hängt
- **THEN** zeigt die Anzeige nur den Tag-Namen

#### Scenario: Mehrere Ordner mit demselben Tag
- **WHEN** in derselben Mailbox mehr als ein Custom Folder denselben Tag trägt
- **THEN** zeigt die Anzeige am Gespräch nur den Tag-Namen

### Requirement: Elternordner löschen entfernt die Unterordner
Vor dem Löschen eines Custom Folders mit Unterordnern MUST das System die Unterordner nennen. Nach der Bestätigung MUST es diesen Ordner und jeden darunter liegenden Ordner löschen, ihre Tags von den Gesprächen dieser Mailbox nehmen und die Gespräche MUST NOT löschen. Ein Tag, den eine andere Mailbox noch an einem Ordner verwendet, MUST als Tag erhalten bleiben.

#### Scenario: Bestätigung
- **WHEN** eine berechtigte Person Personal löschen will und Onboarding darunter liegt
- **THEN** nennt die Rückfrage Onboarding, bevor etwas gelöscht wird

#### Scenario: Unterordner weg, Gespräche bleiben
- **WHEN** die Person das Löschen bestätigt
- **THEN** sind Personal und Onboarding als Ordner weg, die Gespräche sind noch da, und die Tags dieser Ordner hängen nicht mehr an Gesprächen dieser Mailbox

### Requirement: Nur berechtigte Personen ändern die Ebene
Das System MUST die Ebene eines Ordners nur ändern, wenn dieselbe Person den Custom Folder dieser Mailbox bearbeiten darf.

#### Scenario: Ohne Recht
- **WHEN** eine Person ohne Recht zur Ordnerverwaltung eine Ebene ändern will
- **THEN** lehnt das System die Änderung ab

### Requirement: UpdateGuard prüft das Modul
Das Modul MUST den Artisan-Befehl `nestedtags:health` registrieren. Mit `--json` MUST die Ausgabe ein JSON-Objekt mit `status` `ok` oder `fail` sein. Exit-Code 0 MUST genau den gesunden Zustand bedeuten. Der Befehl MUST NOT schreiben, migrieren oder das Netzwerk benutzen.

#### Scenario: Gesundes Modul
- **WHEN** die Dateien, die Klassen, die Route und die Tabelle `folder_tree` lesbar sind und `php artisan nestedtags:health --json` läuft
- **THEN** ist der Exit-Code 0 und `status` ist `ok`

#### Scenario: Prüfung ändert nichts
- **WHEN** der Befehl läuft
- **THEN** schreibt er keine Zeile, startet keine Migration und baut keine Verbindung nach außen auf

### Requirement: Seitenleiste zieht eigene Ordner
Wer die Custom Folders dieser Mailbox bearbeiten darf, MUST einen eigenen Ordner in der Seitenleiste an eine neue Stelle ziehen können. Systemordner MUST NOT gezogen werden und MUST NOT Eltern werden. Die Unterordner des gezogenen Ordners MUST an ihm bleiben. Ohne das Recht MUST die Seitenleiste das Ziehen nicht anbieten, und der Server MUST die Änderung ablehnen.

#### Scenario: Auf einen Ordner ziehen
- **WHEN** eine berechtigte Person Onboarding auf Personal zieht
- **THEN** liegt Onboarding unter Personal, und die Unterordner von Onboarding bleiben unter Onboarding

#### Scenario: Zwischen Geschwister ziehen
- **WHEN** eine berechtigte Person Onboarding zwischen zwei Ordner auf derselben Ebene zieht
- **THEN** behält Onboarding diese Ebene und steht an der neuen Stelle

#### Scenario: Zum Hauptordner machen
- **WHEN** eine berechtigte Person Onboarding aus Personal auf die oberste Ebene zieht
- **THEN** hat Onboarding keinen Elternordner, und seine Unterordner bleiben unter Onboarding

#### Scenario: Systemordner
- **WHEN** jemand Posteingang oder Geschlossen ziehen oder als Ziel nutzen will
- **THEN** bleibt die Seitenleiste unverändert

#### Scenario: Ohne Recht
- **WHEN** eine Person ohne Ordnerrecht einen Ordner verschieben will
- **THEN** bietet die Seitenleiste das Ziehen nicht an, und eine trotzdem gesendete Änderung wird abgelehnt

#### Scenario: Auf sich oder den eigenen Ast
- **WHEN** jemand Personal auf Personal oder auf einen Ordner unter Personal zieht
- **THEN** lehnt das System ab, und Eltern, Reihenfolge und Tags bleiben

#### Scenario: Ziel fehlt
- **WHEN** der Zielordner einer anderen Mailbox gehört oder nicht mehr existiert
- **THEN** lehnt das System ab, und Eltern, Reihenfolge und Tags bleiben

#### Scenario: Zugeklapptes Ziel
- **WHEN** das Ablegen auf einen zugeklappten Ordner gelingt
- **THEN** ist dieser Ordner danach offen, und der abgelegte Ordner ist darunter sichtbar

#### Scenario: Grober Zeiger
- **WHEN** der Zeiger grob ist
- **THEN** startet das Ziehen eines Ordners nicht

#### Scenario: Gespräch und Ordner
- **WHEN** ein Gespräch gezogen wird
- **THEN** bewegt sich kein Ordner, und wenn ein Ordner gezogen wird, wird kein Gespräch abgelegt

#### Scenario: Pfeil und Menü
- **WHEN** jemand den Aufklapp-Pfeil oder das Ordnermenü benutzt
- **THEN** startet dadurch kein Ordnerzug

### Requirement: Das Ziel bleibt sichtbar
Während des Ziehens MUST der Name des Ordners als kleines Ziel mitwandern, und die Ablagestelle MUST sichtbar markiert sein. Liegt der Zeiger auf einem Ordner, MUST dieser Ordner das Ziel sein. Liegt er in einer Lücke, MUST die Lücke das Ziel sein.

#### Scenario: Auf der Zeile
- **WHEN** der Zeiger auf Personal steht
- **THEN** ist Personal als Ablageziel zu erkennen, und der mitwandernde Name verdeckt diese Zeile nicht

#### Scenario: In der Lücke
- **WHEN** der Zeiger zwischen zwei Geschwistern steht
- **THEN** ist die Einfügestelle zu erkennen

### Requirement: Die Stelle übersteht das Neuladen
Nach dem Neuladen MUST der Ordner unter demselben Elternordner an derselben Geschwisterstelle stehen. Systemordner MUST an ihrer bisherigen Stelle bleiben. Ein eigener Ordner MUST NOT zwischen Systemordner geschoben werden.

#### Scenario: Nach dem Neuladen
- **WHEN** Onboarding zwischen zwei eigene Ordner gezogen wurde und die Seite neu lädt
- **THEN** steht Onboarding weiterhin zwischen diesen beiden

#### Scenario: Neben Posteingang
- **WHEN** jemand einen eigenen Ordner neben Posteingang ablegen will
- **THEN** bleibt er im Block der eigenen Ordner

### Requirement: Umhängen gleicht die Hauptordner-Tags ab
Ändern sich die Hauptordner über einem Ordner, MUST jedes Gespräch dieser Mailbox im verschobenen Ast den Tag jedes neuen Hauptordners bekommen und den Tag jedes weggefallenen Hauptordners verlieren. Zum Ast gehören die Gespräche, die den Tag des verschobenen Ordners oder eines darunter gebliebenen Ordners tragen. Gespräche außerhalb des Astes MUST ihre Tags behalten. Der eigene Tag des verschobenen Ordners MUST bleiben. Ein abgelehntes oder unverändertes Umhängen MUST keine Tags ändern.

#### Scenario: Unterordner wird Hauptordner
- **WHEN** Onboarding unter Personal liegt und zur obersten Ebene wird
- **THEN** verlieren Gespräche mit dem Tag von Onboarding den Tag von Personal, und Gespräche, die nur in Personal liegen, behalten ihn

#### Scenario: Geschwister bleibt
- **WHEN** Onboarding und Lohnbuchhaltung unter Personal liegen und nur Onboarding zur obersten Ebene wird
- **THEN** behalten Gespräche in Lohnbuchhaltung den Tag von Personal

#### Scenario: Tiefer Ordner wird Hauptordner
- **WHEN** Lohnbuchhaltung unter Onboarding und Onboarding unter Personal liegt und nur Lohnbuchhaltung zur obersten Ebene wird
- **THEN** verlieren Gespräche mit dem Tag von Lohnbuchhaltung die Tags von Onboarding und Personal

#### Scenario: Ast zieht mit
- **WHEN** Onboarding unter Personal zur obersten Ebene wird und Lohnbuchhaltung unter Onboarding bleibt
- **THEN** verlieren Gespräche in Onboarding und in Lohnbuchhaltung den Tag von Personal und behalten den Tag von Onboarding

#### Scenario: Anderer Hauptordner
- **WHEN** Onboarding von Personal unter Projekte gezogen wird
- **THEN** verlieren die Gespräche des Astes den Tag von Personal und bekommen den Tag von Projekte

#### Scenario: Gemeinsamer Hauptordner bleibt
- **WHEN** Personal und Projekte unter Team liegen und Onboarding von Personal unter Projekte gezogen wird
- **THEN** behalten die Gespräche des Astes den Tag von Team, verlieren Personal und bekommen Projekte

#### Scenario: Tag war schon da
- **WHEN** ein Gespräch im Ast den Tag des neuen Hauptordners schon trägt
- **THEN** trägt es ihn danach genau einmal

#### Scenario: Andere Mailbox
- **WHEN** derselbe Tag-Name in einer anderen Mailbox an Gesprächen hängt
- **THEN** ändert das Umhängen diese Gespräche nicht

#### Scenario: Tag bleibt als Datensatz
- **WHEN** der weggefallene Hauptordner oder eine andere Mailbox den Tag noch an einem Ordner verwendet
- **THEN** bleibt der Tag-Datensatz erhalten

#### Scenario: Nur die Reihenfolge
- **WHEN** ein Ordner zwischen Geschwistern desselben Elternordners zieht
- **THEN** ändern sich keine Tags

#### Scenario: Abgelehnt
- **WHEN** das Umhängen abgelehnt wird
- **THEN** bleiben alle Tags, wie sie waren

#### Scenario: Ordner ohne Tag
- **WHEN** der verschobene Ordner keinen Tag hat und ein Unterordner einen hat
- **THEN** werden die Gespräche des Unterordners abgeglichen

#### Scenario: Tag saß schon von Hand
- **WHEN** ein Gespräch im Ast den Tag des alten Hauptordners trägt, ohne dass die Herkunft noch unterscheidbar ist
- **THEN** verliert es diesen Tag trotzdem, sobald der Hauptordner nicht mehr darüber liegt

#### Scenario: Listen danach
- **WHEN** Onboarding Personal verlässt
- **THEN** listet Personal diese Gespräche nicht mehr, und Onboarding listet sie weiter

### Requirement: Jeder Weg hängt gleich um
Dieselbe Tag-Regel MUST gelten, wenn der Elternordner im Formular oder in der Ordnerverwaltung geändert wird.

#### Scenario: Feld Unterordnen unter
- **WHEN** eine berechtigte Person bei Onboarding den Elternordner Personal entfernt und speichert
- **THEN** verlieren die Gespräche des Astes den Tag von Personal

#### Scenario: In der Ordnerverwaltung nach links
- **WHEN** eine berechtigte Person Onboarding in der Ordnerverwaltung auf die oberste Ebene zieht
- **THEN** verlieren die Gespräche des Astes den Tag des bisherigen Hauptordners
