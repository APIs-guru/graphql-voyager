# syntax=docker/dockerfile:1
FROM node:24

ARG PLAYWRIGHT_VERSION="missing PLAYWRIGHT_VERSION arg"
RUN npm -g install "playwright@$PLAYWRIGHT_VERSION" && playwright install --with-deps chromium
