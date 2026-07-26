FROM node:20-alpine

# Install Java (required for Firestore & Storage emulators)
RUN apk add --no-cache openjdk21-jre bash

# Install Firebase CLI
RUN npm install -g firebase-tools

# Cache the Java runtime used by the Storage emulator during image build.
RUN firebase setup:emulators:storage

WORKDIR /firebase

# Copy configuration
COPY firebase.json .
COPY storage.rules .

# Create data directory
RUN mkdir -p /firebase/data

EXPOSE 4000 8080 9099 9199

# Start only the services used by the application, with local persistence.
CMD ["firebase", "emulators:start", "--project", "flae-agents", "--only", "auth,storage", "--import=/firebase/data", "--export-on-exit=/firebase/data"]
