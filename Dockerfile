FROM node:10-alpine

WORKDIR /sdk

COPY . ./

RUN yarn install