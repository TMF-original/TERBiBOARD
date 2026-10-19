# TERBiBOARD (Version 8.9, Stand 2026-10-19)

Eigenständiges Whiteboard nach dem Vorbild von Weitzboard, komplett neu geschrieben (kein Original-Code).
© 2026 DocTERBi (TERBi Teaching) ☺ · freie Bildungsressource unter der **GNU General Public License v3.0** (`GPL-3.0-only`, siehe `LICENSE`).

**Dank:** Ein herzliches Dankeschön an **Prof. Dr. Edmund Weitz**, dessen Weitzboard Vorbild und Inspiration für TERBiBOARD war. 

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
- **Lokal:** `index.html` per Doppelklick öffnen funktioniert ebenfalls, nur ohne Installation/Offline-Cache.

## Neu gegenüber dem Fork

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

### Regeln für SVGs, die als Tafelbild geöffnet werden sollen (z. B. von Claude erzeugt)

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
- Neuer Ordner `Weitzboarder\Release\` mit allen Dateien für GitHub Pages.

## Lizenz

- TERBiBOARD ist freie Software unter der **GNU General Public License v3.0** (`GPL-3.0-only`): Jede und jeder darf das Board nutzen, kopieren, verändern und weitergeben. Bedingungen: Copyright- und Lizenzhinweise bleiben erhalten (Herkunft wird genannt), und veränderte Fassungen werden ebenfalls unter der GPL-3.0 mit Quelltext weitergegeben. Keine Gewährleistung.
- **Ausgenommen:** Name und Logo „TERBi Teaching“ (`logo.png`, App-Icons) – wer eine veränderte Fassung verbreitet, ersetzt Logo und Namen.
- Drittanbieter: KaTeX (MIT), PDF.js (Apache-2.0) – beide mit der GPL-3.0 vereinbar, Texte in `THIRD-PARTY-LICENSES.txt`.

## Änderungsprotokoll

- **v8.9 (2026-10-19):** Handbuch `handbuch.html` ergänzt und in der Hilfe verlinkt (auch in der Einzeldatei). Urheberangabe in allen Dateien auf „DocTERBi (TERBi Teaching)“ umgestellt. Dank an Prof. Dr. Edmund Weitz in README, Hilfe und Handbuch. Service Worker cacht das Handbuch. Neuer Ordner `Weitzboarder/Release/` mit allen Dateien zum Hochladen. Einzeldatei neu erzeugt (Vorgänger in `Einzeldatei/_versionen/TERBiBOARD_v8.8_2026-10-17.html`). Vorgängerstand v8.8 unverändert im Ordner `../TERBiBOARD_v8.8_2026-10-17/` (plus ZIP).
- **v8.8 (2026-10-17):** Neuer Knopf „SVG-Code“ (Gruppe *Datei*): Fenster mit dem SVG-Code des Tafelbilds, wahlweise klein oder vollständig, mit Kopieren-Knopf; Eintrag in der Hilfe. Einzeldatei-Fassung `Einzeldatei/TERBiBOARD.html` gleich mitgezogen (Vorgänger in `Einzeldatei/_versionen/TERBiBOARD_v8.7_2026-10-17.html`). Vorgängerstand v8.7 unverändert im Ordner `../TERBiBOARD_v8.7_2026-10-17/` (plus ZIP).
- **v8.7 (2026-10-17):** Scrollen der beiden Fenster gekoppelt: beim Öffnen des zweiten Fensters automatisch an, wirkt in beide Richtungen (dieselbe Stelle oben links, auch bei unterschiedlicher Fenstergröße). Schalter heißt jetzt „Scrollen koppeln“ und gilt für beide Fenster gemeinsam; Rückkopplungsschutz gegen Hin-und-her-Scrollen. Vorgängerstand v8.6 unverändert im Ordner `../TERBiBOARD_v8.6_2026-10-17/` (plus ZIP).
- **v8.6 (2026-10-17):** README-Funktionsteil auf den aktuellen Stand gebracht (Abschnitt „Version 8.2 – 8.6“, Dateiformat, Radierer, Taste F). Live-Text im zweiten Fenster: Während getippt wird, erscheint der Text im anderen Fenster sofort als Vorschau (Umbruch, Farbe, Größe, Formeln), höchstens ca. 10 kleine Nachrichten pro Sekunde. Die Vorschau gehört nicht zum gemeinsamen Stand und nicht zum Rückgängig-Verlauf; beim Abschließen ersetzt sie das fertige Textfeld. Wird nie mitgespeichert. Striche erscheinen weiterhin beim Absetzen. Vorgängerstand v8.5 unverändert im Ordner `../TERBiBOARD_v8.5_2026-10-17/` (plus ZIP).
- **v8.5 (2026-10-17):** Taste **F** öffnet jetzt das zweite Fenster (Glätten nur noch über „Auswahl bearbeiten → Glätten“). Textmarker 50 % breiter (Stärke 9 statt 6); bereits gezeichnete Markierungen bleiben unverändert. Vorgängerstand v8.4 unverändert im Ordner `../TERBiBOARD_v8.4_2026-10-17/` (plus ZIP).
- **v8.4 (2026-10-17):** Kein Stiftdruck mehr: Alle Stifte zeichnen in gleichmäßiger Breite, unabhängig vom Andruck. Bereits gezeichnete Striche behalten ihre Form. Vorgängerstand v8.3 unverändert im Ordner `../TERBiBOARD_v8.3_2026-10-17/` (plus ZIP).
- **v8.3 (2026-10-17):** Stärke-Stufe 3 ist jetzt ein **Textmarker**: halbtransparent (45 %, multipliziert mit dem Untergrund, darunterliegende Schrift bleibt lesbar), gleichmäßige Breite ohne Druckabhängigkeit; Symbol im Menü als breiter, schräger, halbtransparenter Balken. Nur Stufe 3 betroffen; Stufen 1 und 2 sowie +/− unverändert. Wird mit der Datei gespeichert (`data-hl`). Vorgängerstand v8.2 unverändert im Ordner `../TERBiBOARD_v8.2_2026-10-17/` (plus ZIP).
- **v8.2 (2026-10-17):** Schreiben deutlich flüssiger und formtreu: Striche werden beim Schreiben schon in ihrer endgültigen Form gespeichert (keine nachträgliche Ausdünnung mehr → die Form „springt“ nach dem Absetzen nicht mehr); Anzeige nur noch einmal pro Bildschirmbild, lange Striche in festen Abschnitten (Rechenzeit beim Schreiben ca. 80× geringer); vorhergesagte Stiftpunkte verringern die gefühlte Verzögerung. Vorgängerstand v8.1 unverändert im Ordner `../TERBiBOARD_v8_2026-10-16/` (plus ZIP).
- **v8.1-E (2026-10-16):** Einzeldatei-Fassung `Einzeldatei/TERBiBOARD.html` aus v8.1 erzeugt (PDF.js eingebettet, Worker im Hauptthread). Programmcode unverändert.
- **v8.1 (2026-10-16):** Lizenz GPL-3.0 (Dateien `LICENSE`, `THIRD-PARTY-LICENSES.txt`, Lizenzköpfe in den Quelldateien, Impressum mit Logo im Hilfe-Fenster). Logo in der Startanimation und als App-Icon (192/512/maskable). Untertitel der Startanimation: „© TERBi Teaching ☺ · freie Bildungsressource (GPL-3.0)“. Sicherung von v8 in `_versionen/v8_2026-10-16/`.

- **v8 (2026-10-16):** Menü neu strukturiert, Farbthema nach dem TERBi-Teaching-Logo, `logo.png` neu. Sicherung von v7.7 in `_versionen/v7.7_2026-10-16/`.

- **v7.7 (2026-10-16):** Zwei Radierer: **Linienradierer** (D, Panel „Linienradierer“, Stift-Radiertaste) löscht nur Striche; **Objektradierer** (Shift+D, Panel „Objektradierer“) löscht nur Textfelder, Bilder und PDF-Seiten. Sicherung von v7.6 in `_versionen/v7.6_2026-10-16/`.
- **v7.6 (2026-10-16):** Fix: Glättung rundet Ecken nur noch um max. ~1,5 Einheiten ab – Rechtecke, Pfeile und importierte Formen behalten scharfe Ecken (Handschrift bleibt glatt). Sicherung von v7.5 in `_versionen/v7.5_2026-10-15/`.
- **v7.5 (2026-10-15):** Startanimation in Grün und Schwarz: „TERBi“ und Unterstreichung grün (#117733), „BOARD“ schwarz. Sicherung von v7.4 in `_versionen/v7.4_2026-10-15/`.
- **v7.4 (2026-10-15):** Startanimation: Schriftzug bleibt nach dem Schreiben stehen, bis geklickt (oder eine Taste gedrückt) wird – höchstens 6 Sekunden. Sicherung von v7.3 in `_versionen/v7.3_2026-10-15/`.
- **v7.3 (2026-10-15):** Startanimation: TERBiBOARD wird in Handschrift geschrieben und unterstrichen (ca. 2 s, reines CSS/SVG in `index.html`/`style.css`). Klick oder Taste überspringt (die Taste löst dabei keinen Befehl aus); im zweiten Fenster und beim Drucken nicht sichtbar; bei „Bewegung reduzieren“ nur kurz statisch. Sicherung von v7.2 in `_versionen/v7.2_2026-10-15/`.
- **v7.2 (2026-10-15):** Standard-Strichstärke des Stifts 1,5 (vorher 3). Sicherung von v7.1 in `_versionen/v7.1_2026-10-15/`.
- **v7.1 (2026-10-15):** Fix: v7-Dateien `app.js`/`index.html` waren nicht im Ordner angekommen (Textfeld-Aufziehen fehlte). Text-Werkzeug: auch der Finger zieht Textfelder auf (statt zu scrollen), deutlichere Vorschau beim Aufziehen. Service Worker lädt Dateien immer frisch vom Server (kein veralteter Browser-Cache).
- **v7 (2026-10-15):** Textfelder mit fester Breite und Umbruch, Breite per Seitengriff änderbar; fremde SVGs werden als bearbeitbares Tafelbild übernommen. Sicherung von v6 in `_versionen/v6_2026-10-15/`.

- **v6 (2026-10-15):** Zweites, live gekoppeltes Fenster mit „Ansicht folgen“. Sicherung von v5 in `_versionen/v5_2026-10-15/`.

- **v5 (2026-10-15):** Umbenennung in **TERBiBOARD** (Titel, Panel, Hilfe, App-Name, Dateinamen `terbiboard_…svg`). Dateiformat, Einstellungen und Backups bleiben kompatibel. Sicherung von v4 in `_versionen/v4_2026-10-15/`.

- **v4 (2026-10-15):** Für Druck anordnen, automatisches Neuanordnen beim Formatwechsel, feste Umbrüche. Sicherung von v3 in `_versionen/v3_2026-10-15/`.

- **v3 (2026-10-15):** Seitenweiser Druck mit intelligenten Umbrüchen, Hoch-/Querformat, formatgerechter PDF-Import. Sicherung von v2 in `_versionen/v2_2026-10-15/`.

- **v2 (2026-10-15):** Schreibgitter, PDF-Import. Sicherung von v1 in `_versionen/v1_2026-10-15/`.
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
