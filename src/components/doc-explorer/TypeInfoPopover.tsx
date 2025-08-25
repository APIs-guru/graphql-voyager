import './TypeInfoPopover.css';

import IconButton from '@mui/material/IconButton';
import { GraphQLNamedType } from 'graphql/type';
import { Component } from 'react';

import TypeDetails from '../doc-explorer/TypeDetails.tsx';
import CloseIcon from '../icons/close-black.svg';

interface ScalarDetailsProps {
  type: GraphQLNamedType;
  onChange: (type: GraphQLNamedType | null) => void;
}

interface ScalarDetailsState {
  localType: GraphQLNamedType | null;
}

export default class ScalarDetails extends Component<
  ScalarDetailsProps,
  ScalarDetailsState
> {
  constructor(props: ScalarDetailsProps) {
    super(props);
    this.state = { localType: null };
  }
  close() {
    this.props.onChange(null);
    setTimeout(() => {
      this.setState({ localType: null });
    }, 450);
  }
  render() {
    const { type, onChange } = this.props;

    //FIXME: implement animation correctly
    //https://facebook.github.io/react/docs/animation.html
    const { localType } = this.state;
    if (type && (!localType || type !== localType)) {
      setTimeout(() => {
        this.setState({ localType: type });
      });
    }
    return (
      <div className={`type-info-popover ${type != null ? '-opened' : ''}`}>
        <IconButton className="closeButton" onClick={() => this.close()}>
          <CloseIcon />
        </IconButton>
        {(type ?? localType) && (
          <TypeDetails type={type ?? localType} onTypeLink={onChange} />
        )}
      </div>
    );
  }
}
