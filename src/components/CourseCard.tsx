import Link from "@docusaurus/Link";

type Props = {
  title: string;
  to: string;
  isGeneral?: boolean;
};

export default function CourseCard({ title, to, isGeneral = false }: Props) {
  return (
    <Link className="card margin-bottom--md" to={to}>
      <div className="card__body">
        <h3>{title}</h3>
        <p>
          {isGeneral
            ? "Shared direction-level resources, guides, and notes."
            : "Browse materials for this course."}
        </p>
      </div>
    </Link>
  );
}
