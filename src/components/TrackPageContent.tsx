import CourseCard from "./CourseCard";
import { buildCanonicalCoursePath, getTrackCourses } from "../catalog/runtime";
import { GENERAL_RESOURCES_SLUG } from "../lib/materials";

type TrackSlug = string;

type Props = {
  title: string;
  trackSlug: TrackSlug;
};

export default function TrackPageContent({ title, trackSlug }: Props) {
  const courses = getTrackCourses(trackSlug);

  return (
    <main className="container margin-vert--lg">
      <header className="kym-page-heading"><div><h1>{title}</h1><p>按课程查看资料，其他学习资源放在“方向通用资料”里。</p></div></header>
      <div className="row">
        {courses.map((course) => (
          <div className="col col--4" key={course.slug}>
            <CourseCard
              title={course.title}
              to={buildCanonicalCoursePath({ section: "track", trackSlug, courseSlug: course.slug })}
              isGeneral={course.slug === GENERAL_RESOURCES_SLUG}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
