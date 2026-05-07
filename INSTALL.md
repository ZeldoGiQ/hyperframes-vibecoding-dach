# 📥 Installation – Schritt für Schritt

Du brauchst keine technischen Vorkenntnisse. Folge einfach dieser Anleitung.

---

## Voraussetzungen

Du brauchst nur **Claude Code** – das ist die einzige Software, die du selbst installieren musst. Alles andere macht das Addon automatisch für dich.

👉 [Claude Code installieren](https://docs.claude.com/en/docs/claude-code) (kostenlos)

---

## Methode 1: Mit Claude Code (empfohlen)

Das ist die einfachste Methode. Du sagst Claude einfach, was er machen soll.

**Schritt 1:** Öffne ein leeres Verzeichnis auf deinem Computer (z.B. `Dokumente/Videos`)

**Schritt 2:** Starte Claude Code in diesem Ordner

**Schritt 3:** Kopiere diesen Befehl und schick ihn an Claude:

```
Installiere das Hyperframes Addon by Vibe Coding DACH von 
https://github.com/ZeldoGiQ/hyperframes-vibecoding-dach 

Mach alles automatisch:
1. Repo klonen
2. Dependencies prüfen und ggf. nachinstallieren  
3. Hyperframes installieren
4. SKILL.md registrieren
5. Brand-Wizard starten
```

**Das war's.** Claude führt dich Schritt für Schritt durch.

---

## Methode 2: Manuell (für Profis)

### Windows

```bash
git clone https://github.com/ZeldoGiQ/hyperframes-vibecoding-dach.git
cd hyperframes-vibecoding-dach
scripts\install.bat
```

### Mac/Linux

```bash
git clone https://github.com/ZeldoGiQ/hyperframes-vibecoding-dach.git
cd hyperframes-vibecoding-dach
chmod +x scripts/install.sh
./scripts/install.sh
```

---

## Was wird installiert?

Das Addon installiert/prüft folgende Komponenten:

| Komponente | Warum brauchst du das? |
|-----------|----------------------|
| **Hyperframes** | Das eigentliche Video-Tool |
| **Node.js** | Damit Hyperframes läuft |
| **Python 3.11+** | Für Faster Whisper |
| **Faster Whisper** | Erstellt Untertitel aus Audio |
| **ffmpeg** | Schneidet & konvertiert Videos |
| **Git** | Lädt Updates automatisch |

Wenn was fehlt, sagt dir Claude genau wie du es nachinstallierst.

---

## Speicherorte

Nach der Installation sind die Dateien hier:

| Was | Wo |
|-----|-----|
| Addon-Code | `~/hyperframes-vbc/` |
| Brand-Config | `~/.hyperframes-vbc/brand.config.json` |
| Deine Logos | `~/.hyperframes-vbc/assets/` |
| Fertige Videos | `./output/` (im Arbeitsverzeichnis) |

---

## Probleme bei der Installation?

**Problem:** "Node.js nicht gefunden"
- **Lösung:** [Node.js hier herunterladen](https://nodejs.org/) (Empfohlene Version)

**Problem:** "Python nicht gefunden"
- **Windows:** [Python von python.org](https://www.python.org/downloads/) – beim Installieren "Add to PATH" anhaken!
- **Mac:** `brew install python@3.11`
- **Linux:** `sudo apt install python3 python3-pip`

**Problem:** "ffmpeg nicht gefunden"
- **Windows:** `winget install Gyan.FFmpeg`
- **Mac:** `brew install ffmpeg`
- **Linux:** `sudo apt install ffmpeg`

**Problem:** Etwas anderes
- Schreib in der [Vibe Coding DACH Skool-Community](https://www.skool.com/[LINK]) – wir helfen dir.

---

## Erster Start

Nach erfolgreicher Installation:

1. Claude Code öffnen
2. Sagen: `Starte den Brand-Wizard`
3. 5 Fragen beantworten (Marke, Farben, Font, Logo)
4. Erstes Video erstellen: `Mach mir ein News-Intro über AI`

🎉 **Fertig!**
