# 1. Record architecture decisions

Date: 2026-11-03

## Status

Accepted

## Kontext

Dieses Modul bekommt Verhalten über OpenSpec und Grundsatzentscheidungen daneben. Ohne einen festen Ort für das Warum lassen sich spätere Änderungen nicht von historisch Gewachsenem unterscheiden.

## Entscheidung

Wir halten Architekturentscheidungen als Architecture Decision Records im Format von Michael Nygard fest.

- Ablage: `docs/architecture/decisions/`.
- Sprache: Deutsch. Abschnitte: Status, Kontext, Entscheidung, Konsequenzen.
- Eine ADR begründet, warum eine Struktur gilt und welche Alternative verworfen wurde.
- Verhalten, also was die Oberfläche oder eine Schnittstelle tut, steht in OpenSpec, nicht in der ADR.
- Akzeptierte ADRs bleiben unverändert. Eine geänderte Entscheidung bekommt eine neue ADR, die die alte ablöst.

## Konsequenzen

- Grundsatzentscheidungen dieses Moduls liegen unter `docs/architecture/decisions/`.
- OpenSpec unter `openspec/` bleibt der Ort für Verhalten.
