FROM node:16-alpine as build

WORKDIR /app

# Copying source files
COPY . .

RUN apk --no-cache \
  add --update \
  git \
  openssh-client
RUN npm install -g pnpm; \
  pnpm --version; \
  pnpm setup; \
  mkdir -p /usr/local/share/pnpm &&\
  export PNPM_HOME="/usr/local/share/pnpm" &&\
  export PATH="$PNPM_HOME:$PATH"; \
  pnpm bin -g &&\
  pnpm install

# --no-cache: download package index on-the-fly, no need to cleanup afterwards
# --virtual: bundle packages, remove whole bundle at once, when done
RUN apk --no-cache --virtual build-dependencies add \
  make \
  g++ \
  && pnpm run build \
  && apk del build-dependencies

# Running the app
CMD [ "pnpm", "start" ]