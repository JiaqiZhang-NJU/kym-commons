import { getFoundationCourses, getTrackCourses, runtimeCatalog } from "../../catalog/runtime";
import { GENERAL_RESOURCES_SLUG } from "../../lib/materials";
import type { CourseTargetMode, SubmissionScope, TrackTargetMode } from "../../lib/submission";
import styles from "./submit.module.css";

type Props = {
  scope: SubmissionScope;
  trackTargetMode: TrackTargetMode;
  existingTrackSlug: string;
  newTrackLabel: string;
  newTrackSlug: string;
  courseTargetMode: CourseTargetMode;
  existingCourseSlug: string;
  newCourseTitle: string;
  newCourseSlug: string;
  onTrackTargetModeChange: (value: TrackTargetMode) => void;
  onExistingTrackChange: (value: string) => void;
  onNewTrackLabelChange: (value: string) => void;
  onNewTrackSlugChange: (value: string) => void;
  onCourseTargetModeChange: (value: CourseTargetMode) => void;
  onExistingCourseChange: (value: string) => void;
  onNewCourseTitleChange: (value: string) => void;
  onNewCourseSlugChange: (value: string) => void;
};

function ModeOption({ checked, description, name, onChange, title, value }: {
  checked: boolean; description: string; name: string; onChange: () => void; title: string; value: string;
}) {
  return (
    <label className={`${styles.modeOption} ${checked ? styles.modeOptionActive : ""}`}>
      <input checked={checked} name={name} onChange={onChange} type="radio" value={value} />
      <span><strong>{title}</strong><small>{description}</small></span>
    </label>
  );
}

export default function SubmitStepTarget(props: Props) {
  const isFoundation = props.scope === "foundation-course";
  const isTrackGeneral = props.scope === "track-general";
  const tracks = runtimeCatalog.tracks;
  const selectableCourses = isFoundation
    ? getFoundationCourses()
    : getTrackCourses(props.existingTrackSlug).filter((course) => !course.isGeneralResources);
  const displayTrackLabel = props.trackTargetMode === "new"
    ? props.newTrackLabel || "新方向"
    : tracks.find((track) => track.slug === props.existingTrackSlug)?.label ?? "未选择方向";
  const forceNewCourse = !isFoundation && !isTrackGeneral && props.trackTargetMode === "new";

  return (
    <>
      {!isFoundation && (
        <fieldset className={styles.fieldsetReset}>
          <legend>所属方向</legend>
          <div className={styles.modeGroup}>
            <ModeOption checked={props.trackTargetMode === "existing"} name="track-target" onChange={() => props.onTrackTargetModeChange("existing")} title="已有方向" description="将资料放入已存在的方向。" value="existing" />
            <ModeOption checked={props.trackTargetMode === "new"} name="track-target" onChange={() => props.onTrackTargetModeChange("new")} title="新建方向" description="审核通过后同时创建方向及其 General Resources。" value="new" />
          </div>
          {props.trackTargetMode === "existing" ? (
            <label className={styles.field}><span>选择方向</span><select value={props.existingTrackSlug} onChange={(event) => props.onExistingTrackChange(event.target.value)}>{tracks.map((track) => <option key={track.slug} value={track.slug}>{track.label}</option>)}</select></label>
          ) : (
            <div className={styles.targetFields}>
              <label className={styles.field}><span>方向名称</span><input maxLength={200} value={props.newTrackLabel} onChange={(event) => props.onNewTrackLabelChange(event.target.value)} placeholder="例如：电子信息" /></label>
              <label className={styles.field}><span>方向 slug</span><input maxLength={100} value={props.newTrackSlug} onChange={(event) => props.onNewTrackSlugChange(event.target.value)} placeholder="例如：electronic-information" /><small className={styles.fieldHint}>使用小写英文、数字和连字符。</small></label>
            </div>
          )}
        </fieldset>
      )}

      {isTrackGeneral ? (
        <div className={styles.helperBox}><strong>发布位置</strong><p className={styles.muted}>{displayTrackLabel} / General Resources</p></div>
      ) : (
        <fieldset className={styles.fieldsetReset}>
          <legend>课程</legend>
          {!forceNewCourse && <div className={styles.modeGroup}>
            <ModeOption checked={props.courseTargetMode === "existing"} name="course-target" onChange={() => props.onCourseTargetModeChange("existing")} title="已有课程" description="选择目录中已存在的课程。" value="existing" />
            <ModeOption checked={props.courseTargetMode === "new"} name="course-target" onChange={() => props.onCourseTargetModeChange("new")} title="新建课程" description="审核通过后与资料一同创建。" value="new" />
          </div>}
          {forceNewCourse && <p className={styles.fieldHint}>新方向尚无现有课程；请填写其首门课程。</p>}
          {props.courseTargetMode === "existing" && !forceNewCourse ? (
            <label className={styles.field}><span>选择课程</span><select value={props.existingCourseSlug} onChange={(event) => props.onExistingCourseChange(event.target.value)}>{selectableCourses.length === 0 && <option value="">暂无已有课程</option>}{selectableCourses.map((course) => <option key={course.slug} value={course.slug}>{course.title}</option>)}</select></label>
          ) : (
            <div className={styles.targetFields}>
              <label className={styles.field}><span>课程名称</span><input maxLength={200} value={props.newCourseTitle} onChange={(event) => props.onNewCourseTitleChange(event.target.value)} placeholder="例如：数字信号处理" /></label>
              <label className={styles.field}><span>课程 slug</span><input maxLength={100} value={props.newCourseSlug} onChange={(event) => props.onNewCourseSlugChange(event.target.value)} placeholder="例如：digital-signal-processing" /><small className={styles.fieldHint}>使用小写英文、数字和连字符。</small></label>
            </div>
          )}
        </fieldset>
      )}
      {isTrackGeneral && props.trackTargetMode === "new" && <input name="general-resources-slug" type="hidden" value={GENERAL_RESOURCES_SLUG} />}
    </>
  );
}
