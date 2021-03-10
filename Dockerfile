FROM node:12
RUN sudo apt-get update -y \
    && sudo apt-get install libreoffice -y\
    && sudo apt-get clean
WORKDIR /usr/src/app
COPY package.json package*.json ./
RUN npm install --only=production
COPY . .
CMD [ "npm", "start" ]