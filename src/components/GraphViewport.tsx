import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { Component, createRef } from 'react';

import { renderSvg } from '../graph/svg-renderer.ts';
import { TypeGraph } from '../graph/type-graph.ts';
import { Viewport } from '../graph/viewport.ts';
import ZoomInIcon from './icons/zoom-in.svg';
import ZoomOutIcon from './icons/zoom-out.svg';
import ZoomResetIcon from './icons/zoom-reset.svg';
import LoadingAnimation from './utils/LoadingAnimation.tsx';
import { GraphSelection } from './Voyager.tsx';

interface GraphViewportProps {
  typeGraph: TypeGraph | null;

  selectedTypeID: string | null;
  selectedEdgeID: string | null;

  onSelect: (selection: GraphSelection) => void;
}

interface GraphViewportState {
  typeGraph: TypeGraph | null;
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
    const { typeGraph } = props;

    if (typeGraph !== state.typeGraph) {
      return { typeGraph, svgViewport: null };
    }

    return null;
  }

  componentDidMount() {
    this._renderSvgAsync(this.props.typeGraph);
  }

  componentDidUpdate(
    prevProps: GraphViewportProps,
    prevState: GraphViewportState,
  ) {
    const { svgViewport } = this.state;

    if (svgViewport == null) {
      this._renderSvgAsync(this.props.typeGraph);
      return;
    }

    const isJustRendered = prevState.svgViewport == null;
    const { selectedTypeID, selectedEdgeID } = this.props;

    if (prevProps.selectedTypeID !== selectedTypeID || isJustRendered) {
      svgViewport.selectNodeById(selectedTypeID);
    }

    if (prevProps.selectedEdgeID !== selectedEdgeID || isJustRendered) {
      svgViewport.selectEdgeById(selectedEdgeID);
    }
  }

  componentWillUnmount() {
    this._currentTypeGraph = null;
    this._cleanupSvgViewport();
  }

  _renderSvgAsync(typeGraph: TypeGraph | null) {
    if (typeGraph == null) {
      return; // Nothing to render
    }

    if (typeGraph === this._currentTypeGraph) {
      return; // Already rendering in background
    }

    this._currentTypeGraph = typeGraph;

    const { onSelect } = this.props;
    renderSvg(typeGraph)
      .then((svg) => {
        if (typeGraph !== this._currentTypeGraph) {
          return; // One of the past rendering jobs finished
        }

        this._cleanupSvgViewport();
        const svgViewport = new Viewport(
          svg,
          this._containerRef.current!,
          onSelect,
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

  focusNode(id: string) {
    const { svgViewport } = this.state;
    if (svgViewport) {
      svgViewport.focusElement(id);
    }
  }

  _cleanupSvgViewport() {
    const { svgViewport } = this.state;
    if (svgViewport) {
      svgViewport.destroy();
    }
  }
}
