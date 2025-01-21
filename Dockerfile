FROM node:alpine3.20

# Set the working directory
WORKDIR /app

# Copy all files from the current directory to /app in the container
COPY . /app

RUN npm install

# Start the application
CMD ["npm", "run", "dev"]


#docker build -t todo-web:1.0 .
#docker run -d -p -name todoApp 3000:3000 todo-web:1.0