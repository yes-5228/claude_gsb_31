FROM node:20-alpine AS build

WORKDIR /app

# 国内网络直连 registry.npmjs.org 会掉速/断流，默认走 npmmirror；换源构建时用
# docker compose build --build-arg NPM_REGISTRY=<url> 覆盖即可
ARG NPM_REGISTRY=https://registry.npmmirror.com

COPY package.json package-lock.json* ./
RUN npm config set registry "$NPM_REGISTRY" \
 && (npm ci --no-audit --no-fund || npm install --no-audit --no-fund)

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
