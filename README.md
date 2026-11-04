# TERBiBOARD (Version 9.9, Stand 2026-11-04)

Eigenständiges Whiteboard nach dem Vorbild von Weitzboard, komplett neu geschrieben (kein Original-Code).
© 2026 DocTERBi (TERBi Teaching) ☺ · freie Bildungsressource unter der **GNU General Public License v3.0** (`GPL-3.0-only`, siehe `LICENSE`).

**Dank:** Ein herzliches Dankeschön an **Prof. Dr. Edmund Weitz**, dessen Weitzboard Vorbild und Inspiration für TERBiBOARD war. Ohne seine Idee eines schlanken, browserbasierten Tafelprogramms gäbe es dieses Board nicht.

**Handbuch:** `handbuch.html` (im Board über Hilfe F1 → „Ausführliches Handbuch öffnen“).

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Seite, Dialoge (Hilfe, Rechner, Backups) |
| `handbuch.html` | Ausführliches Benutzerhandbuch (druckbar), verlinkt aus der Hilfe |
| `style.css` | Panel, Zeichenfläche, Druckansicht |
| `app.js` | gesamte Logik (Modell, Zeichnen, Auswahl, Text, Speichern, Backups) |
| `pdf.min.js`, `pdf.worker.min.js` | PDF-Import (pdf.js 3.11.174, Apache-2.0), wird erst bei Bedarf geladen |
| `katex.min.js` | Formelsatz (KaTeX 0.16.11, MIT-Lizenz), Ausgabe als MathML |
| `LICENSE` | Lizenztext GPL-3.0 |
| `THIRD-PARTY-LICENSES.txt` | Lizenzen von KaTeX (MIT) und PDF.js (Apache-2.0) |
| `logo.png` | TERBi-Teaching-Logo im Panel-Kopf |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | PWA: installierbar, offline nutzbar |

## Betrieb

- **Als Website:** Ordner auf einen Webserver legen (z. B. GitHub Pages). Dann installierbar als App und offline nutzbar.
- **Interaktive Tafeln mit Stift:** Chrome oder Edge verwenden. Messung (v9.8) an einer interaktiven Tafel unter Windows: Firefox meldet die erste Stiftbewegung im Schnitt erst nach ca. 125 ms, Chrome nach ca. 55 ms – bei kleiner Schrift fehlen in Firefox sichtbar die Strichanfänge.
- **SVG-Dateien per Doppelklick (ab v9.8):** Die installierte App trägt sich als Programm für `.svg` ein (Manifest `file_handlers`, Start über `launchQueue`). In Windows: Rechtsklick auf eine .svg → Öffnen mit → TERBiBOARD → „Immer diese App verwenden“.
- **Lokal:** `index.html` per Doppelklick öffnen funktioniert ebenfalls, nur ohne Installation/Offline-Cache.
- **Einzeldatei für Android/Tablets:** `TERBiBOARD_Einzeldatei.html` enthält alles in einer Datei (ca. 2 MB: Code, KaTeX, PDF.js, Logo, Handbuch). Auf dem Gerät in Chrome öffnen. Kein Service Worker, nicht installierbar.
- **Eigene Kopie auf GitHub Pages:** Repository forken oder alle Dateien in ein eigenes Repository hochladen, dann Settings → Pages → *Deploy from a branch*, Branch `main`, Ordner `/ (root)`, Save. Nach 1–2 Minuten läuft das Board unter `https://BENUTZERNAME.github.io/REPONAME/`. Nach Updates im Browser Strg+F5.
- **Für Entwickler:** Nach Änderungen an den Dateien in `sw.js` die `VERSION` hochzählen, damit installierte Apps aktualisieren.

## Neu gegenüber Weitzboard

- **Textebene:** Werkzeug *Text* (Taste T) – Klick setzt ein Textfeld, tippen oder Strg+V. Strg+V ohne aktives Textfeld legt Text aus der Zwischenablage als neues Textfeld ab (Bilder als Bild). Doppelklick im Auswahlmodus bearbeitet. Texte liegen immer über der Zeichnung, lassen sich auswählen, verschieben, skalieren, einfärben.
- **Formeln:** `$…$` im Text, `$$…$$` abgesetzt; `\$` für ein normales Dollarzeichen.
- Wiederholen (Y / Strg+Y), Radierer (ab v7.7 zwei: Linienradierer D / Objektradierer Shift+D, Stift-Radiertaste = Linienradierer), Alles auswählen (Strg+A), Drag & Drop von Bildern/SVGs/Text.
- Speichern überschreibt dieselbe Datei (Chrome/Edge), Shift+S = Speichern unter.
- Fremde SVG-Dateien werden beim Öffnen als Bild eingefügt (ab v7: als bearbeitbare Elemente).

## Version 2

- **Schreibgitter** (Taste G / Panel „Seite → Gitter“): aus → Linien → Karos. Reine Anzeige, wird weder gedruckt noch gespeichert/exportiert; die Einstellung merkt sich der Browser.
- **PDF-Seiten importieren** (Taste I / Panel „Seite → PDF-Seiten“ / PDF auf die Fläche ziehen): Vorschau aller Seiten, Auswahl per Klick oder Bereich („1-3, 5“). Jede gewählte Seite wird unter dem bisherigen Inhalt angehängt, belegt die linke Hälfte der Breite, und die Fläche wird pro Seite nach unten verlängert. Seiten werden als Bild (JPEG) eingebettet.

