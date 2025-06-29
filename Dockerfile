# Base image
FROM node:18-alpine

# Create working directory
WORKDIR /app

# Copy dependencies
COPY package*.json ./
RUN npm install

# Copy the app
COPY . .

# Expose app port
EXPOSE 8000

# Start the app
CMD ["node", "src/index.js"]
