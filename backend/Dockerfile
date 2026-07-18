# OpenGOV backend — portable image (Railway / Fly.io / Render / any Docker host).
# Build from the REPO ROOT so the pnpm workspace + committed data/ are in context:
#   docker build -f backend/Dockerfile -t opengov-backend .
#
# The SQLite DB is NOT committed — it is rebuilt from data/ by `pnpm seed` at image
# build time (ARCHITECTURE.md §6), so every image is reproducible.

FROM node:22-bookworm

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.10.0 --activate

# 1) Workspace manifests + lockfile first — install layer is cached until deps change.
#    allowBuilds (better-sqlite3 native binary) comes from pnpm-workspace.yaml.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/package.json
COPY tools/etl/package.json ./tools/etl/package.json
COPY tools/capture/package.json ./tools/capture/package.json
RUN pnpm install --frozen-lockfile --filter @opengov/backend...

# 2) Source + committed data, then compile (tsc→CJS) and build the DB from data/.
COPY backend ./backend
COPY data ./data
RUN pnpm -C backend build && pnpm -C backend seed

ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app/backend
EXPOSE 3001

# OPENROUTER_API_KEY is provided at runtime by the platform (never baked into the image).
CMD ["node", "dist/src/main.js"]
