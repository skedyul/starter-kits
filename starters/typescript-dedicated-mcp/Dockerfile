FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src

RUN (npm ci || npm install) && \
    npm run build && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/* ~/.npm

FROM gcr.io/distroless/nodejs22-debian12

WORKDIR /app

COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist

ARG MCP_ENV_JSON="{}"
ENV MCP_ENV_JSON=${MCP_ENV_JSON}

CMD ["dist/server/mcp-server.js"]


