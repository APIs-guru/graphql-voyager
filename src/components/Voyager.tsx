import './Voyager.css';
import './viewport.css';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { ThemeProvider } from '@mui/material/styles';
import { ExecutionResult } from 'graphql/execution';
import { GraphQLNamedType, GraphQLSchema } from 'graphql/type';
import { buildClientSchema, IntrospectionQuery } from 'graphql/utilities';
import {
  Children,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getTypeGraph, TypeGraph } from '../graph/type-graph.ts';
import { getSchema } from '../introspection/introspection.ts';
import { MaybePromise, usePromise } from '../utils/usePromise.ts';
import DocExplorer from './doc-explorer/DocExplorer.tsx';
import GraphViewport from './GraphViewport.tsx';
import { IntrospectionModal } from './IntrospectionModal.tsx';
import { theme } from './MUITheme.tsx';
import Settings from './settings/Settings.tsx';
import PoweredBy from './utils/PoweredBy.tsx';
import { VoyagerLogo } from './utils/VoyagerLogo.tsx';

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

  children?: ReactNode;
}

interface NavStackTypeList {
  prev: null;
  typeGraph: TypeGraph;
  type: null;
  selectedEdgeID: null;
  searchValue: string;
}

interface NavStackType {
  prev: NavStack;
  typeGraph: TypeGraph;
  type: GraphQLNamedType;
  selectedEdgeID: string | null;
  searchValue: string;
}

export type NavStack = NavStackTypeList | NavStackType;

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

  const [navStack, setNavStack] = useState<NavStack | null>(null);
  useEffect(() => {
    if (introspectionResult.loading || introspectionResult.value == null) {
      return; // FIXME: display introspectionResult.error
    }

    let introspectionSchema;
    if (introspectionResult.value instanceof GraphQLSchema) {
      introspectionSchema = introspectionResult.value;
    } else {
      if (
        introspectionResult.value.errors != null ||
        introspectionResult.value.data == null
      ) {
        return; // FIXME: display errors
      }
      introspectionSchema = buildClientSchema(introspectionResult.value.data);
    }

    const schema = getSchema(introspectionSchema, displayOptions);
    const typeGraph = getTypeGraph(schema, displayOptions);

    setNavStack(() => ({
      prev: null,
      typeGraph,
      type: null,
      selectedEdgeID: null,
      searchValue: '',
    }));
  }, [introspectionResult, displayOptions]);

  const {
    allowToChangeSchema = false,
    hideDocs = false,
    hideSettings = false,
    // TODO: switch to false in the next major version
    hideVoyagerLogo = true,
  } = props;

  const viewportRef = useRef<GraphViewport>(null);

  const handleNavigationBack = useCallback(() => {
    setNavStack((old) => {
      if (old?.prev == null) {
        return old;
      }
      return old.prev;
    });
  }, []);

  const handleSearch = useCallback((searchValue: string) => {
    setNavStack((old) => {
      if (old == null) {
        return old;
      }
      return { ...old, searchValue };
    });
  }, []);

  const handleSelectNode = useCallback((type: GraphQLNamedType | null) => {
    setNavStack((old) => {
      if (old == null) {
        return old;
      }
      if (type == null) {
        let first = old;
        while (first.prev != null) {
          first = first.prev;
        }
        return first;
      }
      return {
        prev: old,
        typeGraph: old.typeGraph,
        type,
        selectedEdgeID: null,
        searchValue: '',
      };
    });
  }, []);

  const handleSelectEdge = useCallback(
    (edgeID: string, fromType: GraphQLNamedType, _toType: GraphQLNamedType) => {
      setNavStack((old) => {
        if (old == null) {
          return old;
        }
        if (fromType === old.type) {
          // deselect if click again
          return edgeID === old.selectedEdgeID
            ? { ...old, selectedEdgeID: null }
            : { ...old, selectedEdgeID: edgeID };
        }
        return {
          prev: old,
          typeGraph: old.typeGraph,
          type: fromType,
          selectedEdgeID: edgeID,
          searchValue: '',
        };
      });
    },
    [],
  );

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
            navStack={navStack}
            onNavigationBack={handleNavigationBack}
            onSearch={handleSearch}
            onFocusNode={(type) => viewportRef.current?.focusNode(type)}
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
            typeGraph={navStack?.typeGraph}
            onChange={(options) =>
              setDisplayOptions((oldOptions) => ({ ...oldOptions, ...options }))
            }
          />
        )}
        <GraphViewport
          navStack={navStack}
          onSelectNode={handleSelectNode}
          onSelectEdge={handleSelectEdge}
          ref={viewportRef}
        />
      </Box>
    );
  }
}

function PanelHeader(props: { children: ReactNode }) {
  return <>{props.children}</>;
}
Voyager.PanelHeader = PanelHeader;
