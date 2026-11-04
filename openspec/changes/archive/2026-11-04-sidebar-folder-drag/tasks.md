# Tasks

## 1. Reine Regeln

- [x] 1.1 `TreeRules` berechnet die neue Geschwisterfolge und den Tag-Unterschied ohne Datenbank. Die Folge nimmt den Ordner aus der alten Liste, setzt ihn unter dem neuen Elternordner vor `before_folder_id` oder ans Ende und nummeriert die Custom Folders in Tiefensuche ab 1. Nachfahren behalten ihre bisherige Folge. Der Tag-Unterschied nennt nur Tags, die neu darüber liegen, und Tags, die nicht mehr darüber liegen, ohne den eigenen Tag des Ordners. Verify: `php tests/tree_rules_test.php` fällt bei einem Zyklus weiterhin durch, zeigt Onboarding unter Personal mit bleibenden Kindern, eine Lücke zwischen Geschwistern ohne Elternwechsel, das Leeren des Elternordners, und den Tag-Unterschied Personal weg / Projekte dazu bei unverändertem Team.

## 2. Serverpfad

- [x] 2.1 `setParent` nimmt `before_folder_id` an. Ohne Recht, bei Systemordner, fremder Mailbox, fehlendem Ziel, Selbstbezug oder Zyklus schreibt es weder `folder_tree` noch `meta.order` noch Tags. Dieselbe Elternzeile ohne neue Stelle ändert keine Tags. Ein echter Elternwechsel gleicht die Gespräche dieser Mailbox im Ast ab: neue Hauptordner-Tags kommen dazu, weggefallene gehen weg, der eigene Tag bleibt, Gespräche außerhalb des Astes bleiben, der Tag-Datensatz wird nicht gelöscht. Die Geschwisterfolge landet in `meta.order` ab 1, Systemordner bleiben ohne neue `order`. Der Ajax `set_parent` reicht `before_folder_id` durch. Formular und Ordnerverwaltung lassen das Feld weg. Verify: `php -l` auf den geänderten PHP-Dateien ist ohne Fehler, der Controller liest `before_folder_id`, und `setParent` ruft die reine Folge und den Tag-Unterschied auf und überspringt den Tag-Abgleich, wenn der Elternordner gleich bleibt.

## 3. Seitenleiste

- [x] 3.1 Eigene Ordner in `#folders` lassen sich auf der Postfachliste und in der Gesprächsansicht ziehen, nur mit `boot.canEdit` und `pointer: fine`. Systemordner und `#folders.chats` nicht. Der Aufklapp-Pfeil und das `…`-Menü starten keinen Zug. Ein Gesprächszug startet keinen Ordnerzug, ein Ordnerzug füllt die FolderDrop-Gesprächsliste nicht. Das mittlere Band einer eigenen Zeile macht diesen Ordner zum Elternordner, das Randband ist die Lücke davor oder danach. Ein Namensschild folgt über dem Zeiger, die Zeile oder die Lücke ist markiert. Nach Erfolg zeichnet die bestehende Verschachtelung neu, ein zugeklappter Zielordner geht auf, ein Fehler lädt die Seite neu. „Neuer Ordner“ behält `sidebar-buttons btn-group-rounded nestedtags-add-wrap` und `btn btn-trans nestedtags-add` ohne eigenes `border-radius`. Verify: `npm run build` erzeugt `Public/js/module.js`, darin stehen `pointer: fine`, `#folders`, `before_folder_id` und kein `border-radius` an `.nestedtags-add`. Die CSS-Datei markiert Ordnerziel und Lücke.

## 4. Auslieferung

- [x] 4.1 Gebaute JS/CSS und geänderte PHP nach `/data/Modules/NestedTags` im Container `freescout-app` kopieren und `php artisan freescout:clear-cache` ausführen. Verify: die Prüfsummen von `Public/js/module.js`, `Public/css/module.css` und `Support/FolderTree.php` im Container stimmen mit dem Repo überein, und der Cache-Befehl endet mit Code 0.

## Workflow follow-up

- Den Change nach dem Review mit `openspec archive` archivieren.
