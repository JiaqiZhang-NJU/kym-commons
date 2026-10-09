import useBaseUrl from "@docusaurus/useBaseUrl";
import { useEffect, useMemo, useRef, useState } from "react";

import { getCourse, runtimeCatalog } from "../../catalog/runtime";
import {
  buildSubmissionManifest, formatFileSize, getDefaultMaterialType, getDefaultSourceMode, getSubmissionFileError,
  getFirstExistingCourseSlug, isDetailsStepComplete, isScopeStepComplete, isTargetStepComplete,
  submissionRequest, uploadSubmissionFile,
  type CourseTargetMode, type NativeFileSourceMode, type MaterialType, type SubmissionPrefill,
  type SubmissionScope, type SubmissionLimits, type TargetCourse, type TargetTrack, type TrackTargetMode, type UploadSession,
} from "../../lib/submission";
import SubmitStepDetails from "./SubmitStepDetails";
import SubmitStepPreview from "./SubmitStepPreview";
import SubmitStepScope from "./SubmitStepScope";
import SubmitStepTarget from "./SubmitStepTarget";
import styles from "./submit.module.css";

const steps = ["投稿类型", "归属位置", "资料详情", "预览提交"];
type Props = { initialTarget?: SubmissionPrefill | null };

export default function SubmitWizard({ initialTarget }: Props) {
  const apiUrl = useBaseUrl("/api/submissions");
  const configUrl = useBaseUrl("/api/config");
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
  const [sourceMode, setSourceMode] = useState<NativeFileSourceMode>(getDefaultSourceMode());
  const [title, setTitle] = useState("");
  const [term, setTerm] = useState("");
  const [summary, setSummary] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [confirmedPrivacy, setConfirmedPrivacy] = useState(false);
  const [confirmedRights, setConfirmedRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ label: "", bytes: 0 });
  const [submittedId, setSubmittedId] = useState("");
  const [limits, setLimits] = useState<SubmissionLimits>();
  const uploadAttempt = useRef<{ fingerprint: string; files: File[]; key: string; record?: UploadSession; uploadedIds: Set<string> } | null>(null);
  useEffect(() => {
    let active = true;
    void submissionRequest<SubmissionLimits>(configUrl).then((value) => { if (active) setLimits(value); }).catch(() => { /* The submission API still validates its limits. */ });
    return () => { active = false; };
  }, [configUrl]);

  const track: TargetTrack | null = scope === "foundation-course" ? null : trackTargetMode === "new"
    ? { mode: "new", slug: newTrackSlug.trim(), label: newTrackLabel.trim() }
    : { mode: "existing", slug: existingTrackSlug, label: runtimeCatalog.tracks.find((item) => item.slug === existingTrackSlug)?.label ?? "未选择方向" };
  const selectedCourse = scope === "foundation-course"
    ? getCourse({ section: "foundation", courseSlug: existingCourseSlug })
    : getCourse({ section: "track", trackSlug: existingTrackSlug, courseSlug: existingCourseSlug });
  const course: TargetCourse = scope === "track-general"
    ? { mode: "existing", slug: "general-resources", title: "General Resources" }
    : courseTargetMode === "new" || (scope === "track-course" && trackTargetMode === "new")
      ? { mode: "new", slug: newCourseSlug.trim(), title: newCourseTitle.trim() }
      : { mode: "existing", slug: existingCourseSlug, title: selectedCourse?.title ?? "未选择课程" };
  const sectionLabel = scope === "foundation-course" ? "大类培养课程" : "宽口径方向课程";
  const targetLabel = scope === "foundation-course" ? `Foundation / ${course.title}` : `${track?.label ?? "未选择方向"} / ${course.title}`;
  const targetState = { scope, trackTargetMode, existingTrackSlug, newTrackLabel, newTrackSlug, courseTargetMode, existingCourseSlug, newCourseTitle, newCourseSlug };

  const manifest = useMemo(() => {
    const payload = { scope, sectionLabel, track, course, materialType, title, term, summary, sourceMode, externalLink, anonymous };
    return buildSubmissionManifest(payload);
  }, [anonymous, course, externalLink, materialType, scope, sectionLabel, sourceMode, summary, term, title, track]);

  const fileError = sourceMode === "upload" ? getSubmissionFileError(files, limits) : "";
  const canGoNext = stepIndex === 0 ? isScopeStepComplete(scope)
    : stepIndex === 1 ? isTargetStepComplete(targetState)
      : stepIndex === 2 ? isDetailsStepComplete({ title, term, summary, sourceMode, externalLink, files }) && !fileError : true;
  const canSubmit = isTargetStepComplete(targetState) && isDetailsStepComplete({ title, term, summary, sourceMode, externalLink, files }) && !fileError && confirmedPrivacy && confirmedRights;
  const selectedFiles = sourceMode === "upload" ? files : [];
  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  const handleSubmit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true); setError("");
    const fileMetadata = selectedFiles.map((file) => ({ name: file.name, size: file.size, type: file.type }));
    const fingerprint = JSON.stringify({ manifest, files: selectedFiles.map((file) => ({ name: file.name, size: file.size, type: file.type, lastModified: file.lastModified })) });
    if (uploadAttempt.current?.fingerprint !== fingerprint || uploadAttempt.current.files.some((file, index) => file !== selectedFiles[index])) {
      const random = Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, "0")).join("");
      uploadAttempt.current = { fingerprint, files: selectedFiles.slice(), key: `web-${random}`, uploadedIds: new Set() };
    }
    const attempt = uploadAttempt.current!;
    try {
      setProgress({ label: "正在登记投稿…", bytes: 0 });
      if (!attempt.record) {
        attempt.record = await submissionRequest<UploadSession>(apiUrl, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ manifest, files: fileMetadata, idempotencyKey: attempt.key }),
        });
      }
      const record = attempt.record;
      if (record.status === "uploading") {
        if (record.files.length !== selectedFiles.length || record.files.some((file, index) => !file.id || file.name !== selectedFiles[index].name || file.size !== selectedFiles[index].size)) {
          throw new Error("服务器返回的文件清单与所选文件不一致，请联系维护者。");
        }
        let completedBytes = record.files.reduce((sum, file, index) => sum + (attempt.uploadedIds.has(file.id) ? selectedFiles[index].size : 0), 0);
        for (let index = 0; index < selectedFiles.length; index++) {
          const file = selectedFiles[index];
          const serverFile = record.files[index];
          if (attempt.uploadedIds.has(serverFile.id)) continue;
          const label = `正在上传 ${index + 1}/${selectedFiles.length}：${file.name}`;
          setProgress({ label, bytes: completedBytes });
          await uploadSubmissionFile(`${apiUrl}/${encodeURIComponent(record.id)}/files/${encodeURIComponent(serverFile.id)}`, record.uploadToken, file, (bytes) => setProgress({ label, bytes: completedBytes + bytes }));
          attempt.uploadedIds.add(serverFile.id);
          completedBytes += file.size;
        }
        setProgress({ label: "正在提交审核…", bytes: totalBytes });
        await submissionRequest(`${apiUrl}/${encodeURIComponent(record.id)}/complete`, {
          method: "POST", headers: { Authorization: `Bearer ${record.uploadToken}` },
        });
      }
      setSubmittedId(record.id);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "提交失败，请稍后重试。");
    } finally { setBusy(false); }
  };

  const handleScopeChange = (nextScope: SubmissionScope) => {
    setScope(nextScope); setMaterialType(getDefaultMaterialType(nextScope));
    setCourseTargetMode(nextScope === "track-course" && trackTargetMode === "new" ? "new" : "existing");
    setExistingCourseSlug(getFirstExistingCourseSlug(nextScope, existingTrackSlug));
  };
  const handleTrackModeChange = (mode: TrackTargetMode) => {
    setTrackTargetMode(mode);
    if (mode === "new" && scope === "track-course") setCourseTargetMode("new");
    if (mode === "existing") setExistingCourseSlug(getFirstExistingCourseSlug(scope, existingTrackSlug));
  };
  const handleExistingTrackChange = (slug: string) => { setExistingTrackSlug(slug); setExistingCourseSlug(getFirstExistingCourseSlug(scope, slug)); };
  const handleCourseModeChange = (mode: CourseTargetMode) => setCourseTargetMode(mode);

  if (submittedId) return <div className={styles.panel} role="status"><h2>投稿已收到</h2><p>投稿编号：<code>{submittedId}</code></p><p>维护者审核通过并完成发布后，资料会出现在对应目录。</p><p className={styles.muted}>可以保存投稿编号，便于向维护者询问审核进度。</p></div>;

  return <div className={styles.wizardShell}>
    <div className={styles.stepper}>{steps.map((step, index) => <div key={step} className={`${styles.stepCard} ${index === stepIndex ? styles.stepCardActive : ""}`}><strong>{index + 1}. {step}</strong></div>)}</div>
    <div className={styles.panel}>
      <fieldset disabled={busy} className={styles.fieldsetReset}>
      {stepIndex === 0 && <SubmitStepScope scope={scope} onSelect={handleScopeChange} />}
      {stepIndex === 1 && <>{initialTarget && <p className={styles.prefillNotice}>已根据课程页预填投稿位置，请在下方确认或修改。</p>}<SubmitStepTarget scope={scope} trackTargetMode={trackTargetMode} existingTrackSlug={existingTrackSlug} newTrackLabel={newTrackLabel} newTrackSlug={newTrackSlug} courseTargetMode={courseTargetMode} existingCourseSlug={existingCourseSlug} newCourseTitle={newCourseTitle} newCourseSlug={newCourseSlug} onTrackTargetModeChange={handleTrackModeChange} onExistingTrackChange={handleExistingTrackChange} onNewTrackLabelChange={setNewTrackLabel} onNewTrackSlugChange={setNewTrackSlug} onCourseTargetModeChange={handleCourseModeChange} onExistingCourseChange={setExistingCourseSlug} onNewCourseTitleChange={setNewCourseTitle} onNewCourseSlugChange={setNewCourseSlug} /></>}
      {stepIndex === 2 && <SubmitStepDetails scope={scope} materialType={materialType} sourceMode={sourceMode} title={title} term={term} summary={summary} externalLink={externalLink} anonymous={anonymous} files={files} limits={limits} fileError={fileError} onFilesChange={setFiles} onMaterialTypeChange={setMaterialType} onSourceModeChange={setSourceMode} onTitleChange={setTitle} onTermChange={setTerm} onSummaryChange={setSummary} onExternalLinkChange={setExternalLink} onAnonymousChange={setAnonymous} />}
      {stepIndex === 3 && <SubmitStepPreview targetLabel={targetLabel} manifest={manifest} files={selectedFiles} hasNewTarget={track?.mode === "new" || course.mode === "new"} confirmedPrivacy={confirmedPrivacy} confirmedRights={confirmedRights} onPrivacyChange={setConfirmedPrivacy} onRightsChange={setConfirmedRights} />}
      <div className={styles.actions}><button className="button button--secondary" disabled={stepIndex === 0} onClick={() => setStepIndex((value) => value - 1)} type="button">上一步</button>{stepIndex === 3 ? <button className="button button--primary" disabled={!canSubmit} onClick={handleSubmit} type="button">{error ? "重试提交" : "提交审核"}</button> : <button className="button button--primary" disabled={!canGoNext} onClick={() => setStepIndex((value) => value + 1)} type="button">下一步</button>}</div>
      </fieldset>
      {busy && <div className={styles.uploadProgress} role="status" aria-live="polite"><p>{progress.label}</p>{totalBytes > 0 && <><progress max={totalBytes} value={Math.min(progress.bytes, totalBytes)} /><p>{formatFileSize(Math.min(progress.bytes, totalBytes))} / {formatFileSize(totalBytes)}</p></>}</div>}
      {error && <p className={styles.error} role="alert">{error} 已填写内容和文件选择会保留。</p>}
    </div>
  </div>;
}
