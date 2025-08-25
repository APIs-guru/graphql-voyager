import { readFileSync } from 'node:fs';

const voyagerCSS = readFileSync(require.resolve('../voyager.css'), 'utf-8');
const voyagerStandaloneJS = readFileSync(
  require.resolve('../voyager.standalone.js'),
  'utf-8',
);

export interface MiddlewareOptions {
  endpointUrl: string;
  displayOptions?: object;
  headersJS?: string;
}

export default function renderVoyagerPage(options: MiddlewareOptions) {
  const { endpointUrl, displayOptions } = options;
  const headersJS = options.headersJS ? options.headersJS : '{}';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset=utf-8 />
  <meta name="viewport" content="user-scalable=no, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0">
  <title>GraphQL Voyager</title>
  <style>
    body {
      padding: 0;
      margin: 0;
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }
    #voyager {
      height: 100vh;
    }
    ${voyagerCSS}
  </style>
  <script>
    ${voyagerStandaloneJS}
  </script>
</head>
<body>
  <main id="voyager">
    <h1 style="text-align: center; color: #5d7e86;"> Loading... </h1>
  </main>
  <script>
    window.addEventListener('load', function (event) {
      const introspection = fetch('${endpointUrl}', {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(${headersJS})
        },
        body: JSON.stringify({
          query: GraphQLVoyager.voyagerIntrospectionQuery,
        }),
        credentials: 'include',
      })
        .then((response) => {
          GraphQLVoyager.renderVoyager(document.getElementById('voyager'), {
            introspection: response.json(),
            displayOptions: ${JSON.stringify(displayOptions)},
          })
        })
    })
  </script>
</body>
</html>
`;
}
