import { useMemo, useState } from "react";

import { getCourse, runtimeCatalog } from "../../catalog/runtime";
import {
  buildIssueBody, buildIssueTitle, buildIssueUrl, getDefaultMaterialType, getDefaultSourceMode,
  getFirstExistingCourseSlug, isDetailsStepComplete, isScopeStepComplete, isTargetStepComplete,
  type CourseTargetMode, type FileSourceMode, type MaterialType, type SubmissionPrefill,
  type SubmissionScope, type TargetCourse, type TargetTrack, type TrackTargetMode,
} from "../../lib/submission";
import SubmitStepDetails from "./SubmitStepDetails";
import SubmitStepPreview from "./SubmitStepPreview";
import SubmitStepScope from "./SubmitStepScope";
import SubmitStepTarget from "./SubmitStepTarget";
import styles from "./submit.module.css";

const steps = ["投稿类型", "归属位置", "资料详情", "预览提交"];
type Props = { initialTarget?: SubmissionPrefill | null };

export default function SubmitWizard({ initialTarget }: Props) {
  const initialScope = initialTarget?.scope ?? "track-general";
  const initialTrackSlug = initialTarget?.trackSlug || runtimeCatalog.tracks[0]?.slug || "";
  const [stepIndex, setStepIndex] = useState(initialTarget ? 1 : 0);
  const [scope, setScope] = useState<SubmissionScope>(initialScope);
  const [trackTargetMode, setTrackTargetMode] = useState<TrackTargetMode>("existing");
  const [existingTrackSlug, setExistingTrackSlug] = useState(initialTrackSlug);
  const [newTrackLabel, setNewTrackLabel] = useState("");
  const [newTrackSlug, setNewTrackSlug] = useState("");
  const [courseTargetMode, setCourseTargetMode] = useState<CourseTargetMode>("existing");
  const [existingCourseSlug, setExistingCourseSlug] = useState(initialTarget?.courseSlug ?? getFirstExistingCourseSlug(initialScope, initialTrackSlug));
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseSlug, setNewCourseSlug] = useState("");
  const [materialType, setMaterialType] = useState<MaterialType>(getDefaultMaterialType(initialScope));
  const [sourceMode, setSourceMode] = useState<FileSourceMode>(getDefaultSourceMode());
  const [title, setTitle] = useState("");
  const [term, setTerm] = useState("2026 Spring");
  const [summary, setSummary] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [anonymous, setAnonymous] = useState(true);

  const track: TargetTrack | null = scope === "foundation-course" ? null : trackTargetMode === "new"
    ? { mode: "new", slug: newTrackSlug.trim(), label: newTrackLabel.trim() }
    : { mode: "existing", slug: existingTrackSlug, label: runtimeCatalog.tracks.find((item) => item.slug === existingTrackSlug)?.label ?? "未选择方向" };
  const selectedCourse = scope === "foundation-course"
    ? getCourse({ section: "foundation", courseSlug: existingCourseSlug })
    : getCourse({ section: "track", trackSlug: existingTrackSlug, courseSlug: existingCourseSlug });
  const course: TargetCourse = scope === "track-general"
    ? { mode: "existing", slug: "general-resources", title: "General Resources" }
    : courseTargetMode === "new"
      ? { mode: "new", slug: newCourseSlug.trim(), title: newCourseTitle.trim() }
      : { mode: "existing", slug: existingCourseSlug, title: selectedCourse?.title ?? "未选择课程" };
  const sectionLabel = scope === "foundation-course" ? "大类培养课程" : "宽口径方向课程";
  const targetLabel = scope === "foundation-course" ? `Foundation / ${course.title}` : `${track?.label ?? "未选择方向"} / ${course.title}`;
  const targetState = { scope, trackTargetMode, existingTrackSlug, newTrackLabel, newTrackSlug, courseTargetMode, existingCourseSlug, newCourseTitle, newCourseSlug };

  const preview = useMemo(() => {
    const payload = { scope, sectionLabel, track, course, materialType, title, term, summary, sourceMode, externalLink, anonymous };
    const issueTitle = buildIssueTitle(payload);
    const issueBody = buildIssueBody(payload);
    return { issueTitle, issueBody, issueUrl: buildIssueUrl({ repoUrl: "https://github.com/JiaqiZhang-NJU/kym-commons", title: issueTitle, body: issueBody }) };
  }, [anonymous, course, externalLink, materialType, scope, sectionLabel, sourceMode, summary, term, title, track]);

  const canGoNext = stepIndex === 0 ? isScopeStepComplete(scope)
    : stepIndex === 1 ? isTargetStepComplete(targetState)
      : stepIndex === 2 ? isDetailsStepComplete({ title, term, summary, sourceMode, externalLink }) : true;

  const handleScopeChange = (nextScope: SubmissionScope) => {
    setScope(nextScope); setMaterialType(getDefaultMaterialType(nextScope));
    setCourseTargetMode(nextScope === "track-general" ? "existing" : "existing");
    setExistingCourseSlug(getFirstExistingCourseSlug(nextScope, existingTrackSlug));
  };
  const handleTrackModeChange = (mode: TrackTargetMode) => {
    setTrackTargetMode(mode);
    if (mode === "new" && scope === "track-course") setCourseTargetMode("new");
    if (mode === "existing") setExistingCourseSlug(getFirstExistingCourseSlug(scope, existingTrackSlug));
  };
  const handleExistingTrackChange = (slug: string) => { setExistingTrackSlug(slug); setExistingCourseSlug(getFirstExistingCourseSlug(scope, slug)); };
  const handleCourseModeChange = (mode: CourseTargetMode) => setCourseTargetMode(mode);

  return <div className={styles.wizardShell}>
    <div className={styles.stepper}>{steps.map((step, index) => <div key={step} className={`${styles.stepCard} ${index === stepIndex ? styles.stepCardActive : ""}`}><strong>{index + 1}. {step}</strong></div>)}</div>
    <div className={styles.panel}>
      {stepIndex === 0 && <SubmitStepScope scope={scope} onSelect={handleScopeChange} />}
      {stepIndex === 1 && <>{initialTarget && <p className={styles.prefillNotice}>已根据课程页预填投稿位置，请在下方确认或修改。</p>}<SubmitStepTarget scope={scope} trackTargetMode={trackTargetMode} existingTrackSlug={existingTrackSlug} newTrackLabel={newTrackLabel} newTrackSlug={newTrackSlug} courseTargetMode={courseTargetMode} existingCourseSlug={existingCourseSlug} newCourseTitle={newCourseTitle} newCourseSlug={newCourseSlug} onTrackTargetModeChange={handleTrackModeChange} onExistingTrackChange={handleExistingTrackChange} onNewTrackLabelChange={setNewTrackLabel} onNewTrackSlugChange={setNewTrackSlug} onCourseTargetModeChange={handleCourseModeChange} onExistingCourseChange={setExistingCourseSlug} onNewCourseTitleChange={setNewCourseTitle} onNewCourseSlugChange={setNewCourseSlug} /></>}
      {stepIndex === 2 && <SubmitStepDetails scope={scope} materialType={materialType} sourceMode={sourceMode} title={title} term={term} summary={summary} externalLink={externalLink} anonymous={anonymous} onMaterialTypeChange={setMaterialType} onSourceModeChange={setSourceMode} onTitleChange={setTitle} onTermChange={setTerm} onSummaryChange={setSummary} onExternalLinkChange={setExternalLink} onAnonymousChange={setAnonymous} />}
      {stepIndex === 3 && <SubmitStepPreview targetLabel={targetLabel} issueTitle={preview.issueTitle} issueBody={preview.issueBody} anonymous={anonymous} issueUrl={preview.issueUrl} sourceMode={sourceMode} externalLink={externalLink} hasNewTarget={track?.mode === "new" || course.mode === "new"} />}
      <div className={styles.actions}><button className="button button--secondary" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => value - 1)} type="button">Back</button><button className="button button--primary" disabled={!canGoNext || stepIndex === 3} onClick={() => setStepIndex((value) => value + 1)} type="button">Next</button></div>
    </div>
  </div>;
}
