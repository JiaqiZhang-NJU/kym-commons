import {
  COURSE_TYPES,
  GENERAL_TYPES,
  type FileSourceMode,
  type MaterialType,
  type SubmissionScope,
} from "../../lib/submission";
import styles from "./submit.module.css";

type Props = {
  scope: SubmissionScope;
  materialType: MaterialType;
  sourceMode: FileSourceMode;
  title: string;
  term: string;
  summary: string;
  externalLink: string;
  anonymous: boolean;
  onMaterialTypeChange: (value: MaterialType) => void;
  onSourceModeChange: (value: FileSourceMode) => void;
  onTitleChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onExternalLinkChange: (value: string) => void;
  onAnonymousChange: (value: boolean) => void;
};

export default function SubmitStepDetails(props: Props) {
  const types = props.scope === "track-general" ? GENERAL_TYPES : COURSE_TYPES;

  return (
    <>
      <label className={styles.field}>
        <span>资料类型</span>
        <select
          value={props.materialType}
          onChange={(event) => props.onMaterialTypeChange(event.target.value as MaterialType)}
        >
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

      <fieldset className={`${styles.field} ${styles.fieldsetReset}`}>
        <legend>文件来源</legend>
        <div className={styles.choiceGrid}>
          <button
            className={`${styles.choiceButton} ${props.sourceMode === "issue-attachment" ? styles.choiceButtonActive : ""}`}
            onClick={() => props.onSourceModeChange("issue-attachment")}
            type="button"
          >
            <strong>GitHub Issue 附件</strong>
            <div className={styles.muted}>推荐。提交到 GitHub Issue 后再上传本地文件附件。</div>
          </button>
          <button
            className={`${styles.choiceButton} ${props.sourceMode === "external-link" ? styles.choiceButtonActive : ""}`}
            onClick={() => props.onSourceModeChange("external-link")}
            type="button"
          >
            <strong>外部链接</strong>
            <div className={styles.muted}>适用于资料已经托管在稳定外链位置的情况。</div>
          </button>
        </div>
      </fieldset>

      {props.sourceMode === "issue-attachment" ? (
        <div className={styles.helperBox}>提交到 GitHub Issue 后，请将文件拖拽上传到 Issue 描述区或评论区。</div>
      ) : (
        <label className={styles.field}>
          <span>外部链接</span>
          <input
            value={props.externalLink}
            onChange={(event) => props.onExternalLinkChange(event.target.value)}
            placeholder="https://..."
          />
        </label>
      )}

      <label className={styles.field}>
        <span>
          <input checked={props.anonymous} onChange={(event) => props.onAnonymousChange(event.target.checked)} type="checkbox" /> 匿名发布
        </span>
      </label>
    </>
  );
}
