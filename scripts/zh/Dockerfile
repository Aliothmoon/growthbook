# GrowthBook image with the zh-CN UI translation from this fork.
#
# Only the front-end changes, so the official image is reused as is and the
# fork's front-end build output is copied over it (no dhi.io login needed).
#
# Build context: a directory holding the fork's front-end build output
#   .next/   packages/front-end/.next without .next/cache
#   public/  packages/front-end/public (includes zh/dict.zh-CN.json)
#
# GROWTHBOOK_VERSION must be the release the fork branch is based on, so the
# runtime node_modules in the image match the lockfile the front-end was built with.
ARG GROWTHBOOK_VERSION=5.1.0
FROM growthbook/growthbook:${GROWTHBOOK_VERSION}
WORKDIR /usr/local/src/app/packages/front-end
COPY .next ./.next
COPY public ./public
WORKDIR /usr/local/src/app
