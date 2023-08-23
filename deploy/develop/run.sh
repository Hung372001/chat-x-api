#! /bin/sh

# Check container and re-run #
OLD_CONTAINER="$(docker ps --all --quiet --filter=name="$DOCKER_CONTAINER_NAME")"
if [ -n "$OLD_CONTAINER" ]; then
  docker stop $OLD_CONTAINER && docker rm $OLD_CONTAINER
  echo "...[done] remove old container ${DOCKER_CONTAINER_NAME}"
fi

docker stack deploy --compose-file docker-compose.dev.yml --with-registry-auth api-asdi-mvp
echo "...[done] start new container ${DOCKER_CONTAINER_NAME}"
