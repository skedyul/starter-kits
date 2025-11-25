FROM public.ecr.aws/lambda/nodejs:22 AS builder

WORKDIR /app

COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src

RUN (npm ci || npm install) && \
    npm run build && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/* ~/.npm

FROM public.ecr.aws/lambda/nodejs:22

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

ARG MCP_ENV_JSON="{}"
ENV MCP_ENV_JSON=${MCP_ENV_JSON}

CMD ["dist/server/mcp-server.handler"]


