import { type Page } from 'playwright/test';
import { PlaywrightVoyagerPage } from './PlaywrightVoyagerPage.ts';

interface VoyagerURLParams {
  path?: string;
  url?: string;
  withCredential?: boolean;
}

export async function gotoVoyagerPage(
  page: Page,
  searchParams?: VoyagerURLParams,
) {
  // Add error/console checkers before we open Voyager page to track errors during loading
  page.on('pageerror', (error) => {
    throw error;
  });
  page.on('requestfailed', (request) => {
    throw new Error(request.url() + ' ' + request.failure()?.errorText);
  });
  page.on('response', (response) => {
    if (response.status() != 200) {
      throw new Error(
        `${response.url()}: ${response.status()} ${response.statusText()}`,
      );
    }
  });
  page.on('console', (message) => {
    const type = message.type();
    const text = message.text();
    const { url, lineNumber } = message.location();
    const location = `${url}:${lineNumber}`;

    switch (type) {
      case 'timeEnd':
        if (text.startsWith('graphql-voyager: Rendering SVG:')) {
          return;
        }
        break;
      case 'log':
        if (text.startsWith('graphql-voyager: SVG cached')) {
          return;
        }
        break;
    }
    throw new Error(`[${type.toUpperCase()}] at '${location}': ${text}`);
  });

  const search = new URLSearchParams();
  if (searchParams?.url != null) {
    search.append('url', searchParams.url);
  }
  if (searchParams?.withCredential != null) {
    search.append('withCredential', searchParams.withCredential.toString());
  }

  const response = await page.goto(
    (searchParams?.path || '/') + '?' + search.toString(),
  );
  if (response == null) {
    throw new Error('Can not load voyager main page');
  } else if (response.status() != 200) {
    throw new Error(
      `${response.url()}: ${response.status()} ${response.statusText()}`,
    );
  }

  return new PlaywrightVoyagerPage(page);
}