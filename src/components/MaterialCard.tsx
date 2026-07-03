type Props = {
  title: string;
  type: string;
  term: string;
  summary: string;
  href: string;
};

export default function MaterialCard({ title, type, term, summary, href }: Props) {
  return (
    <article className="card margin-bottom--md">
      <div className="card__body">
        <div className="margin-bottom--sm">
          <strong>{type}</strong> · <span>{term}</span>
        </div>
        <h3>{title}</h3>
        <p>{summary}</p>
        <a href={href} target="_blank" rel="noreferrer">
          Open material
        </a>
      </div>
    </article>
  );
}
