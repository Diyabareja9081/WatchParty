FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
COPY client/package.json client/package-lock.json ./client/
COPY server/package.json ./server/
RUN npm run install:all
COPY client ./client
COPY server ./server
RUN npm run build --prefix client

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
COPY package.json ./
EXPOSE 5000
CMD ["npm", "start"]
