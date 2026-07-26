import Layout from "@theme/Layout";

import CourseCard from "../components/CourseCard";
import { buildCanonicalCoursePath, getFoundationCourses } from "../catalog/runtime";

export default function FoundationPage() {
  return (
    <Layout title="Foundation">
      <main className="container margin-vert--lg">
        <h1>Foundation</h1>
        <p>前三学期的大类培养课程资料统一归档在这里。</p>
        <div className="row">
          {getFoundationCourses().map((course) => (
            <div className="col col--4" key={course.slug}>
              <CourseCard
                title={course.title}
                to={buildCanonicalCoursePath({ section: "foundation", courseSlug: course.slug })}
              />
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}
