
FROM node:16.17.0-alpine AS build


WORKDIR /app


COPY package.json package-lock.json ./
RUN npm install --only=production


COPY src src
COPY tests/.htpasswd tests/.htpasswd


FROM node:16.17.0-alpine AS production


WORKDIR /app


COPY --from=build /app ./


ENV PORT=8080
ENV NPM_CONFIG_LOGLEVEL=warn
ENV NPM_CONFIG_COLOR=false


EXPOSE 8080


CMD ["npm", "start"]
