# syntax=docker/dockerfile:1
#
# GrowthBook image with the zh-CN UI translation from this fork.
#
# Only the front-end changes, so the official image is reused (no dhi.io login
# needed): its filesystem is copied without its front-end build, and the fork's
# front-end build takes its place. Copying into a fresh image instead of layering
# on top keeps the replaced .next out of the image.
#
# Build context: a directory holding the fork's front-end build output
#   .next/   packages/front-end/.next without .next/cache and source maps
#   public/  packages/front-end/public (includes zh/dict.zh-CN.json)
#
# GROWTHBOOK_VERSION must be the release the fork branch is based on, so the
# runtime node_modules in the image match the lockfile the front-end was built with.
ARG GROWTHBOOK_VERSION=5.1.0
FROM growthbook/growthbook:${GROWTHBOOK_VERSION} AS official

FROM scratch
COPY --from=official \
  --exclude=usr/local/src/app/packages/front-end/.next \
  --exclude=usr/local/src/app/packages/front-end/public \
  / /
COPY .next /usr/local/src/app/packages/front-end/.next
COPY public /usr/local/src/app/packages/front-end/public

# Runtime config of the official image (docker inspect growthbook/growthbook:<version>)
ENV NODE_VERSION=24.21.0 \
  PATH=/opt/venv/bin:/opt/python/bin:/usr/local/bin:/usr/local/sbin:/usr/bin:/bin \
  VIRTUAL_ENV=/opt/venv \
  LD_LIBRARY_PATH=/opt/python/lib:/opt/pydeps:/opt/krb5deps:/usr/lib/x86_64-linux-gnu:/usr/lib/aarch64-linux-gnu \
  PYTHONDONTWRITEBYTECODE=1 \
  NEXT_TELEMETRY_DISABLED=1
USER 1000
WORKDIR /usr/local/src/app
EXPOSE 3000 3100
CMD ["/usr/local/bin/node", "scripts/run-apps.js", "start", "ecosystem.config.js"]
