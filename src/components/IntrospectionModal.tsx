import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { buildClientSchema } from 'graphql/utilities';
import { ReactElement, useState } from 'react';

import { voyagerIntrospectionQuery } from '../utils/introspection-query.ts';
import { sdlToSchema } from '../utils/sdl-to-introspection.ts';

enum InputType {
  Presets = 'Presets',
  SDL = 'SDL',
  Introspection = 'Introspection',
}

interface IntrospectionModalProps {
  open: boolean;
  presets?: { [name: string]: any };
  onClose: () => void;
  onChange: (introspection: any) => void;
}

export function IntrospectionModal(props: IntrospectionModalProps) {
  const { open, presets, onChange, onClose } = props;
  const hasPresets = presets != null;
  const presetNames = hasPresets ? Object.keys(presets) : [];

  const [submitted, setSubmitted] = useState({
    inputType: hasPresets ? InputType.Presets : InputType.SDL,
    activePreset: presetNames.at(0) ?? '',
    sdlText: '',
    jsonText: '',
  });

  const [inputType, setInputType] = useState(submitted.inputType);
  const [sdlText, setSDLText] = useState(submitted.sdlText);
  const [jsonText, setJSONText] = useState(submitted.jsonText);
  const [activePreset, setActivePreset] = useState(submitted.activePreset);

  return (
    <IntrospectionDialog
      open={open}
      onCancel={handleCancel}
      onSubmit={handleSubmit}
    >
      <TabContext value={inputType}>
        <TabList
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          onChange={(_, activeTab) => setInputType(activeTab)}
        >
          {hasPresets && (
            <Tab value={InputType.Presets} label={InputType.Presets} />
          )}
          <Tab value={InputType.SDL} label={InputType.SDL} />
          <Tab
            value={InputType.Introspection}
            label={InputType.Introspection}
          />
        </TabList>
        {hasPresets && (
          <TabPanel value={InputType.Presets}>
            <PresetsTab
              presets={presets}
              activePreset={activePreset}
              onPresetChange={setActivePreset}
            />
          </TabPanel>
        )}
        <TabPanel value={InputType.SDL}>
          <SDLTab sdlText={sdlText} onSDLTextChange={setSDLText} />
        </TabPanel>
        <TabPanel value={InputType.Introspection}>
          <IntrospectionTab
            jsonText={jsonText}
            onJSONTextChange={setJSONText}
          />
        </TabPanel>
      </TabContext>
    </IntrospectionDialog>
  );

  function handleCancel() {
    setInputType(submitted.inputType);
    setSDLText(submitted.sdlText);
    setJSONText(submitted.jsonText);
    setActivePreset(submitted.activePreset);
    onClose();
  }

  function handleSubmit() {
    switch (inputType) {
      case InputType.Presets:
        onChange(buildClientSchema(presets?.[activePreset].data));
        break;
      case InputType.Introspection:
        // check for errors and check if valid
        onChange(buildClientSchema(JSON.parse(jsonText).data));
        break;
      case InputType.SDL:
        onChange(sdlToSchema(sdlText));
        break;
    }
    setSubmitted({ inputType, sdlText, jsonText, activePreset });
    onClose();
  }
}

interface IntrospectionDialogProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  children: ReactElement;
}

function IntrospectionDialog(props: IntrospectionDialogProps) {
  const { open, onCancel, onSubmit, children } = props;
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      scroll="paper"
      PaperProps={{
        sx: {
          '&': {
            width: 0.9,
            height: 0.9,
            maxWidth: 800,
            maxHeight: 400,
          },
        },
      }}
    >
      <DialogContent style={{ paddingTop: 10, paddingBottom: 0 }}>
        {children}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          style={{ background: '#eeeeee' }}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          style={{ color: 'white' }}
          onClick={onSubmit}
        >
          Display
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface PresetsTabProps {
  presets: { [name: string]: any };
  activePreset: string;
  onPresetChange: (presetName: string) => void;
}

function PresetsTab(props: PresetsTabProps) {
  const { presets, activePreset, onPresetChange } = props;
  const presetNames = Object.keys(presets);

  return (
    <Grid container spacing={4}>
      {presetNames.map((name) => (
        <Grid size={{ xs: 12, sm: 6 }} key={name}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => onPresetChange(name)}
            sx={({ palette }) => ({
              color: activePreset === name ? palette.primary.main : 'darkgrey',
              height: { sm: 100 },
              border: 'none',
              boxShadow: '0px 0 8px 2px',
              textTransform: 'none',
            })}
          >
            <Typography component="span" variant="h5">
              {name}
            </Typography>
          </Button>
        </Grid>
      ))}
    </Grid>
  );
}

interface SDLTabProps {
  sdlText: string;
  onSDLTextChange: (sdl: string) => void;
}

function SDLTab(props: SDLTabProps) {
  const { sdlText, onSDLTextChange } = props;
  return (
    <Stack spacing={1} justifyContent="flex-start" alignItems="center">
      <TextField
        required
        multiline
        fullWidth
        rows={9}
        value={sdlText}
        placeholder="Paste SDL Here"
        onChange={(event) => onSDLTextChange(event.target.value)}
      />
      <PrivacyNote />
    </Stack>
  );
}

interface IntrospectionTabProps {
  jsonText: string;
  onJSONTextChange: (json: string) => void;
}

function IntrospectionTab(props: IntrospectionTabProps) {
  const { jsonText, onJSONTextChange } = props;
  const [isCopied, setIsCopied] = useState(false);
  return (
    <Stack spacing={1} justifyContent="flex-start" alignItems="center">
      <Typography>
        Run the introspection query against a GraphQL endpoint. Paste the result
        into the textarea below to view the model relationships.
      </Typography>
      <Tooltip
        title="Copied!"
        open={isCopied}
        onClose={() => setIsCopied(false)}
        leaveDelay={1500}
      >
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          color="primary"
          size="small"
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onClick={async () => {
            await navigator.clipboard.writeText(voyagerIntrospectionQuery);
            setIsCopied(true);
          }}
        >
          Copy Introspection Query
        </Button>
      </Tooltip>
      <TextField
        required
        multiline
        fullWidth
        rows={4}
        value={jsonText}
        placeholder="Paste Introspection Here"
        onChange={(event) => onJSONTextChange(event.target.value)}
      />
      <PrivacyNote />
    </Stack>
  );
}

function PrivacyNote() {
  return (
    <Typography>
      <b>Privacy note: </b>
      Your schema is processed within browser and is not transmitted to external
      servers or third parties.
    </Typography>
  );
}
