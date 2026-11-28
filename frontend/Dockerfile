FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_CLIENT_ID
ARG VITE_RAG_PROVIDER_MODE=studyVault
ENV VITE_CLIENT_ID=${VITE_CLIENT_ID}
ENV VITE_RAG_PROVIDER_MODE=${VITE_RAG_PROVIDER_MODE}

RUN npm run build

FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
