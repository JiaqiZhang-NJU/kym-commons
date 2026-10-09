import { formatFileSize, type SubmissionManifest } from "../../lib/submission";
import styles from "./submit.module.css";

type Props = {
  targetLabel: string;
  manifest: SubmissionManifest;
  files: File[];
  hasNewTarget: boolean;
  confirmedPrivacy: boolean;
  confirmedRights: boolean;
  onPrivacyChange: (value: boolean) => void;
  onRightsChange: (value: boolean) => void;
};

export default function SubmitStepPreview(props: Props) {
  const { manifest } = props;
  return <>
    <h2>确认投稿</h2>
    <dl className={styles.previewDetails}>
      <dt>归属</dt><dd>{props.targetLabel}</dd>
      <dt>资料标题</dt><dd>{manifest.title}</dd>
      <dt>类型</dt><dd>{manifest.materialType}</dd>
      <dt>学期或时间</dt><dd>{manifest.term}</dd>
      <dt>发布偏好</dt><dd>{manifest.anonymous ? "匿名发布" : "不匿名"}</dd>
      <dt>资料说明</dt><dd className={styles.summary}>{manifest.summary}</dd>
      <dt>文件来源</dt><dd>{manifest.sourceMode === "upload" ? "上传文件" : <a href={manifest.externalLink ?? undefined} target="_blank" rel="noopener noreferrer">{manifest.externalLink}</a>}</dd>
    </dl>
    {manifest.sourceMode === "upload" && <ul className={styles.fileList}>{props.files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name}</span><small>{formatFileSize(file.size)}</small></li>)}</ul>}
    {props.hasNewTarget && <p className={styles.muted}>审核通过后，将同时创建所选的新方向或课程目录。</p>}
    <p className={styles.muted}>投稿仅供维护者审核；审核通过并完成发布后，其他访客才能看到。</p>
    <label className={styles.confirmation}><input type="checkbox" checked={props.confirmedPrivacy} onChange={(event) => props.onPrivacyChange(event.target.checked)} /><span>我确认资料已脱敏，不含应保护的个人信息。</span></label>
    <label className={styles.confirmation}><input type="checkbox" checked={props.confirmedRights} onChange={(event) => props.onRightsChange(event.target.checked)} /><span>我有权分享这些资料，并同意维护者整理后公开发布。</span></label>
  </>;
}
