import { FOUNDATION_COURSES, TRACK_COURSES } from "../../data/courses";
import { TRACKS } from "../../data/site";
import type { SubmissionScope } from "../../lib/submission";
import styles from "./submit.module.css";

type Props = {
  scope: SubmissionScope;
  trackSlug: string;
  existingCourseSlug: string;
  useNewCourse: boolean;
  newCourseTitle: string;
  onTrackChange: (value: string) => void;
  onExistingCourseChange: (value: string) => void;
  onUseNewCourseChange: (value: boolean) => void;
  onNewCourseTitleChange: (value: string) => void;
};

export default function SubmitStepTarget(props: Props) {
  const trackCourses = TRACK_COURSES[props.trackSlug as keyof typeof TRACK_COURSES] ?? [];
  const selectableCourses =
    props.scope === "foundation-course"
      ? FOUNDATION_COURSES
      : trackCourses.filter((course) => !course.isGeneral);

  return (
    <>
      {props.scope !== "foundation-course" && (
        <label className={styles.field}>
          <span>所属方向</span>
          <select value={props.trackSlug} onChange={(event) => props.onTrackChange(event.target.value)}>
            {TRACKS.map((track) => (
              <option key={track.slug} value={track.slug}>
                {track.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {props.scope === "track-general" ? (
        <div className={styles.panel}>
          <strong>Publishing target</strong>
          <p className={styles.muted}>
            {TRACKS.find((track) => track.slug === props.trackSlug)?.label ?? "未选择方向"} / General Resources
          </p>
        </div>
      ) : (
        <>
          <label className={styles.field}>
            <span>
              <input
                checked={props.useNewCourse}
                onChange={(event) => props.onUseNewCourseChange(event.target.checked)}
                type="checkbox"
              />{" "}
              新增课程
            </span>
          </label>

          {props.useNewCourse ? (
            <label className={styles.field}>
              <span>课程名称</span>
              <input
                value={props.newCourseTitle}
                onChange={(event) => props.onNewCourseTitleChange(event.target.value)}
                placeholder="输入新课程名称"
              />
            </label>
          ) : (
            <label className={styles.field}>
              <span>已有课程</span>
              <select value={props.existingCourseSlug} onChange={(event) => props.onExistingCourseChange(event.target.value)}>
                {selectableCourses.length === 0 && <option value="">暂无已有课程</option>}
                {selectableCourses.map((course) => (
                  <option key={course.slug} value={course.slug}>
                    {course.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
    </>
  );
}
