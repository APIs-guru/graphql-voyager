import express from 'express';
import { createHandler } from 'graphql-http/lib/use/express';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';

import { schema } from './schema.ts';

const PORT = 9090;
const app = express();

app.use('/graphql', createHandler({ schema }));
app.use(
  '/voyager',
  voyagerMiddleware({
    endpointUrl: '/graphql',
    displayOptions: {
      sortByAlphabet: true,
    },
  }),
);

app.listen(PORT, () => {
  console.log(`Started on http://localhost:${PORT}/voyager`);
});
