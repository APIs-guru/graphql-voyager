import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLNamedType,
  isEnumType,
  isInputObjectType,
} from 'graphql/type';

import Markdown from '../utils/Markdown.tsx';
import Description from './Description.tsx';
import EnumValue from './EnumValue.tsx';
import WrappedTypeName from './WrappedTypeName.tsx';

interface TypeDetailsProps {
  type: GraphQLNamedType;
  onTypeLink: (type: GraphQLNamedType) => void;
}

export default function TypeDetails(props: TypeDetailsProps) {
  const { type, onTypeLink } = props;

  return (
    <div className="type-details">
      <header>
        <h3>{type.name}</h3>
        <Description className="-doc-type" text={type.description} />
      </header>
      <div className="doc-categories">
        {isInputObjectType(type) && renderFields(type)}
        {isEnumType(type) && renderEnumValues(type)}
      </div>
    </div>
  );

  function renderFields(type: GraphQLInputObjectType) {
    const inputFields = Object.values(type.getFields());
    if (inputFields.length === 0) return null;

    return (
      <div className="doc-category">
        <div className="title">fields</div>
        {inputFields.map((field) => {
          return (
            <div key={field.name} className="item">
              <a className="field-name">{field.name}</a>
              <WrappedTypeName container={field} onTypeLink={onTypeLink} />
              <Markdown
                text={field.description}
                className="description-box -field"
              />
            </div>
          );
        })}
      </div>
    );
  }

  function renderEnumValues(type: GraphQLEnumType) {
    const enumValues = type.getValues();
    if (enumValues.length === 0) return null;

    return (
      <div className="doc-category">
        <div className="title">values</div>
        {enumValues.map((value) => (
          <EnumValue key={value.name} value={value} />
        ))}
      </div>
    );
  }
}
