# TrackaAI

Linear-style project management for teams, with AI agents.

- Product spec: [docs/prd.md](docs/prd.md)
- Roadmap: [docs/plan.md](docs/plan.md) · Current build plan: [docs/build-plan.md](docs/build-plan.md)

## Develop

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

The mock backend seeds `.data/mock-db.json` on first run with `demo@trackaai.test` / `demo-password`; delete the file to reset. Mock data from before M2 has no labels; delete `.data/` to reseed.

Checks: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`
