import Link from "@docusaurus/Link";

import { buildPackagePath } from "../catalog/runtime";
import type { MaterialPackage } from "../catalog/types";
import styles from "./MaterialCard.module.css";

type Props = {
  materialPackage: MaterialPackage;
  isFavorite?: boolean;
  onToggleFavorite?: (packageId: string) => void;
};

export default function MaterialPackageCard({ materialPackage, isFavorite = false, onToggleFavorite }: Props) {
  return (
    <article className="card margin-bottom--md">
      <div className="card__body">
        <div className={`${styles.metaRow} margin-bottom--sm`}>
          <div className={styles.metaDetails}>
            <strong>{materialPackage.materialType}</strong> · <span>{materialPackage.term.label}</span>
            <span className={styles.formatBadge}>{materialPackage.assets.length} 个文件</span>
          </div>
          {onToggleFavorite ? (
            <button
              className={styles.favoriteButton}
              type="button"
              aria-pressed={isFavorite}
              aria-label={`${isFavorite ? "取消收藏" : "收藏"}：${materialPackage.title}`}
              onClick={() => onToggleFavorite(materialPackage.id)}
            >
              <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span> {isFavorite ? "已收藏" : "收藏"}
            </button>
          ) : null}
        </div>
        <h3>{materialPackage.title}</h3>
        <p>{materialPackage.summary}</p>
        <Link className="button button--primary button--sm" to={buildPackagePath(materialPackage.id)}>
          查看资料包
        </Link>
      </div>
    </article>
  );
}
