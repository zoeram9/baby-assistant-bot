# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Set environment variable for bot token (can be overridden at runtime)
ENV BOT_TOKEN=""

# Command to run the bot
CMD ["node", "src/index.js"]