## Version 3 – Druck / PDF-Export

- **Seitenweiser Druck:** Vor dem Drucken zerlegt TERBiBOARD die Fläche selbst in A4-Seiten (10 mm Rand). Liegt an einem Umbruch ein Bild, Text oder Strich, rückt der Umbruch nach oben an dessen Oberkante (höchstens bis zur halben Seite; sonst harter Schnitt). Leere Seiten am Ende werden nicht gedruckt.
- **Echte Seitenlinien:** Die gestrichelten Linien mit „Seite n“ zeigen genau diese Umbrüche (nur Anzeige).
- **Format Hoch/Quer** (Panel „Seite → Format“): wird mit der Datei gespeichert; der Druckdialog übernimmt das Format automatisch.
- **PDF-Import passend zum Format:** Hochformat – Seiten werden nie über einen Umbruch gelegt (zwei pro Druckseite). Querformat – jede PDF-Seite beginnt auf einer neuen Druckseite, links, rechts daneben Schreibraum.

## Version 4 – nachträglich für den Druck optimieren

- **Für Druck anordnen** (Taste A / Panel „Seite“): Der Inhalt wird in waagerechte Blöcke zerlegt (alles, was sich in der Höhe überschneidet, bleibt zusammen – z. B. PDF-Seite plus Notizen daneben). Ein Block, den ein Umbruch schneiden würde, rutscht samt allem darunter an den nächsten Seitenanfang; ist die aktuelle Seite noch leer, wird er an deren Anfang hochgezogen. Blöcke bis 150 % Seitenhöhe werden auf Seitenhöhe verkleinert, noch größere bleiben unverändert (werden geschnitten). Ein Undo-Schritt.
- **Formatwechsel ordnet automatisch neu an** (Hoch ↔ Quer), zusammen mit dem Wechsel ein einziger Undo-Schritt (Z stellt Format und Anordnung wieder her).
- **Feste Umbrüche** (Taste U / Panel „Fester Umbruch“): Klick setzt eine rote Umbruchlinie, Klick auf eine vorhandene entfernt sie. Werden mit der Datei gespeichert (`data-breaks`), beim Druck erzwungen und beim Anordnen mitverschoben.

## Version 6 – Zweites Fenster

- **Zweites Fenster** (Taste F ab v8.5 / Panel „Extras“): öffnet TERBiBOARD ein zweites Mal (z. B. für den Beamer/zweites Display). Beide Fenster sind live gekoppelt und bearbeitbar; übertragen werden nur neue/geänderte Elemente. Funktioniert auch bei lokal geöffneter `index.html` (Kopplung per `postMessage`).
- **Scrollen koppeln** (Panel „Extras“, bis v8.6 „Ansicht folgen“): Beide Fenster zeigen immer dieselbe Stelle oben links – in beide Richtungen, egal in welchem Fenster gescrollt wird, auch bei unterschiedlicher Fenstergröße. Ab v8.7 beim Öffnen des zweiten Fensters automatisch an; Ein-/Ausschalten wirkt auf beide Fenster.
- Rückgängig/Wiederholen wirkt auf den gemeinsamen Stand. Backups und die Warnung vor ungespeicherten Änderungen übernimmt das Hauptfenster.
- **Live-Text** (ab v8.6): Was in ein Textfeld getippt wird, erscheint sofort als Vorschau im anderen Fenster; Striche erscheinen beim Absetzen.

## Version 7 – Textbreite & SVG-Tafelbilder

- **Textfeld mit fester Breite:** Im Text-Werkzeug ein Feld *aufziehen* → die Breite bleibt fest, der Text bricht automatisch um (auch beim Einfügen aus der Zwischenablage). Ein einfacher Klick erzeugt wie bisher ein Feld ohne Umbruch. Bei einem einzeln ausgewählten Textfeld ändern die runden Seitengriffe links/rechts die Breite (auch nachträglich für Felder ohne feste Breite). Gespeichert als `data-tw`.
- **Fremde SVG als Tafelbild:** Öffnen (O) oder Hineinziehen einer normalen SVG wandelt sie in echte, bearbeitbare Board-Elemente um: Linien/Pfade/Kreise/Rechtecke → Striche (Farbe und Strichstärke bleiben), `<text>` → Textfelder (mehrzeilig über `<tspan>`, `$…$` wird als Formel gesetzt), eingebettete PNG/JPEG → Bilder. Auf einem leeren Board füllt das Bild die volle Breite, sonst wird es eingefügt. Als unveränderliches Bild weiterhin über „Bild einfügen“ (P).

### Regeln für SVGs, die als Tafelbild geöffnet werden sollen (z. B. von einer KI erzeugt)

