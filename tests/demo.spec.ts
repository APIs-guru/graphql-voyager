import { expect, test } from '@playwright/test';
import { buildSchema, graphqlSync } from 'graphql';

import { gotoVoyagerPage, SchemaPresets } from './PageObjectModel.ts';

test('open demo', async ({ page }) => {
  const voyagerPage = await gotoVoyagerPage(page);

  await voyagerPage.waitForGraphToBeLoaded();
  expect
    .soft(await voyagerPage.getGraphSVG())
    .toMatchSnapshot('demo-graph.svg');
  await expect(voyagerPage.page).toHaveScreenshot('loaded-demo.png');
});

test('resize screen', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });

  const voyagerPage = await gotoVoyagerPage(page);

  await voyagerPage.waitForGraphToBeLoaded();
  expect
    .soft(await voyagerPage.getGraphSVG())
    .toMatchSnapshot('graph-before-resize.svg');
  await expect(voyagerPage.page).toHaveScreenshot('demo-before-resize.png');

  await page.setViewportSize({ width: 1024, height: 768 });
  expect
    .soft(await voyagerPage.getGraphSVG())
    .toMatchSnapshot('graph-after-resize.svg');
  await expect(voyagerPage.page).toHaveScreenshot('demo-after-resize.png');
});

for (const name of SchemaPresets) {
  test(`use ${name} preset`, async ({ page }) => {
    const voyagerPage = await gotoVoyagerPage(page);
    const { changeSchemaDialog } = voyagerPage;
    const { presetsTab } = changeSchemaDialog;

    await changeSchemaDialog.openButton.click();
    await expect(voyagerPage.page).toHaveScreenshot('open-dialog.png');

    await presetsTab.tab.click();
    await expect(voyagerPage.page).toHaveScreenshot(
      'switch-to-presets-tab.png',
    );

    const slug = name.toLowerCase().replaceAll(' ', '-');
    await presetsTab.presetButtons[name].click();
    await expect(voyagerPage.page).toHaveScreenshot(
      `choose-${slug}-preset.png`,
    );

    await changeSchemaDialog.displayButton.click();

    // eslint-disable-next-line playwright/no-wait-for-timeout
    await page.waitForTimeout(200); // FIXME
    await voyagerPage.waitForGraphToBeLoaded();
    expect
      .soft(await voyagerPage.getGraphSVG())
      .toMatchSnapshot(`${slug}-graph.svg`);
    await expect(voyagerPage.page).toHaveScreenshot(`show-${slug}-preset.png`);
  });
}

test('check loading animation', async ({ page }) => {
  const voyagerPage = await gotoVoyagerPage(page);
  const { changeSchemaDialog } = voyagerPage;
  const { presetsTab } = changeSchemaDialog;

  await changeSchemaDialog.openButton.click();
  await presetsTab.tab.click();
  await presetsTab.presetButtons['GitHub'].click();
  await changeSchemaDialog.displayButton.click();

  await expect(voyagerPage.page).toHaveScreenshot('loading-animation.png', {
    animations: 'disabled',
  });

  await voyagerPage.waitForGraphToBeLoaded();
  await expect(voyagerPage.page).toHaveScreenshot('show-github-preset.png');
});

test('use custom SDL', async ({ page }) => {
  const voyagerPage = await gotoVoyagerPage(page);
  const { changeSchemaDialog } = voyagerPage;
  const { sdlTab } = changeSchemaDialog;
  await voyagerPage.waitForGraphToBeLoaded();

  await changeSchemaDialog.openButton.click();
  await expect(voyagerPage.page).toHaveScreenshot('open-dialog.png');

  await sdlTab.tab.click();
  await expect(voyagerPage.page).toHaveScreenshot('switch-to-sdl-tab.png');

  await sdlTab.sdlTextArea.fill('type Query { foo: String }');
  await expect(voyagerPage.page).toHaveScreenshot('fill-sdl.png');

  await changeSchemaDialog.displayButton.click();
  await voyagerPage.waitForGraphToBeLoaded();
  expect
    .soft(await voyagerPage.getGraphSVG())
    .toMatchSnapshot('custom-sdl-graph.svg');
  await expect(voyagerPage.page).toHaveScreenshot('display-sdl.png');
});

test('use custom SDL with custom directives', async ({ page }) => {
  const voyagerPage = await gotoVoyagerPage(page);
  await voyagerPage.submitSDL('type Query @foo { bar: String @baz }');

  expect
    .soft(await voyagerPage.getGraphSVG())
    .toMatchSnapshot('custom-sdl-with-unknown-directives-graph.svg');
  await expect(voyagerPage.page).toHaveScreenshot(
    'display-sdl-with-unknown-directives.png',
  );
});

/* FIXME: need a way to disable "Skip deprecated" (uncheck it in UI) in tests
test('use custom SDL with deprecated fields', async ({ page }) => {
  const voyagerPage = await gotoVoyagerPage(page);
  // TODO: test deprecated args and input fields
  await voyagerPage.submitSDL(`
    type Query {
      foo: String @deprecated
      bar: Int @deprecated(reason: "Just because")
    }
  `);

  expect
    .soft(await voyagerPage.getGraphSVG())
    .toMatchSnapshot('custom-sdl-with-deprecated-graph.svg');
  await expect(voyagerPage.page).toHaveScreenshot(
    'display-sdl-with-deprecated.png',
  );
});
*/

test('use custom introspection', async ({ page }) => {
  test.slow();

  const voyagerPage = await gotoVoyagerPage(page);
  const { changeSchemaDialog } = voyagerPage;
  const { introspectionTab } = changeSchemaDialog;
  await voyagerPage.waitForGraphToBeLoaded();

  await changeSchemaDialog.openButton.click();
  await expect(voyagerPage.page).toHaveScreenshot('open-dialog.png');

  await introspectionTab.tab.click();
  await expect(voyagerPage.page).toHaveScreenshot(
    'switch-to-introspection-tab.png',
  );

  await introspectionTab.copyIntrospectionQueryButton.click();
  await expect(voyagerPage.page).toHaveScreenshot(
    'copy-introspection-button-click.png',
  );

  const clipboardText = await page.evaluate<string>(
    'navigator.clipboard.readText()',
  );
  const schema = buildSchema('type Query { foo: String }');
  const result = graphqlSync({ source: clipboardText, schema });
  const jsonResult = JSON.stringify(result, null, 2);

  await introspectionTab.introspectionTextArea.fill(jsonResult);
  await expect(voyagerPage.page).toHaveScreenshot('fill-introspection.png');

  await changeSchemaDialog.displayButton.click();
  await voyagerPage.waitForGraphToBeLoaded();
  expect
    .soft(await voyagerPage.getGraphSVG())
    .toMatchSnapshot('custom-introspection-graph.svg');
  await expect(voyagerPage.page).toHaveScreenshot('display-introspection.png');
});

test('use search params to pass url', async ({ page }) => {
  const url = 'https://example.com/graphql';
  const schema = buildSchema('type Query { foo: String }');

  await page.route(url, async (route, request) => {
    const { query: source } = request.postDataJSON();
    const json = graphqlSync({ source, schema });
    await route.fulfill({ json });
  });

  const voyagerPage = await gotoVoyagerPage(page, { url });
  await voyagerPage.waitForGraphToBeLoaded();

  expect
    .soft(await voyagerPage.getGraphSVG())
    .toMatchSnapshot('schema-from-url-graph.svg');
  await expect(voyagerPage.page).toHaveScreenshot(
    'display-schema-from-url.png',
  );
});
