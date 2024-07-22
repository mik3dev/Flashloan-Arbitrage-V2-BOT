# Builder stage
FROM node:20-slim AS builder

WORKDIR /usr/app
COPY package*.json ./
RUN npm install
COPY . .

RUN npm run build

# Produdction stage
FROM node:20-slim AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/app
COPY package*.json ./

RUN npm install --only=production

COPY --from=builder /usr/app/dist ./dist
COPY config.json /usr/app/config.json

CMD ["node", "dist/index.js"]