- `viewBox` setzen (Breite ca. 1200), weißer Hintergrund darf vorhanden sein (wird ignoriert).
- Alles als Linien mit `stroke` zeichnen: `line`, `polyline`, `path`, `circle`, `ellipse`, `rect`; Farben bevorzugt aus der Board-Palette (#000000, #CC6677, #882255, #117733, #88CCEE, #332288, #999933, #DDCC77).
- Pfeilspitzen als eigene kurze Linien, **keine** `marker`; Füllflächen werden nur als Umriss übernommen; Strichelung geht verloren.
- Beschriftungen als `<text>`, mehrzeilig mit `<tspan x=… dy=…>`; Formeln als `$…$` (LaTeX).

## Version 8 – neues Menü im TERBi-Design

- **Farbthema nach dem TERBi-Teaching-Logo:** Logo und Schriftzug „TERBiBOARD“ im Panel-Kopf; Panel hellgrün, Akzente dunkelgrün (#186238), Hover/Rahmen hellgrün (#89b555/#c7e2a1). Auswahlrahmen, Griffe, Textfeld-Rahmen, Seitenlinien, Dialoge und Meldungen ebenfalls im Grün.
- **Neue Menüstruktur** (nach Häufigkeit): Kopf mit Speichern/Öffnen/Einklappen · Werkzeug-Kacheln (Stift, Auswahl, Text, Linien-/Objektradierer) · Farben · drei feste Strichstärken (fein 1,5 · mittel 3 · Textmarker 9; bei Auswahl auf gewählte Striche) · Schriftgröße · Rückgängig/Wiederholen/Löschen · aufklappbare Gruppen *Auswahl bearbeiten* (öffnet sich automatisch bei Auswahl), *Einfügen*, *Seite & Druck*, *Datei*, *Extras*. Offene Gruppen werden gemerkt.
- Eingeklappt: schmale Leiste mit Logo, Werkzeugen, Farben und Rückgängig.
- Tastenkürzel unverändert (Ausnahme ab v8.5: F = zweites Fenster statt Glätten).

## Version 8.2 – 8.7 – Schreiben, Textmarker, Live-Text, Scrollen

- **Flüssiges, formtreues Schreiben** (v8.2): Striche werden beim Schreiben bereits in ihrer endgültigen Form gespeichert – nichts „springt“ nach dem Absetzen; Anzeige einmal pro Bildschirmbild, lange Striche in Abschnitten.
- **Textmarker** (v8.3, Breite 9 ab v8.5): dritte Stärke-Stufe, halbtransparent (45 %, multipliziert mit dem Untergrund), Symbol als breiter, schräger, halbtransparenter Balken. Gespeichert als `data-hl`.
- **Kein Stiftdruck** (v8.4): alle Stifte zeichnen in gleichmäßiger Breite.
- **Taste F** (v8.5): öffnet das zweite Fenster; *Glätten* nur noch über „Auswahl bearbeiten → Glätten“.
- **Live-Text im zweiten Fenster** (v8.6): Vorschau beim Tippen (max. ca. 10 kleine Nachrichten/s), nicht im Rückgängig-Verlauf, wird nie gespeichert.
- **Gekoppeltes Scrollen** (v8.7): beim Öffnen des zweiten Fensters automatisch an, in beide Richtungen.
- **Startanimation** (v7.3–7.5, Logo ab v8.1): Logo und handgeschriebener Schriftzug in Grün/Schwarz, max. 6 s oder bis Klick/Taste.

## Version 8.8 – SVG-Code anzeigen

- **SVG-Code** (Panel „Datei → SVG-Code“): zeigt den Code des Tafelbilds in einem Fenster zum Ansehen und Kopieren. Umschalter *Klein* (wie „Export klein“, ohne Bearbeitungsdaten – zum Weitergeben, z. B. an eine KI) oder *Vollständig* (wie die gespeicherte Datei, in TERBiBOARD wieder bearbeitbar). Knopf *Kopieren* legt den ganzen Code in die Zwischenablage (Ersatzweg, falls die Zwischenablage gesperrt ist). Sehr lange Codes (über ca. 1,5 Mio. Zeichen, z. B. mit PDF-Seiten) werden im Fenster gekürzt angezeigt, kopiert wird trotzdem alles. Schreibgitter ist nie enthalten.

## Version 8.9 – Handbuch & Release

- **Handbuch** `handbuch.html`: ausführliche Anleitung in 13 Kapiteln (Start, Oberfläche, Schreiben, Text & Formeln, Auswahl, Radieren, Einfügen, Seite & Druck, Speichern, zweites Fenster, alle Tastenkürzel, Tipps, Lizenz & Dank). Aufruf über den grünen Link oben in der Hilfe (F1); in der Einzeldatei eingebettet. Wird vom Service Worker offline mitgespeichert.
- Urheberangabe überall einheitlich **DocTERBi (TERBi Teaching)**.

## Version 9.0 – kleinere Dateien mit Bildern

- **Bildgröße beim Einfügen:** Große Rasterbilder (über 800 px oder 200 KB) öffnen einen Dialog mit den Stufen *Original*, *Groß* (1920 px), *Mittel* (1280 px), *Klein* (800 px) samt berechneter Dateigröße. Die Anzeigegröße auf der Tafel bleibt gleich. „Auswahl merken“ speichert die Stufe; der Knopf *Einfügen → Bildgröße* schaltet zwischen „fragen“ und festen Stufen um (Einstellung `wb2.imgq`).
- **Passendes Format:** Bilder mit Transparenz werden PNG, sonst gewinnt die kleinere Fassung aus JPEG (Qualität 0,82) und PNG. Das Ergebnis ist nie größer als das Original; kleine Bilder werden nur bei echtem Gewinn (> 10 %) umkodiert. GIF und SVG bleiben unverändert.
- **Doppelte Bilder nur einmal:** Beim Speichern, „Export klein“, SVG-Code und Backups steht ein mehrfach verwendetes Bild nur einmal in der Datei (`<symbol>` in `<defs>`, Verwendungen als `<use class="i">`). Ältere Versionen (bis 8.9) zeigen solche Dateien korrekt an, übernehmen beim Öffnen aber nur die einfach vorkommenden Bilder.
- **Bilder verkleinern** (*Einfügen → Bilder verkleinern*): rechnet alle Bilder und PDF-Seiten auf die angezeigte Größe ×2 herunter (mind. 400 px), nur bei mindestens 15 % Ersparnis, mit Rückfrage und rückgängig machbar.
- **PDF-Import mit Qualitätswahl:** *Hoch* (bisher: max. 1800 px, JPEG 0,85), *Mittel* (max. 1300 px, 0,8, voreingestellt), *Klein* (max. 900 px, 0,72); Einstellung `wb2.pdfq`. Je Seite wird die kleinere Fassung aus JPEG und PNG gespeichert (reine Textseiten werden als PNG meist kleiner und schärfer). Nach dem Import zeigt die Meldung die Größe der Seiten.

## Version 9.1 – Textrahmen

- **Textrahmen** (Knopf ▢ neben A⁻/A⁺, Taste M): Textfeld mit Rahmen in der Schriftfarbe und sehr blassem Hintergrund in derselben Farbe (8 % Deckkraft), abgerundete Ecken, Innenabstand. Rahmenstärke, Abstand und Rundung wachsen mit der Schriftgröße.
- Wirkt auf das gerade bearbeitete Textfeld (bei einem neuen Feld zugleich als Voreinstellung für die folgenden), sonst auf alle ausgewählten Textfelder – auch nachträglich in älteren Tafelbildern, mehrere auf einmal –, sonst als Voreinstellung für neue Textfelder (Einstellung `wb2.frame`). Farbwechsel färbt Rahmen und Hintergrund mit; rückgängig machbar; Live-Vorschau im zweiten Fenster mit Rahmen.
- Gespeichert als `data-b="1"` am Textfeld; der Stil steht im SVG selbst, daher auch in „Export klein“, SVG-Code und Druck sichtbar. Ältere Versionen (bis 9.0) öffnen solche Dateien ohne Fehler, zeigen die Felder aber ohne Rahmen.

## Version 9.2 – eigene Tasten für Stift und Auswahl

- **S = Stift, A = Auswahl** (die Leertaste wechselt weiterhin zwischen beiden).
- Dafür umbelegt: **Speichern** nur noch mit **Strg+S**, **Speichern unter** mit **Strg+Shift+S**; **Für Druck anordnen** liegt jetzt auf **N** (vorher A). Kurzhilfe, Handbuch und Knopf-Tooltips angepasst.

## Version 9.3 – feste Breite und Zoom

- **Feste Breite:** Neue Boards sind immer 1460 Einheiten breit (wie die Tafelbilder), statt die Fensterbreite beim Anlegen zu übernehmen. Dadurch sehen alle neuen Boards auf demselben Bildschirm gleich groß aus und werden gleich gedruckt. Ältere Boards behalten ihre gespeicherte Breite.
- **Zoom (nur Anzeige):** Zeile „Zoom“ im Panel (− / + / ↔ Einpassen), Strg+Mausrad bzw. Touchpad-Spreizen, Strg++ / Strg+− / Strg+0, Zwei-Finger-Zoom auf dem Tablet. Bereich 50–200 %, 100 % = Fensterbreite. Unter 100 % steht die Tafel mittig, darüber ist sie auch waagerecht scrollbar (Finger-Scrollen ebenfalls in beide Richtungen). Der Punkt unter Maus bzw. Fingern bleibt beim Zoomen stehen.
- Der Zoom wird pro Gerät gemerkt (`wb2.zoom`, im zweiten Fenster getrennt `wb2.zoom.m`), nie in der Datei. „Scrollen koppeln“ arbeitet mit Board-Koordinaten und funktioniert daher auch bei unterschiedlichem Zoom.
- **Druck:** Der Zoom hat keinen Einfluss. Durch die feste Breite entspricht Schriftgröße 28 auf Papier im Hochformat etwa 10 pt, im Querformat etwa 15 pt.

## Version 9.4 – SVG-Code als Bild

- **SVG-Code einfügen** (Panel „Einfügen → SVG-Code als Bild“, Taste **Shift+P**): Fenster mit Textfeld, in das SVG-Code hineinkopiert wird – auch samt ```` ```svg ````-Zeilen aus einem KI-Chat. *Einfügen* bzw. Strg+Enter legt ihn als normales Bild auf die Tafel (verschieben, skalieren, kopieren wie jedes Bild; nicht strichweise bearbeitbar). Fehlerhafter Code wird im Fenster gemeldet, das Fenster bleibt dann offen.
- **Strg+V:** Besteht der Text in der Zwischenablage nur aus SVG-Code, wird er ebenfalls als Bild eingefügt statt als Textfeld (gilt auch für den Panel-Knopf „Aus Zwischenablage“).
- **Aufbereitung:** Fehlende `xmlns`-Angaben werden ergänzt, fehlende Höhe bzw. Breite aus der `viewBox` berechnet (fehlt die `viewBox`, wird sie aus Breite/Höhe gebildet), Skripte und `on…`-Attribute entfernt. Ohne eigene Vorgabe verzerrt das Bild beim freien Skalieren wie ein Rasterbild. Gespeichert wird es wie eine eingefügte SVG-Datei (Base64 im `href`), daher lesen auch ältere Versionen solche Boards.

## Version 9.5 – HTML-Seite einfügen

- **HTML-Seite** (Panel „Einfügen → HTML-Seite“, Taste **Shift+I**, oder .html/.htm-Datei auf die Tafel ziehen): Die Seite wird wie eine PDF-Seite unter dem bisherigen Inhalt in die linke Hälfte gesetzt (Satzbreite = halbe Board-Breite, 730 px), im Querformat ab einer neuen Druckseite. Ist sie länger als der Platz auf der Druckseite, wird sie auf mehrere Abschnitte verteilt – je Druckseite einer; geschnitten wird nur zwischen Zeilen bzw. Bildern. Die Fläche wird bis zum Ende der letzten Druckseite verlängert.
- **Lebendes HTML statt Bild:** Jeder Abschnitt ist ein `<foreignObject class="h">` mit dem bereinigten HTML (Datenmodell `{t:'h', x, y, w, h, bw, oy, oh, html}`: bei Breite `bw` gesetzt, Ausschnitt ab `oy` mit Höhe `oh`, per CSS-Transform auf `w×h` skaliert). Text bleibt in jeder Zoomstufe und im Druck scharf; verschieben, skalieren, kopieren und mit dem Objektradierer löschen wie ein Bild. Abschnitte sind für Zeiger durchlässig (darauf schreiben geht normal), Links nicht anklickbar.
- **Bereinigung:** Skripte, `<iframe>/<object>/<embed>`, `<link>`/`<meta>`/`<base>`, Kommentare, `on…`-Attribute, `javascript:`-Links und in XML ungültige Attributnamen werden entfernt. Das CSS aus `<style>` wird auf eine eigene Klasse (`wbh-…`) begrenzt (`html`/`body` → diese Klasse), Medienabfragen werden einmal für die Satzbreite ausgewertet und fest übernommen, `@page`/`@import` fallen weg. Zeichensatz aus BOM bzw. `<meta charset>`.
- **Bilder:** eingebettete (`data:`) und Internet-Bilder bleiben; relative Bilder werden durch gleichnamige, im Dateifenster mit ausgewählte Bilddateien ersetzt (als Base64), sonst weggelassen (Hinweis mit Anzahl).
- **Dateigröße:** Jeder Abschnitt enthält das vollständige HTML (einfach und robust; mehrere Abschnitte = mehrfacher HTML-Text). Ältere Versionen (bis 9.4) lassen HTML-Abschnitte beim Öffnen weg.

## Version 9.6 – HTML aus der Zwischenablage, als Bild kopieren

- **HTML aus der Zwischenablage** (Taste **Strg+Shift+V**, Panel „Einfügen → HTML aus Zwischenablage“): setzt den Inhalt der Zwischenablage wie eine HTML-Datei (v9.5) in die linke Hälfte. Steht HTML-Quelltext als Text in der Zwischenablage (beginnt mit `<!doctype`, `<html>`, `<head>`, `<body>` oder `<style>`, auch mit ```` ```html ````-Zeilen aus einem KI-Chat), wird der Quelltext gesetzt; sonst der kopierte formatierte Inhalt (`text/html`); sonst ein HTML-Schnipsel im Text. Normales Strg+V bleibt unverändert (Text → Textfeld). Technik: Strg+Shift+V merkt sich den Tastendruck, das folgende `paste`-Ereignis wird als HTML behandelt; liefert es kein HTML (Chrome entfernt es bei Strg+Shift+V teils), wird die Zwischenablage über `navigator.clipboard.read()` gelesen (Browser fragt einmal nach der Erlaubnis). Der Panel-Knopf nutzt immer diesen Weg.
- **Als Bild kopieren** (Taste **Shift+C**, Panel „Datei → Als Bild kopieren“): Auswahl, sonst der ganze Inhalt, auf den Inhalt zugeschnitten (12 Einheiten Rand), doppelte Auflösung (bei sehr großen Flächen automatisch weniger, Grenze 16000 px bzw. 120 Mio. Pixel), weißer Hintergrund, ohne Auswahlrahmen, Seitenlinien und Gitter. Browser erlauben in der Zwischenablage nur PNG (`ClipboardItem` mit `image/png`) – beim Einfügen in andere Programme ist das ein normales Bild. Ist die Zwischenablage nicht verfügbar, wird das Bild als JPG (Qualität 90 %) heruntergeladen. Internet-Bilder in HTML-Abschnitten fehlen im Bild (der Browser lädt sie beim Umrechnen nicht nach).
- `importHtmlFiles` ruft jetzt die gemeinsame Funktion `importHtmlText` auf (Datei und Zwischenablage).

## Version 9.7 – keine automatische Glättung

- Striche werden ohne die automatische Eckenrundung (Chaikin, seit v7.6 auf ~1,5 Einheiten begrenzt) dargestellt: Der Umriss folgt exakt den gezeichneten Punkten. Kleine Druckbuchstaben behalten damit ihre Ecken. Gilt auch für ältere Boards beim Öffnen (die gespeicherten Punkte sind unverändert, nur die Darstellung).
- „Auswahl bearbeiten → Glätten“ (manuell) bleibt unverändert.

## Version 9.8 – Hinweis für Tafeln, SVG per Doppelklick öffnen

- **Hinweis für interaktive Tafeln** in Handbuch (Start, Tipps) und README: Chrome/Edge statt Firefox, sonst fehlen bei kleiner Schrift Strichanfänge (Ursache: verzögerte Stiftmeldungen im Browser, nicht das Board).
- **SVG-Dateien direkt öffnen:** `manifest.webmanifest` hat jetzt `file_handlers` für `image/svg+xml` (`.svg`, `launch_type: multiple-clients` = je Datei ein Fenster). `app.js` nimmt die Datei über `launchQueue` entgegen und lädt sie mit `loadText(text, name, handle)` – mit Dateizugriff, Strg+S speichert also in dieselbe Datei. Fremde SVGs werden wie bisher importiert (ohne Dateizugriff, kein Überschreiben). Bei ungespeicherten Änderungen wird nachgefragt; im zweiten Fenster (`#mirror`) passiert nichts.
- Nur wirksam in der installierten App (Chrome/Edge, über https). Lokale `index.html` und Einzeldatei: unverändert.

## Version 9.9 – Textfelder bleiben offen, Standard-Stiftstärke mittel

- **Textfeld bleibt offen:** Das automatische Backup (alle 2 Minuten) hat bisher ein gerade bearbeitetes Textfeld abgeschlossen; weitere Tasten lösten dann Befehle aus (z. B. S = Stift, A = Auswahl). Jetzt wird das Auto-Backup verschoben, solange ein Textfeld offen ist, und direkt nach dem Abschließen des Felds nachgeholt. Manuelles Backup (Strg+B) und Backup beim Schließen unverändert.
- **Standard-Stiftstärke mittel (3):** beim Start, bei „Neu“, beim Öffnen einer Datei oder eines Backups und wenn eine fremde SVG als Tafelbild übernommen wird. Ein eingeschalteter Textmarker wird dabei zurückgesetzt.

## Lizenz

- TERBiBOARD ist freie Software unter der **GNU General Public License v3.0** (`GPL-3.0-only`): Jede und jeder darf das Board nutzen, kopieren, verändern und weitergeben. Bedingungen: Copyright- und Lizenzhinweise bleiben erhalten (Herkunft wird genannt), und veränderte Fassungen werden ebenfalls unter der GPL-3.0 mit Quelltext weitergegeben. Keine Gewährleistung.
- **Ausgenommen:** Name und Logo „TERBi Teaching“ (`logo.png`, App-Icons) – wer eine veränderte Fassung verbreitet, ersetzt Logo und Namen.
- Drittanbieter: KaTeX (MIT), PDF.js (Apache-2.0) – beide mit der GPL-3.0 vereinbar, Texte in `THIRD-PARTY-LICENSES.txt`.

## Änderungsprotokoll

- **v9.9 (2026-11-04):** Auto-Backup schließt kein offenes Textfeld mehr (wird verschoben und danach nachgeholt); Stiftstärke beim Start, bei „Neu“ und beim Öffnen immer „mittel“ (3). README ohne lokale Pfade und interne Arbeitsabläufe. Handbuch angepasst. Einzeldatei neu erzeugt.
- **v9.8 (2026-11-02):** Hinweis „Chrome/Edge an interaktiven Tafeln“ (Handbuch, README); installierte App öffnet .svg-Dateien per Doppelklick/„Öffnen mit“ (`file_handlers` im Manifest, `launchQueue` in `app.js`). Einzeldatei neu erzeugt.
- **v9.7 (2026-11-02):** Automatische Glättung der Striche abgeschaltet (Druckschrift in kleiner Größe wurde verrundet); Funktion `chaikin` bleibt im Code, wird aber nicht mehr aufgerufen. Einzeldatei neu erzeugt.
- **v9.6 (2026-11-02):** HTML aus der Zwischenablage (Strg+Shift+V, Panel „Einfügen → HTML aus Zwischenablage“) und „Als Bild kopieren“ (Shift+C, Panel „Datei“; PNG in die Zwischenablage, sonst JPG-Download). Hilfe, Handbuch angepasst. Einzeldatei neu erzeugt.
- **v9.5 (2026-11-02):** HTML-Seite einfügen: Panel „Einfügen → HTML-Seite“ bzw. Shift+I oder Datei hineinziehen; linke Hälfte, je Druckseite ein Abschnitt, als lebendes HTML (`<foreignObject>`) mit begrenztem CSS. Hilfe, Handbuch angepasst. Einzeldatei neu erzeugt.
- **v9.4 (2026-10-29):** SVG-Code als Bild einfügen: Panel „Einfügen → SVG-Code als Bild“ bzw. Shift+P (Fenster mit Textfeld, ```svg-Zeilen erlaubt), reiner SVG-Code in der Zwischenablage wird mit Strg+V zum Bild. Hilfe, Handbuch angepasst. Einzeldatei neu erzeugt.
- **v9.3 (2026-10-21):** Neue Boards mit fester Breite 1460; Zoom 50–200 % nur für die Anzeige (Panel, Strg+Mausrad, Strg++/−/0, Zwei-Finger-Zoom), waagerechtes Scrollen über 100 %. Hilfe, Handbuch angepasst. Einzeldatei neu erzeugt.
- **v9.2 (2026-10-21):** Tastenkürzel S = Stift, A = Auswahl; Speichern nur noch Strg+S / Strg+Shift+S, „Für Druck anordnen“ auf N. Hilfe, Handbuch, Tooltips angepasst. Einzeldatei neu erzeugt.
- **v9.1 (2026-10-21):** Textrahmen für Textfelder (Knopf ▢, Taste M; Rahmen in Schriftfarbe, blasser Hintergrund), auch nachträglich für ausgewählte Felder. Hilfe und Handbuch ergänzt. Einzeldatei neu erzeugt.
- **v9.0 (2026-10-20):** Kleinere Dateien mit Bildern: Größenwahl beim Einfügen (Dialog bzw. feste Stufe), automatische Wahl JPEG/PNG, mehrfach verwendete Bilder nur einmal in der Datei, Knopf „Bilder verkleinern“, Qualitätswahl beim PDF-Import (Standard „Mittel“). Hilfe und Handbuch ergänzt. Einzeldatei neu erzeugt.
- **v8.9 (2026-10-19):** Handbuch `handbuch.html` ergänzt und in der Hilfe verlinkt (auch in der Einzeldatei). Urheberangabe in allen Dateien auf „DocTERBi (TERBi Teaching)“ umgestellt. Dank an Prof. Dr. Edmund Weitz in README, Hilfe und Handbuch. Service Worker cacht das Handbuch. Einzeldatei neu erzeugt.
- **v8.8 (2026-10-17):** Neuer Knopf „SVG-Code“ (Gruppe *Datei*): Fenster mit dem SVG-Code des Tafelbilds, wahlweise klein oder vollständig, mit Kopieren-Knopf; Eintrag in der Hilfe. Einzeldatei mitgezogen.
- **v8.7 (2026-10-17):** Scrollen der beiden Fenster gekoppelt: beim Öffnen des zweiten Fensters automatisch an, wirkt in beide Richtungen (dieselbe Stelle oben links, auch bei unterschiedlicher Fenstergröße). Schalter heißt jetzt „Scrollen koppeln“ und gilt für beide Fenster gemeinsam; Rückkopplungsschutz gegen Hin-und-her-Scrollen.
- **v8.6 (2026-10-17):** README-Funktionsteil auf den aktuellen Stand gebracht (Abschnitt „Version 8.2 – 8.6“, Dateiformat, Radierer, Taste F). Live-Text im zweiten Fenster: Während getippt wird, erscheint der Text im anderen Fenster sofort als Vorschau (Umbruch, Farbe, Größe, Formeln), höchstens ca. 10 kleine Nachrichten pro Sekunde. Die Vorschau gehört nicht zum gemeinsamen Stand und nicht zum Rückgängig-Verlauf; beim Abschließen ersetzt sie das fertige Textfeld. Wird nie mitgespeichert. Striche erscheinen weiterhin beim Absetzen.
- **v8.5 (2026-10-17):** Taste **F** öffnet jetzt das zweite Fenster (Glätten nur noch über „Auswahl bearbeiten → Glätten“). Textmarker 50 % breiter (Stärke 9 statt 6); bereits gezeichnete Markierungen bleiben unverändert.
- **v8.4 (2026-10-17):** Kein Stiftdruck mehr: Alle Stifte zeichnen in gleichmäßiger Breite, unabhängig vom Andruck. Bereits gezeichnete Striche behalten ihre Form.
- **v8.3 (2026-10-17):** Stärke-Stufe 3 ist jetzt ein **Textmarker**: halbtransparent (45 %, multipliziert mit dem Untergrund, darunterliegende Schrift bleibt lesbar), gleichmäßige Breite ohne Druckabhängigkeit; Symbol im Menü als breiter, schräger, halbtransparenter Balken. Nur Stufe 3 betroffen; Stufen 1 und 2 sowie +/− unverändert. Wird mit der Datei gespeichert (`data-hl`).
- **v8.2 (2026-10-17):** Schreiben deutlich flüssiger und formtreu: Striche werden beim Schreiben schon in ihrer endgültigen Form gespeichert (keine nachträgliche Ausdünnung mehr → die Form „springt“ nach dem Absetzen nicht mehr); Anzeige nur noch einmal pro Bildschirmbild, lange Striche in festen Abschnitten (Rechenzeit beim Schreiben ca. 80× geringer); vorhergesagte Stiftpunkte verringern die gefühlte Verzögerung.
- **v8.1-E (2026-10-16):** Erste Einzeldatei-Fassung (PDF.js eingebettet, Worker im Hauptthread). Programmcode unverändert.
- **v8.1 (2026-10-16):** Lizenz GPL-3.0 (Dateien `LICENSE`, `THIRD-PARTY-LICENSES.txt`, Lizenzköpfe in den Quelldateien, Impressum mit Logo im Hilfe-Fenster). Logo in der Startanimation und als App-Icon (192/512/maskable). Untertitel der Startanimation: „© TERBi Teaching ☺ · freie Bildungsressource (GPL-3.0)“.

- **v8 (2026-10-16):** Menü neu strukturiert, Farbthema nach dem TERBi-Teaching-Logo, `logo.png` neu.

- **v7.7 (2026-10-16):** Zwei Radierer: **Linienradierer** (D, Panel „Linienradierer“, Stift-Radiertaste) löscht nur Striche; **Objektradierer** (Shift+D, Panel „Objektradierer“) löscht nur Textfelder, Bilder und PDF-Seiten.
- **v7.6 (2026-10-16):** Fix: Glättung rundet Ecken nur noch um max. ~1,5 Einheiten ab – Rechtecke, Pfeile und importierte Formen behalten scharfe Ecken (Handschrift bleibt glatt).
- **v7.5 (2026-10-15):** Startanimation in Grün und Schwarz: „TERBi“ und Unterstreichung grün (#117733), „BOARD“ schwarz.
- **v7.4 (2026-10-15):** Startanimation: Schriftzug bleibt nach dem Schreiben stehen, bis geklickt (oder eine Taste gedrückt) wird – höchstens 6 Sekunden.
- **v7.3 (2026-10-15):** Startanimation: TERBiBOARD wird in Handschrift geschrieben und unterstrichen (ca. 2 s, reines CSS/SVG in `index.html`/`style.css`). Klick oder Taste überspringt (die Taste löst dabei keinen Befehl aus); im zweiten Fenster und beim Drucken nicht sichtbar; bei „Bewegung reduzieren“ nur kurz statisch.
- **v7.2 (2026-10-15):** Standard-Strichstärke des Stifts 1,5 (vorher 3).
- **v7.1 (2026-10-15):** Text-Werkzeug: auch der Finger zieht Textfelder auf (statt zu scrollen), deutlichere Vorschau beim Aufziehen. Service Worker lädt Dateien immer frisch vom Server (kein veralteter Browser-Cache).
- **v7 (2026-10-15):** Textfelder mit fester Breite und Umbruch, Breite per Seitengriff änderbar; fremde SVGs werden als bearbeitbares Tafelbild übernommen.

- **v6 (2026-10-15):** Zweites, live gekoppeltes Fenster mit „Ansicht folgen“.

- **v5 (2026-10-15):** Umbenennung in **TERBiBOARD** (Titel, Panel, Hilfe, App-Name, Dateinamen `terbiboard_…svg`). Dateiformat, Einstellungen und Backups bleiben kompatibel.

- **v4 (2026-10-15):** Für Druck anordnen, automatisches Neuanordnen beim Formatwechsel, feste Umbrüche.

- **v3 (2026-10-15):** Seitenweiser Druck mit intelligenten Umbrüchen, Hoch-/Querformat, formatgerechter PDF-Import.

- **v2 (2026-10-15):** Schreibgitter, PDF-Import.
- **v1 (2026-10-15):** Erste Fassung (Neuentwicklung mit Textebene und Formeln).

## Dateiformat

SVG mit Bearbeitungsdaten (`data-wb2` am Wurzelelement, dazu `data-fmt` = Hoch/Quer und `data-breaks` = feste Umbrüche; Striche als `path.s` mit `data-pts` = x,y,Druck und `data-w` = Stärke, Textmarker zusätzlich `data-hl`; Texte als `foreignObject.t` mit `data-txt`, `data-s`, `data-c`, feste Breite `data-tw`; Bilder als `image.i`). Solche Dateien lassen sich vollständig wieder öffnen und bearbeiten.
*Export klein* entfernt die Bearbeitungsdaten → nur zum Weitergeben.

## Bekannte Grenzen

- Bilder werden beim Drehen (R/L) nur versetzt, nicht gedreht.
- Formeln nutzen MathML; Safari/Firefox stellen sie leicht anders dar als Chrome.
- Importierte PDF-Seiten vergrößern die SVG-Datei (ca. 150–300 KB pro Seite).
- Zweites Fenster: Ein gerade entstehender Strich erscheint im anderen Fenster erst beim Absetzen (Text dagegen live ab v8.6). Wird das Hauptfenster neu geladen, muss das zweite Fenster neu geöffnet werden.
- Backups liegen im Browser (localStorage, ca. 5 MB) – große Bilder verdrängen ältere Backups.
