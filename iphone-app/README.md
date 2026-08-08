# Lea und Fiona im Abenteuerland — auf GitHub Pages hosten (für iPhone)

Diese fünf Dateien sind alles, was gehostet werden muss:

- `index.html` — das komplette Spiel (autark, alles eingebettet)
- `manifest.webmanifest` — App-Beschreibung (Vollbild, Querformat)
- `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` — App-Icons

## A) Repository anlegen & Dateien hochladen (ohne Git-Kenntnisse)

1. Auf **github.com** einloggen → oben rechts **+** → **New repository**.
2. Name z. B. `lea-fiona` vergeben. **Public** wählen (bei kostenlosen Konten
   ist GitHub Pages nur für öffentliche Repos gratis). **Create repository**.
3. Auf der neuen Repo-Seite: **„uploading an existing file"** anklicken.
4. **Alle fünf Dateien** aus diesem Ordner per Drag & Drop ins Fenster ziehen
   (index.html, manifest.webmanifest und die drei .png-Icons).
5. Unten **Commit changes**.

## B) GitHub Pages einschalten

6. Im Repo oben auf **Settings** → links **Pages**.
7. Bei **Source**: **Deploy from a branch**.
8. **Branch:** `main`, Ordner **`/ (root)`** → **Save**.
9. Nach ca. 1 Minute erscheint oben die Adresse, z. B.:
   `https://DEIN-NAME.github.io/lea-fiona/`

## C) Auf dem iPhone als App einrichten

10. Diese Adresse **in Safari** auf dem iPhone öffnen.
11. Unten das **Teilen-Symbol** (Viereck mit Pfeil) tippen.
12. **„Zum Home-Bildschirm"** wählen → **Hinzufügen**.
13. Fertig: eigenes Icon auf dem Home-Bildschirm, startet im **Vollbild** wie
    eine echte App. Am besten das iPhone **quer** halten.

## Updates später

Neue Spielversion = einfach die neue `index.html` im Repo ersetzen
(Datei anklicken → Stift-Symbol → oder erneut „Upload files"). Die schon
installierte Home-Screen-App lädt beim nächsten Start die neue Version.

*Tipp: Wer mag, kann statt Drag & Drop auch `git push` nutzen — dann liegt
das Spiel im selben Repo wie der Quellcode. Für „nur spielen" reicht der
Weg oben völlig.*
