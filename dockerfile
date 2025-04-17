FROM node:20-alpine

WORKDIR /app

# Create package.json and install dependencies in one step
RUN npm init -y && \
    npm install express body-parser node-fetch@2 && \
    npm cache clean --force

# Copy app file
COPY app.js .

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "app.js"]
