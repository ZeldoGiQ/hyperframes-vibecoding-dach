# 🤝 Contributing to AIVC DACH

Want to add new templates or fix bugs? Awesome!

## Adding new templates

1. Copy an existing template folder from `templates/` as a base.
2. Adjust `template.html` (use the CSS variables `--primary`, `--accent`, `--bg`, `--text`).
3. Create a `meta.json` with all variables and scenes.
4. Register the template in `templates.json`.
5. Open a Pull Request.

## Template conventions

- **Variables** in `{{DOUBLE_CURLY_BRACES}}` (UPPER_SNAKE_CASE)
- **CSS variables** for everything that should be brand-customizable
- **Animation timings** in seconds, clearly documented
- **Maximum lengths** for texts declared in `meta.json`
- **Comment at the top** of each template listing all variables
- Each template MUST include the `__seekToTime` helper script at the end of `<body>` so the renderer can step through animations deterministically.
- Each template MUST include the auto-fit `--preview-scale` snippet so the HTML is preview-friendly in any browser size (the renderer overrides it with viewport=stage size, so it has no effect on the MP4).
- Default copy in templates is in **English**. The helper can localize per-render based on the user's language.

## SKILL.md changes

When changing `SKILL.md`:
- Keep the user-facing text in English (the helper translates at runtime).
- Add step-by-step instructions where helpful.
- Add anti-patterns when needed.
- Bump the version number.

## Bug reports

Open a GitHub issue with:
- Operating system (Windows / Mac / Linux)
- What did you do?
- What happened?
- What should have happened?
- Logs from `~/.aivc-dach/cache/` if any.

Use the templates in `.github/ISSUE_TEMPLATE/`.

## Code of conduct

Be kind. Be helpful. Help beginners.

That's it.
