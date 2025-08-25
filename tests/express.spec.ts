import { expect, test } from '@playwright/test';

import { gotoVoyagerPage } from './PageObjectModel.ts';

test.fixme('open express example', async ({ page }) => {
  const voyagerPage = await gotoVoyagerPage(page, { path: '/voyager' });

  await voyagerPage.waitForGraphToBeLoaded();
  await expect(voyagerPage.page).toHaveScreenshot('loaded-express-example.png');
});
