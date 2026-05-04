FROM node:20-alpine

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

EXPOSE 4200

# Start Angular dev server with polling for Docker volume hot-reload
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--poll", "2000"]
