FROM node:10-alpine

WORKDIR /sdk

# Step 1/2: copy only relvant files to docker image
## build content
COPY src/ ./src/
COPY package.json ./
COPY README.md ./
COPY yarn.lock ./
## build helper
COPY npm-create-rc.js ./
COPY tsconfig.json ./
COPY .nvmrc ./
## testing, linting
COPY jest.config.js ./
COPY jest.env.js ./
COPY tslint.json ./
COPY .prettierrc ./
COPY .eslintrc.json ./
COPY .eslintrc-jsdoc.json ./
COPY .eslintignore ./
## ignoring files within build later
COPY .npmignore ./
COPY .gitignore ./

RUN yarn install
