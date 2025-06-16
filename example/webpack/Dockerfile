# syntax=docker/dockerfile:1

FROM node:24

WORKDIR /app

COPY ./graphql-voyager-*.tgz graphql-voyager.tgz

COPY ./example/webpack ./example/webpack

WORKDIR /app/example/webpack
RUN npm install && npm test

EXPOSE  9090
CMD ["npm", "start"]
