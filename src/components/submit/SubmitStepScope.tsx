import type { SubmissionScope } from "../../lib/submission";
import styles from "./submit.module.css";

type Props = {
  scope: SubmissionScope;
  onSelect: (scope: SubmissionScope) => void;
};

const options: Array<{ scope: SubmissionScope; title: string; description: string }> = [
  { scope: "foundation-course", title: "基础课程", description: "前三学期基础课的笔记、试卷和复习资料。" },
  { scope: "track-course", title: "方向课程", description: "某个方向里，一门具体课程的笔记、经验和参考资料。" },
  { scope: "track-general", title: "方向通用资料", description: "入门指南、书目等，不属于某一门课的资料。" },
];

export default function SubmitStepScope({ scope, onSelect }: Props) {
  return (
    <div className={styles.choiceGrid}>
      {options.map((option) => (
        <button
          key={option.scope}
          className={`${styles.choiceButton} ${scope === option.scope ? styles.choiceButtonActive : ""}`}
          onClick={() => onSelect(option.scope)}
          type="button"
        >
          <strong>{option.title}</strong>
          <p className={styles.muted}>{option.description}</p>
        </button>
      ))}
    </div>
  );
}
