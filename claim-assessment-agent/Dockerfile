FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Set the port
ENV PORT=3007
EXPOSE 3007

# Start the application
CMD ["npm", "start"]
