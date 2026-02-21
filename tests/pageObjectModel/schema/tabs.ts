import { type Locator } from 'playwright';
import { SchemaPresets } from './presets.ts';

class PlaywrightChangeSchemaBaseTab {
  readonly tab: Locator;
  readonly tabPanel: Locator;

  constructor(dialog: Locator, name: string) {
    this.tab = dialog.getByRole('tab', { name });
    this.tabPanel = dialog.getByRole('tabpanel', { name });
  }
}

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

export {
  PlaywrightChangeSchemaBaseTab,
  PlaywrightChangeSchemaPresetsTab,
  PlaywrightChangeSchemaSDLTab,
  PlaywrightChangeSchemaIntrospectionTab,
};