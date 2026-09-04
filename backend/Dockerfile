FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json ./
COPY tsconfig.json ./
RUN bun install
COPY src ./src
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
EXPOSE 8787
CMD ["bun", "dist/server.js"]
