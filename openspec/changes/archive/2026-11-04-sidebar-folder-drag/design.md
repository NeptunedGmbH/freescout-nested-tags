# Design

## Context

Siehe proposal.md. Die Anforderungen stehen in `specs/nested-folders/spec.md`. Die Ebene liegt in `folder_tree`. Custom Folders sortiert eigene Ordner über `folders.meta.order` (`meta.order + 1000`, Systemordner bleiben bei Sortierschlüssel 0) und ersetzt `meta` beim Speichern des Ordnerformulars komplett, lässt `order` aber stehen, wenn das Modul das Feld vorher gelesen hat. Die Seitenleiste ist auf der Postfachliste und in der Gesprächsansicht dasselbe `#folders`. `boot.canEdit` kommt von `CustomFolder::canUserUpdateMailboxCustomFolders`. Formular und Ordnerverwaltung rufen schon `set_parent` auf. `inheritFromFolder` hängt fehlende Hauptordner-Tags nur an und nimmt keine weg. FolderDrop zieht Gespräche und bleibt unangetastet.

## Goals / Non-Goals

**Goals:**

- Dieselbe Seitenleisten-Geste auf Postfachliste und Gesprächsansicht, weil beide `#folders` rendern.
- Ein Serverpfad für Ebene, Geschwisterfolge und Tag-Abgleich, den Formular, Ordnerverwaltung und Seitenleiste teilen.
- Reine Funktionen für die neue Geschwisterfolge und den Tag-Unterschied, prüfbar ohne Datenbank.

**Non-Goals:**

- Kein Patch an FreeScout-Core, Tags oder Custom Folders. Kein neues Schema.
- FolderDrop nicht anfassen. Kein zweites Gespräch-Drop.
- Die Klassen von „Neuer Ordner“ nicht ändern. `module.json` `img` und `Public/img/module.png` nicht anfassen.
- Chat-Modus (`#folders.chats`) bekommt kein Ordnerziehen.

## Decisions

1. **`setParent` bleibt der einzige Schreibweg und nimmt die Stelle dazu.** Der Ajax `set_parent` bekommt optional `before_folder_id`: der Geschwisterordner, vor dem der gezogene Ordner unter dem neuen Elternordner stehen soll. Leer heißt ans Ende dieser Geschwister. Formular und Ordnerverwaltung schicken das Feld nicht und hängen damit ans Ende, sobald sich der Elternordner ändert. Alternative: die Seitenleiste schreibt `meta.order` selbst per zweitem Ajax. Verworfen, weil die Spec einen Server als Quelle der Wahrheit und dasselbe Tag-Ergebnis auf allen Wegen verlangt.

2. **Geschwisterfolge als Tiefensuche in `meta.order`.** Eine reine Funktion nimmt die bisherigen Kinderlisten, entfernt den Ordner aus der alten Liste, setzt ihn unter dem neuen Elternordner vor `before_folder_id` oder ans Ende und nummeriert die Custom Folders dieser Mailbox in Tiefensuche ab 1. Nachfahren behalten untereinander ihre bisherige Folge. Systemordner bekommen keine `order`. Positive Werte sortieren bei Custom Folders hinter den Systemordnern, deshalb landet kein eigener Ordner zwischen Posteingang und Geschlossen. Alternative: nur die Geschwister des Ziels neu nummerieren. Verworfen, weil die flache Liste die einzige gespeicherte Folge ist und eine lokale Nummer die sichtbare Tiefensuche zerreißen kann.

3. **Ablehnen schreibt nichts.** Vor dem ersten Schreiben gelten die bisherigen Regeln: Recht, nur Custom Folders dieser Mailbox, kein Selbstbezug, kein Zyklus über Nachfahren, Ziel und `before_folder_id` müssen existieren und zur neuen Geschwisterliste gehören. Ein Systemordner ist kein Ziel und kein `before_folder_id`. Schlägt das fehl, bleiben `folder_tree`, `meta.order` und Tags. Dieselbe Elternzeile ohne neue Stelle ändert auch die Tags nicht. Alternative: erst verschieben und bei Zyklus zurückrollen. Verworfen, weil die Spec bei Ablehnung einen unveränderten Stand verlangt.

4. **Tag-Abgleich ist der Unterschied der Hauptordner, nur im Ast, nur in dieser Mailbox.** Vor dem Schreiben merkt sich der Server die Hauptordner-Tags jedes Ordners im Ast (der gezogene Ordner und was unter ihm bleibt). Danach kommen Tags dazu, die neu darüber liegen, und Tags weg, die nicht mehr darüber liegen. Der eigene Tag des Ordners bleibt. Gespräche ohne Tag eines Ordners in diesem Ast bleiben, auch Geschwister und der alte Elternordner. Ein Tag-Datensatz wird nicht gelöscht: der alte Hauptordner benutzt ihn weiter, und eine andere Mailbox darf ihn behalten. Eine reine Funktion bildet den Unterschied. `attach` und `detach` laufen über die bestehende Tags-API, damit Zähler weiter zählen. Ein schon vorhandener Tag wird nicht verdoppelt. Herkunft von Hand ist nicht gespeichert und fällt mit unter das Entfernen. Ein Ordner ohne Tag trägt nichts bei, seine Kinder werden über ihren eigenen Tag abgeglichen. Alternative: das bisherige `inheritFromFolder` nur um Löschen erweitern und bei jedem `setParent` laufen lassen. Verworfen, weil eine reine Umsortierung dann Tags anfassen würde.

