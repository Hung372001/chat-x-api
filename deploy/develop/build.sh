# Build docker image #
docker --version
docker build -t ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} .
docker images
echo "...[done] build image ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}"
