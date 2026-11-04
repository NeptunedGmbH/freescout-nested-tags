# Spec Delta

## Purpose

Berechtigte Personen ziehen eigene Ordner in der Seitenleiste um. Der Baum und die Tags der Hauptordner bleiben danach dasselbe.

## ADDED Requirements

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
