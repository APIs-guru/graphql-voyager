# syntax=docker/dockerfile:1

FROM node:20

WORKDIR /app

COPY ./graphql-voyager-*.tgz graphql-voyager.tgz

COPY ./example/express-server ./example/express-server

WORKDIR /app/example/express-server
RUN npm install && npm test

EXPOSE  9090
CMD ["npm", "start"]
