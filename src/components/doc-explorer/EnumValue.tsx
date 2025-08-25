import { GraphQLEnumValue } from 'graphql/type';

import Markdown from '../utils/Markdown.tsx';

interface EnumValueProps {
  value: GraphQLEnumValue;
}

export default function EnumValue(props: EnumValueProps) {
  const { value } = props;

  return (
    <div className="item">
      <div className="enum-value">{value.name}</div>
      <Markdown
        className="description-box -enum-value"
        text={value.description}
      />
      {value.deprecationReason && (
        <Markdown className="doc-deprecation" text={value.deprecationReason} />
      )}
    </div>
  );
}
