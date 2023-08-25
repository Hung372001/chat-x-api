FROM node:16-alpine as build
RUN npm i -g pnpm

WORKDIR /app

# Copying source files
COPY . .

RUN apk --no-cache \
  add --update \
  git \
  openssh-client
RUN pnpm i

# --no-cache: download package index on-the-fly, no need to cleanup afterwards
# --virtual: bundle packages, remove whole bundle at once, when done
RUN apk --no-cache --virtual build-dependencies add \
  make \
  g++ \
  && pnpm run build \
  && apk del build-dependencies

# Running the app
CMD [ "pnpm", "start" ]