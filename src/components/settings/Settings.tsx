import { ChangeEvent, Fragment, useMemo } from "react";
import Checkbox from '@mui/material/Checkbox';
import Stack from '@mui/material/Stack';

import { TypeGraph } from '../../graph/type-graph';
import { VoyagerDisplayOptions } from '../Voyager';
import RootSelector from './RootSelector';

interface SettingsProps {
  typeGraph: TypeGraph;
  options: VoyagerDisplayOptions;
  onChange: (options: VoyagerDisplayOptions) => void;
}

export default function Settings({ typeGraph, options, onChange }: SettingsProps) {
  const checkboxes = useMemo(
    () => [
      {
        id: "sort",
        label: "Sort by Alphabet",
        checked: options.sortByAlphabet ?? false,
        onChange: (e: ChangeEvent<HTMLInputElement>) => onChange({ sortByAlphabet: e.target.checked }),
      },
      {
        id: "skip",
        label: "Skip Relay",
        checked: options.skipRelay ?? false,
        onChange: (e: ChangeEvent<HTMLInputElement>) => onChange({ skipRelay: e.target.checked }),
      },
      {
        id: "deprecated",
        label: "Skip deprecated",
        checked: options.skipDeprecated ?? false,
        onChange: (e: ChangeEvent<HTMLInputElement>) => onChange({ skipDeprecated: e.target.checked }),
      },
      {
        id: "showLeafFields",
        label: "Show leaf fields",
        checked: options.showLeafFields ?? false,
        onChange: (e: ChangeEvent<HTMLInputElement>) => onChange({ showLeafFields: e.target.checked }),
      },
    ],
    [options, onChange]
  );

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
        left: 0,
        bottom: 0,
      })}
    >
      <RootSelector
        typeGraph={typeGraph}
        onChange={(rootType) => onChange({ rootType })}
      />
      
      <Stack className="setting-other-options" direction="row">
        {checkboxes.map(({ id, checked, label, onChange }) => (
          <Fragment key={id}>
            <Checkbox id={id} checked={checked} onChange={onChange} />
            <label htmlFor={id}>{label}</label>
          </Fragment>
        ))}
      </Stack>
    </Stack>
  );
}
