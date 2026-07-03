import Link from "@docusaurus/Link";
import clsx from "clsx";

import styles from "./SectionCard.module.css";

type Props = {
  title: string;
  description: string;
  to: string;
};

export default function SectionCard({ title, description, to }: Props) {
  return (
    <Link className={clsx("card", styles.card)} to={to}>
      <div className="card__body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </Link>
  );
}
