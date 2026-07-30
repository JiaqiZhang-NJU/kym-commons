import styles from "./submit.module.css";

type Props = {
  targetLabel: string;
  issueTitle: string;
  issueBody: string;
  anonymous: boolean;
  issueUrl: string;
  sourceMode: "issue-attachment" | "external-link";
  externalLink: string;
  hasNewTarget: boolean;
};

export default function SubmitStepPreview({
  targetLabel,
  issueTitle,
  issueBody,
  anonymous,
  issueUrl,
  sourceMode,
  externalLink,
  hasNewTarget,
}: Props) {
  const sourceLabel = sourceMode === "issue-attachment" ? "GitHub Issue 附件" : "外部链接";

  return (
    <>
      <div className={styles.panel}>
        <strong>Resolved target</strong>
        <p className={styles.muted}>{targetLabel}</p>
        <p className={styles.muted}>文件来源：{sourceLabel}</p>
        <p className={styles.muted}>外部链接：{externalLink.trim().length > 0 ? externalLink : "无"}</p>
        <p className={styles.muted}>匿名发布：{anonymous ? "是" : "否"}</p>
        {hasNewTarget ? <p className={styles.muted}>此投稿会在审核通过后同时创建新的方向或课程目录。</p> : null}
        {sourceMode === "issue-attachment" ? (
          <p className={styles.muted}>下一步：打开 GitHub Issue 后，请将资料文件上传为附件。</p>
        ) : null}
      </div>

      <div>
        <h2>Issue Title</h2>
        <pre className={styles.previewBlock}>{issueTitle}</pre>
      </div>

      <div>
        <h2>Issue Body</h2>
        <pre className={styles.previewBlock}>{issueBody}</pre>
      </div>

      <a className="button button--primary button--lg" href={issueUrl} target="_blank" rel="noreferrer">
        Open GitHub Issue
      </a>
    </>
  );
}
