# 🎬 Hyperframes Addon by Vibe Coding DACH


**Erstelle professionelle Videos mit Claude Code – komplett auf Deutsch, in Minuten statt Stunden.**

Eigenständiger Video-Renderer für Anfänger – inspiriert von Hyperframes-Workflows ([HeyGen Hyperframes](https://hyperframes.heygen.com)), aber komplett **lokal** und ohne Cloud-Account. Das Addon enthält einen eingebauten Renderer (Puppeteer + ffmpeg), 6 fertige Format-Templates, einen Brand-Wizard und einen Claude-Code-Skill auf Deutsch. Du musst nichts können außer Claude Code installiert zu haben.

---

## 🚀 Installation in 30 Sekunden

**1. Öffne Claude Code in einem leeren Ordner**

**2. Kopiere diesen einen Befehl und schicke ihn an Claude:**

```
Installiere das Hyperframes Addon by Vibe Coding DACH von 
https://github.com/ZeldoGiQ/hyperframes-vibecoding-dach 
und führe das komplette Setup aus.
```

**3. Fertig.** Claude installiert alles, fragt dich beim ersten Start nach deinem Branding und du kannst direkt loslegen.

---

## 🎯 Was kannst du damit machen?

Sechs fertige Video-Formate, jedes mit einem einfachen Befehl:

| Format | Länge | Beispiel-Befehl |
|--------|-------|----------------|
| 📰 **News-Intro** | 10 Sek | `Mach mir ein News-Intro über Gemini 4` |
| 🎯 **Promo-Clip** | 30 Sek | `Erstelle einen Promo-Clip für mein Produkt XY` |
| 🎓 **Tutorial-Outro** | 15 Sek | `Bau mir ein Outro mit Subscribe-Hinweis` |
| 💰 **Sponsor-Read** | 20 Sek | `Sponsor-Read für [Marke] mit Logo` |
| 📱 **Vertical Short** | 9:16 | `Mach das als Short für TikTok` |
| 🎙️ **Podcast-Intro** | 15 Sek | `Podcast-Intro mit Waveform-Animation` |

---

## ✨ Was dieses Addon besser macht

- **🇩🇪 Komplett auf Deutsch** – Alle Befehle, Vorschläge und Untertitel
- **🎨 Brand-Wizard** – Einmal einrichten, in jedem Video automatisch verwendet
- **📦 Format-Templates** – Fertige Bausteine, kein Coding nötig
- **🛡️ Idiotensicher** – Fehler werden automatisch erkannt und behoben
- **🔄 Reset-Befehl** – Wenn was kaputt geht, einfach zurücksetzen
- **🎁 100% kostenlos & Open Source**

---

## 📚 Quickstart

Nach der Installation startet automatisch der **Brand-Wizard**. Du beantwortest 5 kurze Fragen:

1. Wie heißt deine Marke?
2. Welche Hauptfarbe? (z.B. `#FF5733` oder "weiß nicht" für Vorschläge)
3. Welche Akzentfarbe?
4. Welcher Font? (oder "weiß nicht")
5. Logo-Datei? (Pfad oder skip)

Danach merkt sich der Helper alles. Du sagst nur noch:

> *"Mach mir ein News-Intro über das neue Claude Opus Update"*

Und bekommst ein fertiges Video in deinem Branding zurück.

---

## 🆘 Hilfe & Befehle

| Befehl | Was er macht |
|--------|-------------|
| `Hyperframes Hilfe` | Zeigt alle verfügbaren Befehle |
| `Hyperframes Reset` | Setzt das Addon zurück |
| `Hyperframes Update` | Holt die neueste Version |
| `Brand neu einrichten` | Startet den Wizard erneut |
| `Zeig mir Beispiele` | Öffnet die Beispiel-Galerie |

---

## 🎓 Lerne mehr

Du willst tiefer einsteigen? In der **Vibe Coding DACH Skool-Community** gibt es:

- 🎥 Komplette Video-Kurse zu Hyperframes
- 📁 Premium-Template-Pack (50+ Formate)
- 💬 Community-Support auf Deutsch
- 🚀 Live-Calls mit Workflow-Reviews

👉 **[Jetzt Vibe Coding DACH beitreten](https://www.skool.com/[DEIN-LINK])**

---

## 🛠️ Voraussetzungen

Das Installationsskript prüft alles automatisch und installiert was fehlt:

| Tool | Wird genutzt für |
|---|---|
| ✅ Claude Code | Die Skill-Integration & der „eine Befehl"-Workflow |
| ✅ Node.js (≥ 18) | Den lokalen Renderer |
| ✅ Python 3.11+ | Faster Whisper (optional, geplant für Subtitles in v1.2) |
| ✅ ffmpeg | Frame-Sequenz → MP4-Encoding |
| ✅ Git | Repo holen + Updates |
| ⚙️ Puppeteer + Chromium | Wird automatisch via `npm install` gezogen (~150 MB einmalig) |

**Unterstützte Systeme:** Windows 10/11, macOS, Linux

---

## 📄 Lizenz

MIT – Mach damit was du willst. Wenn dir das Tool hilft, freuen wir uns über einen ⭐ auf GitHub und einen Besuch in unserer [Skool-Community](https://www.skool.com/[DEIN-LINK]).

---

## 🤝 Credits

- **Inspiriert von** [Hyperframes](https://hyperframes.heygen.com) (HeyGen) – die Idee, Videos aus deklarativen Templates zu rendern. Dieses Addon baut **keinen** Hyperframes-Client, sondern einen eigenständigen lokalen Renderer mit ähnlicher Philosophie.
- Inspiriert vom [RoboNuggets Helper](https://github.com/robonuggets/hyperframes-helper)
- Renderer baut auf [Puppeteer](https://pptr.dev/) und [ffmpeg](https://ffmpeg.org/)
- Gebaut mit ❤️ für die **Vibe Coding DACH** Community
