import Layout from "@theme/Layout";
import { useMemo, useState } from "react";

import { FOUNDATION_COURSES, TRACK_COURSES } from "../data/courses";
import { TRACKS } from "../data/site";
import { buildIssueBody, buildIssueTitle, buildIssueUrl, type SubmissionScope } from "../lib/submission";

const COURSE_TYPES = ["课程笔记", "作业经验", "历年题/回忆", "参考资料", "FAQ"];
const GENERAL_TYPES = ["方向导引", "经验分享", "科研入门", "竞赛/项目", "工具资源", "书单/参考资源", "其他"];

export default function SubmitPage() {
  const [scope, setScope] = useState<SubmissionScope>("track-general");
  const [trackSlug, setTrackSlug] = useState("cs");
  const [existingCourseSlug, setExistingCourseSlug] = useState("general-resources");
  const [useNewCourse, setUseNewCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [title, setTitle] = useState("");
  const [term, setTerm] = useState("2026 Spring");
  const [summary, setSummary] = useState("");
  const [link, setLink] = useState("");
  const [anonymous, setAnonymous] = useState(true);

  const trackLabel = TRACKS.find((track) => track.slug === trackSlug)?.label ?? null;
  const selectedTrackCourses = TRACK_COURSES[trackSlug as keyof typeof TRACK_COURSES] ?? [];
  const selectedCourseTitle =
    scope === "foundation-course"
      ? FOUNDATION_COURSES.find((course) => course.slug === existingCourseSlug)?.title ?? ""
      : selectedTrackCourses.find((course) => course.slug === existingCourseSlug)?.title ?? "";

  const courseTitle =
    scope === "track-general"
      ? "General Resources"
      : useNewCourse
        ? newCourseTitle || "新课程"
        : selectedCourseTitle;

  const materialType = scope === "track-general" ? GENERAL_TYPES[2] : COURSE_TYPES[0];
  const sectionLabel = scope === "foundation-course" ? "大类培养课程" : "宽口径方向课程";

  const preview = useMemo(() => {
    const issueTitle = buildIssueTitle({
      scope,
      trackLabel,
      courseTitle,
      term,
      materialType,
    });

    const issueBody = buildIssueBody({
      scope,
      sectionLabel,
      trackLabel,
      courseTitle,
      materialType,
      title,
      term,
      summary,
      link,
      anonymous,
    });

    return {
      issueTitle,
      issueBody,
      issueUrl: buildIssueUrl({
        repoUrl: "https://github.com/kanashimi/kym-commons",
        title: issueTitle,
        body: issueBody,
      }),
    };
  }, [anonymous, courseTitle, link, materialType, scope, sectionLabel, summary, term, title, trackLabel]);

  return (
    <Layout title="Submit">
      <main className="container margin-vert--lg">
        <h1>Submit Materials</h1>
        <p>先在站内整理投稿信息，再跳转到 GitHub Issue 完成提交。</p>

        <div className="row">
          <div className="col col--6">
            <label className="margin-bottom--sm">
              <strong>投稿类型</strong>
              <select className="margin-top--sm" value={scope} onChange={(event) => setScope(event.target.value as SubmissionScope)}>
                <option value="foundation-course">大类培养课程</option>
                <option value="track-course">方向课程</option>
                <option value="track-general">方向非课程资料</option>
              </select>
            </label>

            {scope !== "foundation-course" && (
              <label className="margin-bottom--sm">
                <strong>所属方向</strong>
                <select className="margin-top--sm" value={trackSlug} onChange={(event) => setTrackSlug(event.target.value)}>
                  {TRACKS.map((track) => (
                    <option key={track.slug} value={track.slug}>
                      {track.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {scope !== "track-general" && (
              <>
                <label className="margin-bottom--sm">
                  <input
                    type="checkbox"
                    checked={useNewCourse}
                    onChange={(event) => setUseNewCourse(event.target.checked)}
                  />{" "}
                  新增课程
                </label>

                {useNewCourse ? (
                  <label className="margin-bottom--sm">
                    <strong>课程名称</strong>
                    <input
                      className="margin-top--sm"
                      value={newCourseTitle}
                      onChange={(event) => setNewCourseTitle(event.target.value)}
                      placeholder="输入新课程名称"
                    />
                  </label>
                ) : (
                  <label className="margin-bottom--sm">
                    <strong>已有课程</strong>
                    <select
                      className="margin-top--sm"
                      value={existingCourseSlug}
                      onChange={(event) => setExistingCourseSlug(event.target.value)}
                    >
                      {(scope === "foundation-course" ? FOUNDATION_COURSES : selectedTrackCourses).map((course) => (
                        <option key={course.slug} value={course.slug}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}

            <label className="margin-bottom--sm">
              <strong>资料标题</strong>
              <input className="margin-top--sm" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：机器学习入门资源整理" />
            </label>

            <label className="margin-bottom--sm">
              <strong>学期或时间</strong>
              <input className="margin-top--sm" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="2026 Spring" />
            </label>

            <label className="margin-bottom--sm">
              <strong>简介</strong>
              <textarea
                className="margin-top--sm"
                rows={5}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="简要说明资料内容、适用人群和使用建议"
              />
            </label>

            <label className="margin-bottom--sm">
              <strong>资料链接</strong>
              <input className="margin-top--sm" value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://..." />
            </label>

            <label className="margin-bottom--sm">
              <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} /> 匿名发布
            </label>
          </div>

          <div className="col col--6">
            <h2>Preview</h2>
            <pre>{preview.issueTitle}</pre>
            <pre>{preview.issueBody}</pre>
            <a className="button button--primary" href={preview.issueUrl} target="_blank" rel="noreferrer">
              Open GitHub Issue
            </a>
          </div>
        </div>
      </main>
    </Layout>
  );
}
