import useBaseUrl from "@docusaurus/useBaseUrl";

import { isExternalHref } from "../lib/materials";
import styles from "./MaterialCard.module.css";

type Props = {
  id: string;
  title: string;
  type: string;
  term: string;
  summary: string;
  href: string;
  locationLabel?: string;
  locationHref?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (materialId: string) => void;
};

export default function MaterialCard({
  id,
  title,
  type,
  term,
  summary,
  href,
  locationLabel,
  locationHref,
  isFavorite = false,
  onToggleFavorite,
}: Props) {
  const resolvedHref = isExternalHref(href) ? href : useBaseUrl(href);
  const resolvedLocationHref =
    locationHref && !isExternalHref(locationHref) ? useBaseUrl(locationHref) : locationHref;

  return (
    <article className="card margin-bottom--md">
      <div className="card__body">
        <div className={`${styles.metaRow} margin-bottom--sm`}>
          <div>
            <strong>{type}</strong> · <span>{term}</span>
          </div>
          {onToggleFavorite ? (
            <button
              className={styles.favoriteButton}
              type="button"
              aria-pressed={isFavorite}
              aria-label={`${isFavorite ? "取消收藏" : "收藏"}：${title}`}
              onClick={() => onToggleFavorite(id)}
            >
              <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span> {isFavorite ? "已收藏" : "收藏"}
            </button>
          ) : null}
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
          {isExternalHref(href) ? "访问外部资料" : "打开资料"}
        </a>
      </div>
    </article>
  );
}
