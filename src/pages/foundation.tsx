import Layout from "@theme/Layout";

import CourseCard from "../components/CourseCard";
import { buildCanonicalCoursePath, getFoundationCourses } from "../catalog/runtime";

export default function FoundationPage() {
  return (
    <Layout title="基础课程">
      <main className="container margin-vert--lg">
        <header className="kym-page-heading"><div><h1>基础课程</h1><p>前三学期基础课程资料。</p></div></header>
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
