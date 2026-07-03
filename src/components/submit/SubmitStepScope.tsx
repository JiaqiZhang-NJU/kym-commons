import type { SubmissionScope } from "../../lib/submission";
import styles from "./submit.module.css";

type Props = {
  scope: SubmissionScope;
  onSelect: (scope: SubmissionScope) => void;
};

const options: Array<{ scope: SubmissionScope; title: string; description: string }> = [
  { scope: "foundation-course", title: "大类培养课程", description: "面向前三学期的大类培养课程资料。" },
  { scope: "track-course", title: "方向课程", description: "绑定到具体方向课程的笔记、经验与参考资料。" },
  { scope: "track-general", title: "方向非课程资料", description: "会自动发布到对应方向的 General Resources。" },
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
