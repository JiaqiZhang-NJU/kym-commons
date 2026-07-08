import useBaseUrl from "@docusaurus/useBaseUrl";

import { isExternalHref } from "../lib/materials";

type Props = {
  title: string;
  type: string;
  term: string;
  summary: string;
  href: string;
  locationLabel?: string;
  locationHref?: string;
};

export default function MaterialCard({ title, type, term, summary, href, locationLabel, locationHref }: Props) {
  const resolvedHref = isExternalHref(href) ? href : useBaseUrl(href);
  const resolvedLocationHref =
    locationHref && !isExternalHref(locationHref) ? useBaseUrl(locationHref) : locationHref;

  return (
    <article className="card margin-bottom--md">
      <div className="card__body">
        <div className="margin-bottom--sm">
          <strong>{type}</strong> · <span>{term}</span>
        </div>
        <h3>{title}</h3>
        <p>{summary}</p>
        {locationLabel ? (
          <p className="margin-bottom--sm">
            <small>
              所在位置：
              {resolvedLocationHref ? (
                <a href={resolvedLocationHref}>{locationLabel}</a>
              ) : (
                locationLabel
              )}
            </small>
          </p>
        ) : null}
        <a href={resolvedHref} target="_blank" rel="noreferrer">
          Open material
        </a>
      </div>
    </article>
  );
}
