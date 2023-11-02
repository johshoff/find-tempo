FROM node:20.1.0

COPY package.json /src/

WORKDIR /src/

RUN npm install

COPY . /src

CMD ["npm", "start"]
