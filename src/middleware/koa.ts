import renderVoyagerPage, { MiddlewareOptions } from './render-voyager-page.ts';

export default function koaMiddleware(
  options: MiddlewareOptions,
): (ctx: any, next: any) => Promise<void> {
  return async function voyager(ctx, next) {
    try {
      ctx.body = renderVoyagerPage(options);
      await next();
    } catch (err: any) {
      ctx.body = { message: err.message };
      ctx.status = err.status || 500;
    }
  };
}
