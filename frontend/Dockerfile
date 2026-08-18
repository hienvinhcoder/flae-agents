FROM node:20.19.0-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 4200

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
