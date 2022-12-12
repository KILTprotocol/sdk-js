FROM node:alpine

WORKDIR /app

COPY . ./

RUN yarn install
RUN yarn build:release
RUN yarn lint
RUN yarn test
