# syntax=docker/dockerfile:1

##########
# Builder
##########
FROM node:22-bookworm-slim AS builder

# Build tools for native modules (better-sqlite3) in case a prebuilt
# binary isn't available for this platform.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# pnpm via corepack, pinned by package.json "packageManager"
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Build the app.
# NOTE: astro.config.mjs reads these env vars when the config is evaluated,
# which is at BUILD time — the values get baked into the output. So the /data
# paths and the public site URL (Astro `site`, used for RSS/canonical/OG) must
# be set here, not just at runtime.
ENV DATABASE_URL=file:/data/data.db
ENV UPLOADS_DIR=/data/uploads
# Public origin baked into Astro `site`. Sourced from EMDASH_SITE_URL via a
# compose build arg (see docker-compose.yml).
ARG ORIGIN=http://localhost:4321
ENV ORIGIN=$ORIGIN
COPY . .
RUN pnpm build

##########
# Runner
##########
FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
# @astrojs/node standalone reads HOST/PORT
ENV HOST=0.0.0.0
ENV PORT=3000
# Persisted CMS state lives under /data (mounted volume)
ENV DATABASE_URL=file:/data/data.db
ENV UPLOADS_DIR=/data/uploads

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Bring over the fully built app (dist + node_modules with the compiled
# better-sqlite3 binding + seed + config). Same base image => the native
# binding is ABI-compatible.
COPY --from=builder /app ./

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
