import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';

import { TypeGraph } from '../../graph/type-graph.ts';
import { VoyagerDisplayOptions } from '../Voyager.tsx';
import RootSelector from './RootSelector.tsx';

interface SettingsProps {
  typeGraph: TypeGraph | null | undefined;
  options: VoyagerDisplayOptions;
  onChange: (options: VoyagerDisplayOptions) => void;
}

export default function Settings(props: SettingsProps) {
  const { typeGraph, options, onChange } = props;
  if (typeGraph == null) {
    return null;
  }

  return (
    <Stack
      sx={(theme) => ({
        position: 'absolute',
        opacity: 1,
        overflow: 'hidden',
        background: theme.palette.background.default,
        margin: 2,
        border: 1,
        borderColor: theme.palette.shadowColor.main,
        boxShadow: 2,
        padding: 1,
        // left-bottom corner
        left: 0,
        bottom: 0,
      })}
    >
      <RootSelector
        typeGraph={typeGraph}
        onChange={(rootType) => onChange({ rootType })}
      />
      <Stack direction="row" className="setting-other-options">
        <Checkbox
          id="sort"
          checked={!!options.sortByAlphabet}
          onChange={(event) =>
            onChange({ sortByAlphabet: event.target.checked })
          }
        />
        <label htmlFor="sort">Sort by Alphabet</label>
        <Checkbox
          id="skip"
          checked={!!options.skipRelay}
          onChange={(event) => onChange({ skipRelay: event.target.checked })}
        />
        <label htmlFor="skip">Skip Relay</label>
        <Checkbox
          id="deprecated"
          checked={!!options.skipDeprecated}
          onChange={(event) =>
            onChange({ skipDeprecated: event.target.checked })
          }
        />
        <label htmlFor="deprecated">Skip deprecated</label>
        <Checkbox
          id="showLeafFields"
          checked={!!options.showLeafFields}
          onChange={(event) =>
            onChange({ showLeafFields: event.target.checked })
          }
        />
        <label htmlFor="showLeafFields">Show leaf fields</label>
      </Stack>
    </Stack>
  );
}
