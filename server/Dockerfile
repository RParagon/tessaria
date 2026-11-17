# Servidor online do Fios de Tessária (contas, save na nuvem, correio, vila).
# Build a partir da RAIZ do repositório:  docker build -f server/Dockerfile .
# No Easypanel: serviço "App", Dockerfile = server/Dockerfile, contexto = raiz.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --ignore-scripts -w server --include-workspace-root=false
COPY shared shared
COPY server server
RUN npm run build -w server && npm prune --omit=dev -w server --include-workspace-root=false

FROM node:22-alpine
ENV NODE_ENV=production PORT=2567 HOST=0.0.0.0
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/server/dist server/dist
COPY server/package.json server/
USER node
EXPOSE 2567
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:2567/health >/dev/null || exit 1
CMD ["node", "server/dist/server.js"]
