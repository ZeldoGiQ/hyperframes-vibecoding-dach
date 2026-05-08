# shared/

Code and data shared between the editor, generator and mcp-server modules.

```
shared/
├── brand.config.example.json   # default brand config – fallback when ~/.aivc-dach/ is empty
├── types/
│   └── brand-config.ts         # TypeScript types for the brand config
└── README.md
```

## Why a separate folder?

- The **generator** loads `brand.config.example.json` from here when no user config exists at `~/.aivc-dach/brand.config.json`.
- The **editor** (Next.js) imports the TypeScript types so the AI chat sidebar and brand panel can stay type-safe.
- The **mcp-server** validates incoming tool args against these types.

Keeping them in `shared/` means every module references the same source of truth — no drift between editor and generator brand defaults.

## Versioning

The `version` field in `brand.config.example.json` is a semver string. Bump it whenever you make a schema change. The renderer logs a warning if it loads a config with a major version that doesn't match.
