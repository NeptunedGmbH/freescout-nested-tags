# 3. Kein eigener Ordnertyp

Date: 2026-11-03

## Status

Superseded by [4. Verschachtelung klont Gmail-Labels](0004-verschachtelung-klont-gmail-labels.md)

Baut auf [2. Hierarchie an Custom Folders in eigener Tabelle](0002-hierarchie-an-custom-folders-in-eigener-tabelle.md)

## Kontext

Ein Custom Folder filtert bereits auf genau einen Tag und behält dabei Status, Zähler und „Nur anzeigen für“. Gmail zeigt untergeordnete Labels nur eingerückt. Ein Klick auf das Eltern-Label öffnet nicht die Kinder. Die Seitenleiste von FreeScout gibt die Ordner als flache Liste aus. Einen zweiten Ordner pro Tag daneben zu stellen würde dieselben Gespräche doppelt anbieten.

## Entscheidung

Dieses Modul führt keinen eigenen Ordnertyp ein. Es hängt die bestehenden Custom Folders in der Seitenleiste untereinander. Der Link, die Query und die Zähler bleiben die des Custom Folders.

Verworfen:

- Ein eigener Ordnertyp mit einer Query über den Tag und alle Nachfahren. Das wäre ein anderes Produkt als Gmail und würde die vorhandene Filterlogik ein zweites Mal bauen.
- Die Seitenleisten-Vorlage im Core zu ersetzen. Ein Core-Update würde die Vorlage zurückholen, und die flache Liste reicht als Eingabe für das Umhängen.

## Konsequenzen

- Eltern- und Kindordner zeigen weiter nur ihre eigenen Gespräche.
- Filter und Zähler eines Ordners gelten auf jeder Ebene gleich.
- Die Einrückung lebt im Modul und verschwindet mit ihm. Die Ordner selbst bleiben.
