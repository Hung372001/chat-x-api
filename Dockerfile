FROM node:16-alpine as build

WORKDIR /app

# Copying source files
COPY . .

RUN apk --no-cache \
  add --update \
  git \
  openssh-client

RUN npx pnpm i

# --no-cache: download package index on-the-fly, no need to cleanup afterwards
# --virtual: bundle packages, remove whole bundle at once, when done
RUN apk --no-cache --virtual build-dependencies add \
  make \
  g++ \
  && npx pnpm run build \
  && apk del build-dependencies

# Running the app
CMD [ "npx pnpm", "start" ]