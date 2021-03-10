FROM node:12
RUN apt-get update -y \
    && apt-get install libreoffice -y\
    && apt-get clean
WORKDIR /usr/src/app
COPY package.json package*.json ./
RUN npm install --only=production
COPY . .
CMD [ "npm", "start" ]