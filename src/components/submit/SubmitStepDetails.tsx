import { COURSE_TYPES, GENERAL_TYPES, type SubmissionScope } from "../../lib/submission";
import styles from "./submit.module.css";

type Props = {
  scope: SubmissionScope;
  materialType: string;
  title: string;
  term: string;
  summary: string;
  link: string;
  anonymous: boolean;
  onMaterialTypeChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  onAnonymousChange: (value: boolean) => void;
};

export default function SubmitStepDetails(props: Props) {
  const types = props.scope === "track-general" ? GENERAL_TYPES : COURSE_TYPES;

  return (
    <>
      <label className={styles.field}>
        <span>资料类型</span>
        <select value={props.materialType} onChange={(event) => props.onMaterialTypeChange(event.target.value)}>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>资料标题</span>
        <input value={props.title} onChange={(event) => props.onTitleChange(event.target.value)} placeholder="例如：机器学习入门资源整理" />
      </label>

      <label className={styles.field}>
        <span>学期或时间</span>
        <input value={props.term} onChange={(event) => props.onTermChange(event.target.value)} placeholder="2026 Spring" />
      </label>

      <label className={styles.field}>
        <span>简介</span>
        <textarea
          rows={6}
          value={props.summary}
          onChange={(event) => props.onSummaryChange(event.target.value)}
          placeholder="简要说明资料内容、适用人群和使用建议"
        />
      </label>

      <label className={styles.field}>
        <span>资料链接</span>
        <input value={props.link} onChange={(event) => props.onLinkChange(event.target.value)} placeholder="https://..." />
      </label>

      <label className={styles.field}>
        <span>
          <input checked={props.anonymous} onChange={(event) => props.onAnonymousChange(event.target.checked)} type="checkbox" /> 匿名发布
        </span>
      </label>
    </>
  );
}
