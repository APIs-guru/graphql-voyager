import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { GraphQLNamedType } from 'graphql';
import { Component, createRef } from 'react';

import { renderSvg } from '../graph/svg-renderer.ts';
import { TypeGraph } from '../graph/type-graph.ts';
import { Viewport } from '../graph/viewport.ts';
import { extractTypeName, typeObjToId } from '../introspection/utils.ts';
import ZoomInIcon from './icons/zoom-in.svg';
import ZoomOutIcon from './icons/zoom-out.svg';
import ZoomResetIcon from './icons/zoom-reset.svg';
import LoadingAnimation from './utils/LoadingAnimation.tsx';
import { type NavStack } from './Voyager.tsx';

interface GraphViewportProps {
  navStack: NavStack | null;
  onSelectNode: (type: GraphQLNamedType | null) => void;
  onSelectEdge: (
    edgeID: string,
    fromType: GraphQLNamedType,
    toType: GraphQLNamedType,
  ) => void;
}

interface GraphViewportState {
  typeGraph: TypeGraph | null | undefined;
  svgViewport: Viewport | null;
}

export default class GraphViewport extends Component<
  GraphViewportProps,
  GraphViewportState
> {
  state: GraphViewportState = { typeGraph: null, svgViewport: null };

  _containerRef = createRef<HTMLDivElement>();
  // Handle async graph rendering based on this example
  // https://gist.github.com/bvaughn/982ab689a41097237f6e9860db7ca8d6
  _currentTypeGraph: TypeGraph | null = null;

  static getDerivedStateFromProps(
    props: GraphViewportProps,
    state: GraphViewportState,
  ): GraphViewportState | null {
    const typeGraph = props.navStack?.typeGraph;

    if (typeGraph !== state.typeGraph) {
      return { typeGraph, svgViewport: null };
    }

    return null;
  }

  componentDidMount() {
    this._renderSvgAsync(this.props.navStack?.typeGraph);
  }

  componentDidUpdate(
    prevProps: GraphViewportProps,
    prevState: GraphViewportState,
  ) {
    const navStack = this.props.navStack;
    const prevNavStack = prevProps.navStack;
    const { svgViewport } = this.state;

    if (svgViewport == null) {
      this._renderSvgAsync(navStack?.typeGraph);
      return;
    }

    const isJustRendered = prevState.svgViewport == null;

    if (prevNavStack?.type !== navStack?.type || isJustRendered) {
      const nodeId = navStack?.type == null ? null : typeObjToId(navStack.type);
      svgViewport.selectNodeById(nodeId);
    }

    if (
      prevNavStack?.selectedEdgeID !== navStack?.selectedEdgeID ||
      isJustRendered
    ) {
      svgViewport.selectEdgeById(navStack?.selectedEdgeID);
    }
  }

  componentWillUnmount() {
    this._currentTypeGraph = null;
    this._cleanupSvgViewport();
  }

  _renderSvgAsync(typeGraph: TypeGraph | null | undefined) {
    if (typeGraph == null) {
      return; // Nothing to render
    }

    if (typeGraph === this._currentTypeGraph) {
      return; // Already rendering in background
    }

    this._currentTypeGraph = typeGraph;

    const { onSelectNode, onSelectEdge } = this.props;
    renderSvg(typeGraph)
      .then((svg) => {
        if (typeGraph !== this._currentTypeGraph) {
          return; // One of the past rendering jobs finished
        }

        this._cleanupSvgViewport();
        const svgViewport = new Viewport(
          svg,
          this._containerRef.current!,
          (nodeId: string | null) => {
            if (nodeId == null) {
              return onSelectNode(null);
            }
            const type = typeGraph.nodes.get(extractTypeName(nodeId));
            if (type != null) {
              onSelectNode(type);
            }
          },
          (edgeID: string, toID: string) => {
            const fromType = typeGraph.nodes.get(extractTypeName(edgeID));
            const toType = typeGraph.nodes.get(extractTypeName(toID));
            if (fromType != null && toType != null) {
              onSelectEdge(edgeID, fromType, toType);
            }
          },
        );
        this.setState({ svgViewport });
      })
      .catch((rawError) => {
        this._currentTypeGraph = null;

        const error =
          rawError instanceof Error
            ? rawError
            : new Error('Unknown error: ' + String(rawError));
        this.setState(() => {
          throw error;
        });
      });
  }

  render() {
    const isLoading = this.state.svgViewport == null;
    const { svgViewport } = this.state;
    return (
      <>
        <Box
          role="img"
          aria-label="Visual representation of the GraphQL schema"
          ref={this._containerRef}
          sx={{
            height: '100%',
            '& > svg': {
              height: '100%',
              width: '100%',
            },
          }}
        />
        {!isLoading && (
          <Stack
            alignItems="center"
            spacing={0.8}
            padding={1}
            position="absolute"
            bottom={0}
            right={0}
          >
            <IconButton
              aria-label="Zoom in"
              color="secondary"
              sx={{ width: 18 }}
              onClick={() => svgViewport?.zoomIn()}
            >
              <ZoomInIcon />
            </IconButton>
            <IconButton
              aria-label="Reset zoom"
              color="secondary"
              sx={{ width: 55 }}
              onClick={() => svgViewport?.reset()}
            >
              <ZoomResetIcon />
            </IconButton>
            <IconButton
              aria-label="Zoom out"
              color="secondary"
              sx={{ width: 18 }}
              onClick={() => svgViewport?.zoomOut()}
            >
              <ZoomOutIcon />
            </IconButton>
          </Stack>
        )}
        {isLoading && <LoadingAnimation />}
      </>
    );
  }

  focusNode(type: GraphQLNamedType): void {
    const { svgViewport } = this.state;
    if (svgViewport) {
      svgViewport.focusElement(typeObjToId(type));
    }
  }

  _cleanupSvgViewport() {
    const { svgViewport } = this.state;
    if (svgViewport) {
      svgViewport.destroy();
    }
  }
}
