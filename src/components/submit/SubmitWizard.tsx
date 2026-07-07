import { useMemo, useState } from "react";

import { FOUNDATION_COURSES, TRACK_COURSES } from "../../data/courses";
import { TRACKS } from "../../data/site";
import {
  buildIssueBody,
  buildIssueTitle,
  buildIssueUrl,
  getDefaultMaterialType,
  getDefaultSourceMode,
  getResolvedCourseTitle,
  isDetailsStepComplete,
  isScopeStepComplete,
  isTargetStepComplete,
  type FileSourceMode,
  type MaterialType,
  type SubmissionScope,
} from "../../lib/submission";
import SubmitStepDetails from "./SubmitStepDetails";
import SubmitStepPreview from "./SubmitStepPreview";
import SubmitStepScope from "./SubmitStepScope";
import SubmitStepTarget from "./SubmitStepTarget";
import styles from "./submit.module.css";

const steps = ["投稿类型", "归属位置", "资料详情", "预览提交"];

export default function SubmitWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [scope, setScope] = useState<SubmissionScope>("track-general");
  const [trackSlug, setTrackSlug] = useState("cs");
  const [existingCourseSlug, setExistingCourseSlug] = useState("general-resources");
  const [useNewCourse, setUseNewCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [materialType, setMaterialType] = useState<MaterialType>(getDefaultMaterialType("track-general"));
  const [sourceMode, setSourceMode] = useState<FileSourceMode>(getDefaultSourceMode());
  const [title, setTitle] = useState("");
  const [term, setTerm] = useState("2026 Spring");
  const [summary, setSummary] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [anonymous, setAnonymous] = useState(true);

  const trackLabel = TRACKS.find((track) => track.slug === trackSlug)?.label ?? null;
  const selectedTrackCourses = TRACK_COURSES[trackSlug as keyof typeof TRACK_COURSES] ?? [];
  const selectedCourseTitle =
    scope === "foundation-course"
      ? FOUNDATION_COURSES.find((course) => course.slug === existingCourseSlug)?.title ?? ""
      : selectedTrackCourses.find((course) => course.slug === existingCourseSlug)?.title ?? "";

  const courseTitle = getResolvedCourseTitle({
    scope,
    useNewCourse,
    newCourseTitle,
    selectedCourseTitle,
  });

  const sectionLabel = scope === "foundation-course" ? "大类培养课程" : "宽口径方向课程";
  const targetLabel =
    scope === "foundation-course"
      ? `Foundation / ${courseTitle}`
      : `${trackLabel ?? "未选择方向"} / ${courseTitle}`;

  const preview = useMemo(() => {
    const issueTitle = buildIssueTitle({ scope, trackLabel, courseTitle, term, materialType });
    const issueBody = buildIssueBody({
      scope,
      sectionLabel,
      trackLabel,
      courseTitle,
      materialType,
      title,
      term,
      summary,
      sourceMode,
      externalLink,
      anonymous,
    });

    return {
      issueTitle,
      issueBody,
      issueUrl: buildIssueUrl({
        repoUrl: "https://github.com/JiaqiZhang-NJU/kym-commons",
        title: issueTitle,
        body: issueBody,
      }),
    };
  }, [anonymous, courseTitle, externalLink, materialType, scope, sectionLabel, sourceMode, summary, term, title, trackLabel]);

  const canGoNext =
    stepIndex === 0
      ? isScopeStepComplete(scope)
      : stepIndex === 1
        ? isTargetStepComplete({ scope, trackSlug, useNewCourse, existingCourseSlug, newCourseTitle })
        : stepIndex === 2
          ? isDetailsStepComplete({ title, term, summary, sourceMode, externalLink })
          : true;

  const handleScopeChange = (nextScope: SubmissionScope) => {
    setScope(nextScope);
    setMaterialType(getDefaultMaterialType(nextScope));
    if (nextScope === "track-general") {
      setUseNewCourse(false);
      setExistingCourseSlug("general-resources");
    }
  };

  return (
    <div className={styles.wizardShell}>
      <div className={styles.stepper}>
        {steps.map((step, index) => (
          <div key={step} className={`${styles.stepCard} ${index === stepIndex ? styles.stepCardActive : ""}`}>
            <strong>
              {index + 1}. {step}
            </strong>
          </div>
        ))}
      </div>

      <div className={styles.panel}>
        {stepIndex === 0 && <SubmitStepScope scope={scope} onSelect={handleScopeChange} />}
        {stepIndex === 1 && (
          <SubmitStepTarget
            scope={scope}
            trackSlug={trackSlug}
            existingCourseSlug={existingCourseSlug}
            useNewCourse={useNewCourse}
            newCourseTitle={newCourseTitle}
            onTrackChange={setTrackSlug}
            onExistingCourseChange={setExistingCourseSlug}
            onUseNewCourseChange={setUseNewCourse}
            onNewCourseTitleChange={setNewCourseTitle}
          />
        )}
        {stepIndex === 2 && (
          <SubmitStepDetails
            scope={scope}
            materialType={materialType}
            sourceMode={sourceMode}
            title={title}
            term={term}
            summary={summary}
            externalLink={externalLink}
            anonymous={anonymous}
            onMaterialTypeChange={setMaterialType}
            onSourceModeChange={setSourceMode}
            onTitleChange={setTitle}
            onTermChange={setTerm}
            onSummaryChange={setSummary}
            onExternalLinkChange={setExternalLink}
            onAnonymousChange={setAnonymous}
          />
        )}
        {stepIndex === 3 && (
          <SubmitStepPreview
            targetLabel={targetLabel}
            issueTitle={preview.issueTitle}
            issueBody={preview.issueBody}
            anonymous={anonymous}
            issueUrl={preview.issueUrl}
            sourceMode={sourceMode}
            externalLink={externalLink}
          />
        )}

        <div className={styles.actions}>
          <button
            className="button button--secondary"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((value) => value - 1)}
            type="button"
          >
            Back
          </button>
          <button
            className="button button--primary"
            disabled={!canGoNext || stepIndex === 3}
            onClick={() => setStepIndex((value) => value + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
