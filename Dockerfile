FROM node:alpine

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install

COPY ./src ./src
COPY . ./

RUN yarn build
RUN yarn lint
RUN yarn test
