import {
  COURSE_TYPES,
  GENERAL_TYPES,
  formatFileSize,
  type NativeFileSourceMode,
  type MaterialType,
  type SubmissionScope,
  type SubmissionLimits,
} from "../../lib/submission";
import styles from "./submit.module.css";

type Props = {
  scope: SubmissionScope;
  materialType: MaterialType;
  sourceMode: NativeFileSourceMode;
  title: string;
  term: string;
  summary: string;
  externalLink: string;
  anonymous: boolean;
  files: File[];
  limits?: SubmissionLimits;
  fileError: string;
  onMaterialTypeChange: (value: MaterialType) => void;
  onSourceModeChange: (value: NativeFileSourceMode) => void;
  onFilesChange: (value: File[]) => void;
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
        <input maxLength={200} value={props.title} onChange={(event) => props.onTitleChange(event.target.value)} placeholder="例如：机器学习入门资源整理" />
      </label>

      <label className={styles.field}>
        <span>学期或时间</span>
        <input maxLength={100} value={props.term} onChange={(event) => props.onTermChange(event.target.value)} placeholder="例如：2026 秋季" />
      </label>

      <label className={styles.field}>
        <span>简介</span>
        <textarea
          rows={6}
          maxLength={8000}
          value={props.summary}
          onChange={(event) => props.onSummaryChange(event.target.value)}
          placeholder="简要说明资料内容、适用人群和使用建议"
        />
      </label>

      <fieldset className={`${styles.field} ${styles.fieldsetReset}`}>
        <legend>文件来源</legend>
        <div className={styles.choiceGrid}>
          <button
            className={`${styles.choiceButton} ${props.sourceMode === "upload" ? styles.choiceButtonActive : ""}`}
            onClick={() => props.onSourceModeChange("upload")}
            type="button"
          >
            <strong>上传文件</strong>
            <div className={styles.muted}>选择本地资料，提交后由维护者审核发布。</div>
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

      {props.sourceMode === "upload" ? (
        <div className={styles.field}>
          <label>
            <span>资料文件（可多选）</span>
            <input type="file" multiple onChange={(event) => { props.onFilesChange(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
          </label>
          {props.files.length > 0 && <ul className={styles.fileList}>{props.files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name} <small>（{formatFileSize(file.size)}）</small></span><button type="button" className="button button--secondary button--sm" onClick={() => props.onFilesChange(props.files.filter((_, itemIndex) => itemIndex !== index))}>移除</button></li>)}</ul>}
          <small className={styles.fieldHint}>文件将在最后确认后上传。请勿上传含姓名、学号、联系方式等个人信息的材料。</small>
          {props.limits && <small className={styles.fieldHint}>一次最多 {props.limits.maxFiles} 个文件，单个文件不超过 {formatFileSize(props.limits.maxFileBytes)}，总大小不超过 {formatFileSize(props.limits.maxSubmissionBytes)}。</small>}
          {props.files.length > 0 && props.fileError && <p className={styles.error} role="alert">{props.fileError}</p>}
        </div>
      ) : (
        <label className={styles.field}>
          <span>外部链接</span>
          <input
            value={props.externalLink}
            onChange={(event) => props.onExternalLinkChange(event.target.value)}
            type="url"
            maxLength={4096}
            placeholder="https://...（仅支持 HTTPS）"
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
