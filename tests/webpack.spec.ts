import { expect, test } from 'playwright/test';

import { gotoVoyagerPage } from './pageObjectModel/index.ts';

test.fixme('open webpack example', async ({ page }) => {
  const voyagerPage = await gotoVoyagerPage(page);

  await voyagerPage.waitForGraphToBeLoaded();
  await expect(voyagerPage.page).toHaveScreenshot('loaded-webpack-example.png');
});
