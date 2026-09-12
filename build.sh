#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

platform=linux/amd64
tag=local
while [ "$#" -gt 0 ]; do
  case "$1" in
    --platform|--tag)
      if [ "$#" -lt 2 ]; then echo "Missing value for $1" >&2; exit 2; fi
      if [ "$1" = --platform ]; then platform=$2; else tag=$2; fi
      shift 2
      ;;
    --help|-h)
      echo "Usage: ./build.sh [--platform linux/amd64|linux/arm64] [--tag TAG]"
      echo "Build and load all three images locally. Defaults: linux/amd64, tag local."
      echo "This script does not publish images, deploy, or start containers."
      exit 0
      ;;
    *) echo "Unknown argument: $1 (see --help)" >&2; exit 2 ;;
  esac
done
case "$platform" in
  linux/amd64|linux/arm64) ;;
  *) echo "Unsupported platform: $platform" >&2; exit 2 ;;
esac
if [[ ! "$tag" =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ ]]; then
  echo "Invalid Docker image tag" >&2
  exit 2
fi
converter_revision=$(cat media-preview.ref)
if [[ ! "$converter_revision" =~ ^[a-f0-9]{40}$ ]]; then
  echo "media-preview.ref must contain a full Git commit SHA" >&2
  exit 1
fi
docker info >/dev/null
docker buildx version >/dev/null

image_prefix=ghcr.io/wtiger001/kollab
docker buildx build --platform "$platform" --load --tag "$image_prefix-api:$tag" --file api/Dockerfile ./api
docker buildx build --platform "$platform" --load --tag "$image_prefix-caddy:$tag" --file Caddy.Dockerfile .
docker buildx build --platform "$platform" --load --tag "$image_prefix-media-preview:$tag" "https://github.com/WTIGER001/media-preview.git#$converter_revision"
echo "Built all images locally for $platform with tag $tag."
