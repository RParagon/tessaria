# Imagem para a VPS (Easypanel): compila a versão web e serve com nginx.
# O servidor online é outro serviço (server/Dockerfile). Passe o endereço dele no build:
#   docker build --build-arg VITE_API_URL=https://api.seu-dominio.com .
# Sem o build arg, vale o endereço de .env.production.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_API_URL=""
# Vazio, o build usa o endereço de .env.production. Uma variável vazia no ambiente
# teria prioridade e deixaria o jogo sem servidor, por isso ela é removida.
RUN if [ -z "$VITE_API_URL" ]; then unset VITE_API_URL; fi && npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
