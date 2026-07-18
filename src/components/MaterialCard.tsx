import useBaseUrl from "@docusaurus/useBaseUrl";

import { getMaterialFileInfo, isExternalHref } from "../lib/materials";
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
  const fileInfo = getMaterialFileInfo(href);

  return (
    <article className="card margin-bottom--md">
      <div className="card__body">
        <div className={`${styles.metaRow} margin-bottom--sm`}>
          <div className={styles.metaDetails}>
            <strong>{type}</strong> · <span>{term}</span>
            <span className={styles.formatBadge}>{fileInfo.formatLabel}</span>
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
        <div className={styles.materialActions}>
          <a className="button button--primary button--sm" href={resolvedHref} target="_blank" rel="noreferrer">
            {fileInfo.external ? "访问外部资料" : "打开资料"}
          </a>
          {fileInfo.downloadable ? (
            <a className="button button--secondary button--sm" href={resolvedHref} download>
              下载文件
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
