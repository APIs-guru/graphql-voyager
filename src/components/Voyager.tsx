import './Voyager.css';
import './viewport.css';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { ThemeProvider } from '@mui/material/styles';
import { ExecutionResult } from 'graphql/execution';
import { GraphQLSchema } from 'graphql/type';
import { buildClientSchema, IntrospectionQuery } from 'graphql/utilities';
import {
  Children,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getTypeGraph } from '../graph/type-graph';
import { getSchema } from '../introspection/introspection';
import { extractTypeName, typeNameToId } from '../introspection/utils';
import { MaybePromise, usePromise } from '../utils/usePromise';
import DocExplorer from './doc-explorer/DocExplorer';
import GraphViewport from './GraphViewport';
import { IntrospectionModal } from './IntrospectionModal';
import { theme } from './MUITheme';
import Settings from './settings/Settings';
import PoweredBy from './utils/PoweredBy';
import { VoyagerLogo } from './utils/VoyagerLogo';

export interface VoyagerDisplayOptions {
  rootType?: string;
  skipRelay?: boolean;
  skipDeprecated?: boolean;
  showLeafFields?: boolean;
  sortByAlphabet?: boolean;
  hideRoot?: boolean;
}

export interface VoyagerProps {
  introspection?: MaybePromise<
    ExecutionResult<IntrospectionQuery> | GraphQLSchema
  >;
  displayOptions?: VoyagerDisplayOptions;
  introspectionPresets?: { [name: string]: any };
  allowToChangeSchema?: boolean;
  hideDocs?: boolean;
  hideSettings?: boolean;
  hideVoyagerLogo?: boolean;
  disableMouseWheelZoom?: boolean;

  children?: ReactNode;
}

export default function Voyager(props: VoyagerProps) {
  const initialDisplayOptions = useMemo(
    () => ({
      rootType: undefined,
      skipRelay: true,
      skipDeprecated: true,
      sortByAlphabet: false,
      showLeafFields: true,
      hideRoot: false,
      ...props.displayOptions,
    }),
    [props.displayOptions],
  );

  const [introspectionModalOpen, setIntrospectionModalOpen] = useState(
    props.introspection == null,
  );
  const [introspectionResult, resolveIntrospectionResult] = usePromise(
    props.introspection,
  );
  const [displayOptions, setDisplayOptions] = useState(initialDisplayOptions);

  useEffect(() => {
    setDisplayOptions(initialDisplayOptions);
  }, [introspectionResult, initialDisplayOptions]);

  const typeGraph = useMemo(() => {
    if (introspectionResult.loading || introspectionResult.value == null) {
      // FIXME: display introspectionResult.error
      return null;
    }

    let introspectionSchema;
    if (introspectionResult.value instanceof GraphQLSchema) {
      introspectionSchema = introspectionResult.value;
    } else {
      if (
        introspectionResult.value.errors != null ||
        introspectionResult.value.data == null
      ) {
        // FIXME: display errors
        return null;
      }
      introspectionSchema = buildClientSchema(introspectionResult.value.data);
    }

    const schema = getSchema(introspectionSchema, displayOptions);
    return getTypeGraph(schema, displayOptions);
  }, [introspectionResult, displayOptions]);

  useEffect(() => {
    setSelected({ typeID: null, edgeID: null });
  }, [typeGraph]);

  const [selected, setSelected] = useState<{
    typeID: string | null;
    edgeID: string | null;
  }>({
    typeID: null,
    edgeID: null,
  });

  const {
    allowToChangeSchema = false,
    hideDocs = false,
    hideSettings = false,
    // TODO: switch to false in the next major version
    hideVoyagerLogo = true,
    disableMouseWheelZoom = false,
  } = props;

  const viewportRef = useRef<GraphViewport>(null);

  return (
    <ThemeProvider theme={theme}>
      <div className="graphql-voyager">
        {!hideDocs && renderPanel()}
        {renderGraphViewport()}
        {allowToChangeSchema && renderIntrospectionModal()}
      </div>
    </ThemeProvider>
  );

  function renderIntrospectionModal() {
    return (
      <IntrospectionModal
        open={introspectionModalOpen}
        presets={props.introspectionPresets}
        onClose={() => setIntrospectionModalOpen(false)}
        onChange={resolveIntrospectionResult}
      />
    );
  }

  function renderPanel() {
    const children = Children.toArray(props.children);
    const panelHeader = children.find(
      (child) =>
        typeof child === 'object' &&
        'type' in child &&
        child.type === Voyager.PanelHeader,
    );

    return (
      <div className="doc-panel">
        <div className="contents">
          {!hideVoyagerLogo && <VoyagerLogo />}
          {allowToChangeSchema && renderChangeSchemaButton()}
          {panelHeader}
          <DocExplorer
            typeGraph={typeGraph}
            selectedTypeID={selected.typeID}
            selectedEdgeID={selected.edgeID}
            onFocusNode={(id) => viewportRef.current?.focusNode(id)}
            onSelectNode={handleSelectNode}
            onSelectEdge={handleSelectEdge}
          />
          <PoweredBy />
        </div>
      </div>
    );
  }

  function renderChangeSchemaButton() {
    // TODO: generalize padding by applying it to the whole panel
    return (
      <Stack padding={({ panelSpacing }) => `0 ${panelSpacing}`}>
        <Button
          color="primary"
          style={{ color: 'white' }}
          variant="contained"
          onClick={() => setIntrospectionModalOpen(true)}
        >
          Change Schema
        </Button>
      </Stack>
    );
  }

  function renderGraphViewport() {
    return (
      <Box
        sx={(theme) => ({
          flex: 1,
          position: 'relative',
          display: 'inline-block',
          width: '100%',
          height: '100%',
          maxHeight: '100%',

          [theme.breakpoints.down('md')]: {
            height: '50%',
            maxWidth: 'none',
          },
        })}
      >
        {!hideSettings && (
          <Settings
            options={displayOptions}
            typeGraph={typeGraph}
            onChange={(options) =>
              setDisplayOptions((oldOptions) => ({ ...oldOptions, ...options }))
            }
          />
        )}
        <GraphViewport
          typeGraph={typeGraph}
          selectedTypeID={selected.typeID}
          selectedEdgeID={selected.edgeID}
          onSelectNode={handleSelectNode}
          onSelectEdge={handleSelectEdge}
          ref={viewportRef}
          disableMouseWheelZoom={disableMouseWheelZoom}
        />
      </Box>
    );
  }

  function handleSelectNode(typeID: string | null) {
    setSelected((oldSelected) => {
      if (typeID === oldSelected.typeID) {
        return oldSelected;
      }
      return { typeID, edgeID: null };
    });
  }

  function handleSelectEdge(edgeID: string | null) {
    setSelected((oldSelected) => {
      if (edgeID === oldSelected.edgeID || edgeID == null) {
        // deselect if click again
        return { ...oldSelected, edgeID: null };
      } else {
        return { typeID: typeNameToId(extractTypeName(edgeID)), edgeID };
      }
    });
  }
}

function PanelHeader(props: { children: ReactNode }) {
  return <>{props.children}</>;
}
Voyager.PanelHeader = PanelHeader;
