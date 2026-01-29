import { type Locator, type Page } from 'playwright/test';
import { format } from 'prettier';

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

class PlaywrightVoyagerPage {
  readonly page: Page;
  readonly graphLoadingAnimation: Locator;
  readonly svgContainer: Locator;

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
}

class PlaywrightChangeSchemaDialog {
  readonly dialog: Locator;
  readonly openButton: Locator;

  readonly presetsTab: PlaywrightChangeSchemaPresetsTab;
  readonly sdlTab: PlaywrightChangeSchemaSDLTab;
  readonly introspectionTab: PlaywrightChangeSchemaIntrospectionTab;

  readonly displayButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog');
    this.openButton = page.getByRole('button', {
      name: 'Change Schema',
    });

    this.presetsTab = new PlaywrightChangeSchemaPresetsTab(this.dialog);
    this.sdlTab = new PlaywrightChangeSchemaSDLTab(this.dialog);
    this.introspectionTab = new PlaywrightChangeSchemaIntrospectionTab(
      this.dialog,
    );

    this.displayButton = this.dialog.getByRole('button', { name: 'Display' });
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
  }
}

class PlaywrightChangeSchemaBaseTab {
  readonly tab: Locator;
  readonly tabPanel: Locator;

  constructor(dialog: Locator, name: string) {
    this.tab = dialog.getByRole('tab', { name });
    this.tabPanel = dialog.getByRole('tabpanel', { name });
  }
}

export const SchemaPresets = [
  'Star Wars',
  'Yelp',
  'Shopify Storefront',
  'GitHub',
] as const;
class PlaywrightChangeSchemaPresetsTab extends PlaywrightChangeSchemaBaseTab {
  readonly presetButtons: { [name in (typeof SchemaPresets)[number]]: Locator };

  constructor(dialog: Locator) {
    super(dialog, 'Presets');

    this.presetButtons = {} as any;
    for (const name of SchemaPresets) {
      this.presetButtons[name] = this.tabPanel.getByRole('button', { name });
    }
  }
}

class PlaywrightChangeSchemaSDLTab extends PlaywrightChangeSchemaBaseTab {
  readonly sdlTextArea: Locator;

  constructor(dialog: Locator) {
    super(dialog, 'SDL');

    this.sdlTextArea = this.tabPanel.getByPlaceholder('Paste SDL Here');
  }
}

class PlaywrightChangeSchemaIntrospectionTab extends PlaywrightChangeSchemaBaseTab {
  readonly introspectionTextArea: Locator;
  readonly copyIntrospectionQueryButton: Locator;

  constructor(dialog: Locator) {
    super(dialog, 'Introspection');

    this.introspectionTextArea = this.tabPanel.getByPlaceholder(
      'Paste Introspection Here',
    );
    this.copyIntrospectionQueryButton = this.tabPanel.getByRole('button', {
      name: 'Copied!',
    });
  }
}
