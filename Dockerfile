FROM node:20-alpine

WORKDIR /app

COPY . ./

RUN yarn install
RUN yarn build
RUN yarn lint
RUN yarn test