5. **Die Zeile unter dem Zeiger entscheidet das Ziel, nicht das ganze `<li>`.** Das `<li>` enthält die Kinder. Getroffen wird nur die eigene Zeile `:scope > a`. Das mittlere Band der Zeile macht den Ordner zum Elternordner (der gezogene Ordner wird letztes Kind). Das obere und untere Band ist die Lücke davor oder danach und behält den Elternordner dieser Zeile. Eine Lücke zwischen zwei obersten eigenen Ordnern leert den Elternordner. Systemordner und der Bereich außerhalb des Blocks eigener Ordner sind kein Ziel. Während des Zugs zeigt ein kleines Namensschild über dem Zeiger den Ordner, eine Klasse die Ordnerzeile und eine Linie die Lücke. Das Schild sitzt über dem Zeiger, damit die Zeile darunter frei bleibt. Nach einem erfolgreichen Ablegen auf einen zugeklappten Ordner entfernt der Client `nestedtags-collapsed` und schreibt denselben Speicher `nestedtags.collapse.<mailboxId>`. Alternative: HTML5-Drop nur auf das ganze `<li>`. Verworfen, weil die Kinder sonst das Ziel des Elternordners verdecken und eine Lücke nicht von einem Ordner unterscheidbar ist.

6. **Ziehen nur mit feinem Zeiger und Recht, ein Ordner.** `draggable` steht nur auf einem eigenen Ordner, wenn `boot.canEdit` und `pointer: fine`. Der Aufklapp-Pfeil und das `…`-Menü brechen `dragstart` ab. `#folders.chats` bleibt aus. Der Client merkt sich die Ordner-ID nur in seinem eigenen Zug und ignoriert fremde `dragstart`, also auch Gesprächszeilen von FolderDrop. FolderDrop setzt seine Gesprächsliste nur bei `tr.conv-row` und `li.chat-item` und legt deshalb bei einem Ordnerzug nichts ab. Der Ordnerzug legt kein Gespräch ab, weil er die FolderDrop-Liste nicht füllt. Ein Zug gleichzeitig bleibt einer, weil der Client eine laufende Ordner-ID nicht überschreibt.

7. **Der Client zieht die Leiste erst nach der Erfolgsantwort um.** Bis dahin sind nur Schild und Markierung sichtbar. Danach aktualisiert er `nodes` und lässt die bestehende Verschachtelung neu zeichnen. Ein Fehler lädt die Seite neu, der Serverstand bleibt. Dieselbe `#folders`-Logik gilt auf `mailboxes.*`, `conversations.view` und `conversations.create`, weil der Boot dort die Mailbox und `canEdit` schon setzt.

## Risks / Trade-offs

- [Custom Folders überschreibt `meta` beim Speichern des Formulars und lässt `order` weg] → der bestehende Update-Pfad von Custom Folders kopiert das alte `meta` und setzt nur geänderte Felder. `order` bleibt, solange dieser Pfad so bleibt. Ein Modul-Update, das `meta` neu aufbaut, setzt die Folge zurück auf „ohne order“. Die Ebene in `folder_tree` bleibt.
- [Bandhöhe trifft eine Lücke, obwohl der Nutzer den Ordner meinte] → das mittlere Band ist das Ordnerziel, nur die Ränder sind Lücken. Falsches Ablegen ist ein normaler `set_parent` und über denselben Weg korrigierbar.
- [Tag-API hängt oder verdoppelt nicht so wie angenommen] → der Abgleich prüft die vorhandenen Tag-Namen des Gesprächs und schreibt nur die Differenz. Der Tag-Datensatz wird nicht gelöscht.
- [Ein Realtime-Ersatz von `#folders` wirft die Verschachtelung weg] → das ist der bisherige Paint. Dieser Change zeichnet nach dem eigenen Ajax neu und hängt das Ziehen an denselben Paint.

## Migration Plan

`npm run build` im Repo, geänderte `Public/js/module.js`, `Public/css/module.css` und PHP nach `/data/Modules/NestedTags` kopieren, danach `php artisan freescout:clear-cache` im Container `freescout-app`. Keine Migration. Rollback: die vorherigen Moduldateien zurücklegen und den Cache leeren. `folder_tree` und schon geschriebene `meta.order` dürfen bleiben. Tags, die dieser Zug schon abgeglichen hat, kehrt der Rollback nicht um.
