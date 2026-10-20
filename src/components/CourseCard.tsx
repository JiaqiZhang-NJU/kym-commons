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
        <h3>{isGeneral ? '方向通用资料' : title}</h3>
        <p>
          {isGeneral
            ? "入门指南、参考书目和不属于某一门课的学习资源。"
            : "查看这门课的笔记、试卷与学习资料。"}
        </p>
      </div>
    </Link>
  );
}
