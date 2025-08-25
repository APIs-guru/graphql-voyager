import './Description.css';

import Markdown from '../utils/Markdown.tsx';

interface DescriptionProps {
  text: string | undefined | null;
  className: string;
}

export default function Description(props: DescriptionProps) {
  const { text, className } = props;

  if (text)
    return <Markdown text={text} className={`description-box ${className}`} />;

  return (
    <div className={`description-box ${className} -no-description`}>
      <p>No Description</p>
    </div>
  );
}
