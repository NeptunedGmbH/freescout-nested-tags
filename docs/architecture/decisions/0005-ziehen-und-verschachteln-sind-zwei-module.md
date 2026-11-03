# 5. Ziehen und Verschachteln sind zwei Module

Date: 2026-11-03

## Status

Accepted

Baut auf [4. Verschachtelung klont Gmail-Labels](0004-verschachtelung-klont-gmail-labels.md)

## Kontext

Gmail kann zwei Dinge, die sich ähnlich anfühlen: Labels untereinander hängen, und Mails auf ein Label ziehen. Beides setzt auf derselben Seitenleiste auf. In FreeScout sind die Seitenleisten-Einträge Custom Folders. Wer beides in einem Modul baut, kann die Verschachtelung nicht nutzen, ohne das Ziehen mitzuliefern, und umgekehrt.

## Entscheidung

Verschachteln und Ziehen sind zwei Module. Sie verlangen einander nicht.

- Dieses Modul verschachtelt Custom Folders.
- Ziehen von Gesprächen auf einen Custom Folder ist das Modul im Repo `freescout-folder-drop`. Es setzt den Tag dieses Ordners. Die Hierarchie kennt es nicht.

Verworfen:

- Beides in `NestedTags`. Dann hängt ein Verhalten am anderen, obwohl die Seitenleiste die Ordner schon ohne Baum hergibt.
- Ziehen nur auf verschachtelte Ordner. Flache Custom Folders sollen das Ziel sein können, sobald das zweite Modul aktiv ist.

## Konsequenzen

- Sind beide Module aktiv, ist ein eingerückter Ordner ein Ablegeziel, weil er ein Custom Folder bleibt.
- Ist nur eines aktiv, tut das andere nichts.
- Die Hersteller-Module bleiben in beiden Fällen unangetastet.
