# Lea und Fiona im Abenteuerland — als iPhone-App hosten

Dieser Ordner ist **komplett** und wird so, wie er ist, hochgeladen. Struktur:

```
index.html              ← das ganze Spiel (autark)
manifest.webmanifest    ← App-Beschreibung (Vollbild, Querformat)
service-worker.js       ← Offline-Start + Updates
icons/                  ← App-Icons (inkl. maskable für Android)
splash/                 ← Startbildschirme für iPhones (Hoch- und Querformat)
```

Wichtig: Die **Ordner `icons/` und `splash/` müssen mit hochgeladen werden**
(nicht nur die index.html), sonst fehlen Icon und Startbild.

---

## Der einfachste Weg: Netlify Drop (kein Konto, keine Ordner-Fummelei)

1. Auf dem **Computer** `netlify.com/drop` öffnen.
2. Den **ganzen Ordner `webapp`** ins Fenster ziehen.
3. Nach ein paar Sekunden gibt es eine fertige Adresse (`https://…netlify.app`).
   Fertig. (Konto optional, nur wenn die Adresse dauerhaft bleiben soll.)

Danach unten weiter bei **„Auf dem iPhone als App einrichten"**.

---

## GitHub Pages (unser Account Bluefield-solutions)

### A) Repository anlegen & Dateien hochladen
1. Auf **github.com** einloggen → oben rechts **+** → **New repository**.
2. Name **`lea-fiona`**, **Public** wählen (Pages ist für öffentliche Repos
   gratis). **Create repository**.
3. Auf der neuen Repo-Seite: **„uploading an existing file"** anklicken.
4. Aus dem Ordner `webapp` **alles** ins Fenster ziehen: `index.html`,
   `manifest.webmanifest`, `service-worker.js` **und die beiden Ordner
   `icons` und `splash`**. (Ordner darf man direkt mit reinziehen — GitHub
   behält die Struktur.)
5. Unten **Commit changes**.

### B) GitHub Pages einschalten
6. Im Repo oben **Settings** → links **Pages**.
7. **Source:** *Deploy from a branch*.
8. **Branch:** `main`, Ordner **`/ (root)`** → **Save**.
9. Nach ca. 1 Minute erscheint die Adresse:
   `https://bluefield-solutions.github.io/lea-fiona/`

---

## Auf dem iPhone als App einrichten
10. Die Adresse **in Safari** öffnen (nicht Chrome — nur Safari legt ein echtes
    Vollbild-App-Icon an).
11. Unten das **Teilen-Symbol** (Viereck mit Pfeil nach oben) tippen.
12. **„Zum Home-Bildschirm"** → **Hinzufügen**.
13. Fertig: eigenes Icon auf dem Home-Bildschirm, startet im **Vollbild** mit
    Startbild wie eine echte App. Danach läuft es auch **offline**.

## Updates später
Neue Version = einfach die neue `index.html` im Repo ersetzen (bzw. Ordner neu
bei Netlify droppen). Die installierte App holt die neue Version beim nächsten
Start automatisch (Service Worker).
