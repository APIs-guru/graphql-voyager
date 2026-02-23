import { expect, type Page, type Locator } from 'playwright/test';
import { format } from 'prettier';
import { PlaywrightChangeSchemaDialog } from './schema/index.ts';

export class PlaywrightVoyagerPage {
  readonly page: Page;
  readonly graphLoadingAnimation: Locator;
  readonly svgContainer: Locator;
  readonly snapshotSaveDir: string | undefined;
  readonly ignoreSnapshots: boolean;

  readonly changeSchemaDialog: PlaywrightChangeSchemaDialog;

  constructor(page: Page) {
    this.page = page;

    this.graphLoadingAnimation = page
      .getByRole('status')
      .getByText('Transmitting...');
    this.svgContainer = this.page.getByRole('img', {
      name: 'Visual representation of the GraphQL schema',
    });

    this.changeSchemaDialog = new PlaywrightChangeSchemaDialog(page);
    this.snapshotSaveDir = process.env['SNAPSHOT_SAVE_DIR'];
    this.ignoreSnapshots = process.env['TEST_ENV'] === 'local';
  }

  async waitForGraphToBeLoaded(): Promise<void> {
    await this.svgContainer.waitFor({ state: 'visible' });
    await this.graphLoadingAnimation.waitFor({ state: 'hidden' });
  }

  async getGraphSVG(): Promise<string> {
    let svg = await this.svgContainer.innerHTML();
    svg = await format(svg, { parser: 'html' });
    return svg.replace(/id="viewport-.*?"/, 'id="viewport-{datetime}"');
  }

  async submitSDL(sdl: string) {
    const { changeSchemaDialog } = this;
    const { sdlTab } = changeSchemaDialog;

    await changeSchemaDialog.openButton.click();
    await sdlTab.tab.click();
    await sdlTab.sdlTextArea.fill(sdl);
    await changeSchemaDialog.displayButton.click();
    await this.waitForGraphToBeLoaded();
  }

  async compareWithSnapshot(name: string, options?: any) {
    if (this.snapshotSaveDir) {
      const screenshotPath = `${this.snapshotSaveDir}/${name}`;
      await this.page.screenshot({
        ...options,
        path: screenshotPath,
        type: 'png',
      });
      console.log(`Saved screenshot to ${screenshotPath}`);
    }

    // Ignore local testing in local mode. It makes no sense in crossOS comparison of screenshots during testing
    if (this.ignoreSnapshots) {
      console.log(`Ignoring snapshot for ${name}`);
      return new Promise<void>((resolve) => resolve());
    }

    return expect(this.page).toHaveScreenshot(name, options);
  }
}
