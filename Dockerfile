# Includes Chromium + system libraries for the site inspector, builder and reviewer.
FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app
ENV NODE_ENV=production PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
RUN npx tsc --noEmit
EXPOSE 3000
CMD ["npx", "tsx", "src/server/main.ts"]
