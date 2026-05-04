FROM node:20-alpine

# Install Java (required for Firestore & Storage emulators)
RUN apk add --no-cache openjdk21-jre bash

# Install Firebase CLI
RUN npm install -g firebase-tools

WORKDIR /firebase

# Copy configuration
COPY firebase.json .

# Create data directory
RUN mkdir -p /firebase/data

EXPOSE 4000 8080 9099 9199

# Start emulators with persistence
CMD ["firebase", "emulators:start", "--project", "demo-project", "--import=/firebase/data", "--export-on-exit=/firebase/data"]
