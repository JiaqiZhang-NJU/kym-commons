import styles from "./submit.module.css";

type Props = {
  targetLabel: string;
  issueTitle: string;
  issueBody: string;
  anonymous: boolean;
  issueUrl: string;
};

export default function SubmitStepPreview({ targetLabel, issueTitle, issueBody, anonymous, issueUrl }: Props) {
  return (
    <>
      <div className={styles.panel}>
        <strong>Resolved target</strong>
        <p className={styles.muted}>{targetLabel}</p>
        <p className={styles.muted}>匿名发布：{anonymous ? "是" : "否"}</p>
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
