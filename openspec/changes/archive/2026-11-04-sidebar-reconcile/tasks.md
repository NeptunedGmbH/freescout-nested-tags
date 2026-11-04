# Tasks

## 1. Zeile nur versetzen, wenn die Stelle abweicht

- [x] 1.1 `placeAt` setzt ein `li[data-folder_id]` nur dann um, wenn an diesem Index ein anderer Ordner-Nachbar steht. Zeilen ohne `data-folder_id` bleiben. `nestSidebar` und `placeTopLevel` benutzen das, statt Kinder mit `appendChild` neu anzuhängen. Verify: `npm run build` erzeugt `Public/js/module.js`, und darin hängt `nestSidebar` Kinder nicht mehr unconditional per `appendChild` an.

## 2. Abgleich vor dem Zeichnen

- [x] 2.1 Den flachen Stempel entfernen, einschließlich `folderStamp`, `stampFolderHtml`, `stampFolderRoot` und `retitleFolderStamp`. Verify: `npm run build` läuft durch, und `folderStamp` kommt in `src/module.ts` nicht mehr vor.
- [x] 2.2 `replaceFolderList` parst das HTML abseits des DOM, lädt den Baum und vergleicht erst danach Ids, Name, Zähler im eigenen Link, `data-active-count`, Eltern und Geschwisterreihenfolge. Bei Gleichstand gibt es keinen DOM-Schreibzugriff. Nur Name oder Zähler werden an der bestehenden Zeile gesetzt. Eine andere Struktur versetzt vorhandene `li`, fügt neue aus dem geparsten HTML ein, entfernt überzählige und löscht leere Kinderlisten samt Pfeil. Das `i` bleibt. Eine ältere Baum-Antwort wird verworfen. `#folders.chats` und der aufgeschobene Zug bleiben. Verify: `npm run build` läuft durch, `innerHTML` setzt `#folders` in diesem Pfad nicht mehr, und der Icon-Versand liegt vor dem Abgleich.

## 3. Dialog zeichnet nicht doppelt

- [x] 3.1 Nach einem schon gesetzten Elternwechsel lädt `showSidebarEdit` den Baum nur für Pfade und Markierungen und ruft nicht `paint` auf. Verify: `npm run build` läuft durch, und der Elternzweig von `showSidebarEdit` übergibt `refreshFolderLabels` statt `paint`.

## 4. Auslieferung

- [x] 4.1 Gebautes JS nach `/data/Modules/NestedTags/Public/js/module.js` kopieren, `chown nginx:www-data`, Cache als `nginx` leeren. Verify: die Prüfsumme im Container `freescout-app` stimmt mit dem Repo überein, und `freescout:clear-cache` endet mit Code 0.
- [x] 4.2 Im Browser einen eigenen Ordner ziehen und denselben Ordner über den Dialog umhängen. Verify: nach dem lokalen Umbau erhöht ein `childList` auf `#folders` sich nicht mehr, wenn die eigene Nachricht ankommt. Ein zweites Fenster zeigt Eltern und Reihenfolge. Ein Lucide-Icon bleibt im speichernden Tab stehen. Ein zugeklappter Ordner bleibt zu. Der geöffnete Ordner bleibt markiert.

## Workflow follow-up

- Den Change nach dem Review mit `openspec archive` archivieren.
