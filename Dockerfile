FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production NPM_CONFIG_UPDATE_NOTIFIER=false
USER node
EXPOSE 3000

CMD ["sh", "-c", "npx knex migrate:latest && exec node src/server.js"]
