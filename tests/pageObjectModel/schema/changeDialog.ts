import { type Locator, type Page } from 'playwright/test';
import {
  PlaywrightChangeSchemaPresetsTab,
  PlaywrightChangeSchemaSDLTab,
  PlaywrightChangeSchemaIntrospectionTab,
} from './tabs.ts';

export class PlaywrightChangeSchemaDialog {
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