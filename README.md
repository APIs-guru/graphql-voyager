# GraphQL Voyager

![graphql-voyager logo](./docs/cover.png)

Represent any GraphQL API as an interactive graph. It's time to finally see **the graph** behind GraphQL.
You can also explore number of public GraphQL APIs from [our list](https://github.com/APIs-guru/graphql-apis).

> With graphql-voyager you can visually explore your GraphQL API as an interactive graph. This is a great tool when designing or discussing your data model. It includes multiple example GraphQL schemas and also allows you to connect it to your own GraphQL endpoint. What are you waiting for, explore your API!

_[GraphQL Weekly #42](https://graphqlweekly.com/issues/42)_

## [Live Demo](https://apis.guru/graphql-voyager/)

[![voyager demo](./docs/demo-gif.gif)](https://apis.guru/graphql-voyager/)

## Features

- Quick navigation on graph
- Left panel which provides more detailed information about every type
- "Skip Relay" option that simplifies graph by removing Relay wrapper classes
- Ability to choose any type to be a root of the graph

## API

GraphQL Voyager exports `Voyager` React component and helper `init` function. If used without
module system it is exported as `GraphQLVoyager` global variable.

### Properties

`Voyager` component accepts the following properties:

- `introspection` [`object`] - the server introspection response. If `function` is provided GraphQL Voyager will pass introspection query as a first function parameter. Function should return `Promise` which resolves to introspection response object.
- `displayOptions` _(optional)_
  - `displayOptions.skipRelay` [`boolean`, default `true`] - skip relay-related entities
  - `displayOptions.skipDeprecated` [`boolean`, default `true`] - skip deprecated fields and entities that contain only deprecated fields.
  - `displayOptions.rootType` [`string`] - name of the type to be used as a root
  - `displayOptions.sortByAlphabet` [`boolean`, default `false`] - sort fields on graph by alphabet
  - `displayOptions.showLeafFields` [`boolean`, default `true`] - show all scalars and enums
  - `displayOptions.hideRoot` [`boolean`, default `false`] - hide the root type
- `allowToChangeSchema` [`boolean`, default `false`] - allow users to change schema
- `hideDocs` [`boolean`, default `false`] - hide the docs sidebar
- `hideSettings` [`boolean`, default `false`] - hide settings panel
- `hideVoyagerLogo` [`boolean`, default `true`] - hide voyager logo

## Using pre-bundled version

You can get GraphQL Voyager bundle from the following places:

- [![jsDelivr](https://data.jsdelivr.com/v1/package/npm/graphql-voyager/badge)](https://www.jsdelivr.com/package/npm/graphql-voyager)
  - some exact version - https://cdn.jsdelivr.net/npm/graphql-voyager@1.3/dist/voyager.standalone.js
  - latest version - https://cdn.jsdelivr.net/npm/graphql-voyager/dist/voyager.standalone.js
- from `dist` folder of the npm package `graphql-voyager`

**Note: `voyager.standalone.js` is bundled with react, so you just need to call
`renderVoyager` function that's it.**

### [HTML example](./example/cdn)

## Using as a dependency

Build for the web with [webpack](https://webpack.js.org/), or any other bundle.

### [Webpack example](./example/webpack)

## Middleware

GraphQL Voyager has middleware for the next frameworks:

### Properties

Middleware supports the following properties:

- `endpointUrl` [`string`] - the GraphQL endpoint url.
- `displayOptions` [`object`] - same as [here](#properties)
- `headersJS` [`string`, default `"{}"`] - object of headers serialized in string to be used on endpoint url<BR>
  **Note:** You can also use any JS expression which results in an object with header names as keys and strings as values e.g. `{ Authorization: localStorage['Meteor.loginToken'] }`

### Express

```js
const express = require('express');
const { express: voyagerMiddleware } = require('graphql-voyager/middleware');

const app = express();

app.use('/voyager', voyagerMiddleware({ endpointUrl: '/graphql' }));

app.listen(3001);
```

### Hapi

#### Version 20+

```js
import Hapi from '@hapi/hapi';
import { hapi as voyagerMiddleware } from 'graphql-voyager/middleware';

const server = new Hapi.Server({
  port: 3001,
});

const init = async () => {
  await server.register({
    plugin: voyagerMiddleware,
    options: {
      path: '/voyager',
      endpointUrl: '/graphql',
    },
  });

  await server.start();
};

init();
```

### Koa

```js
import Koa from 'koa';
import KoaRouter from 'koa-router';
import { koa as voyagerMiddleware } from 'graphql-voyager/middleware';

const app = new Koa();
const router = new KoaRouter();

router.all(
  '/voyager',
  voyagerMiddleware({
    endpointUrl: '/graphql',
  }),
);

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3001);
```

## Credits

This tool is inspired by [graphql-visualizer](https://github.com/NathanRSmith/graphql-visualizer) project.

This project is tested with BrowserStack.
