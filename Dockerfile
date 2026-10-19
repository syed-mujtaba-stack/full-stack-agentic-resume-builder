# ── build stage ───────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm install
COPY . .
RUN npm run build

# ── runtime stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/shared shared
COPY --from=build /app/server server
COPY --from=build /app/web/dist web/dist

# Production image runs the API (which also serves the built SPA).
ENV PORT=8787
EXPOSE 8787
VOLUME ["/app/.data"]
CMD ["npm", "start"]
