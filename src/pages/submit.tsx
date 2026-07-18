import { useLocation } from "@docusaurus/router";
import Layout from "@theme/Layout";
import { useMemo } from "react";
import SubmitWizard from "../components/submit/SubmitWizard";
import { parseSubmissionPrefill } from "../lib/submission";

export default function SubmitPage() {
  const location = useLocation();
  const initialTarget = useMemo(
    () => parseSubmissionPrefill(location.search),
    [location.search]
  );

  return (
    <Layout title="Submit">
      <main className="container margin-vert--lg">
        <h1>Submit Materials</h1>
        <p>按步骤整理投稿信息，预览生成内容后再跳转到 GitHub Issue 完成提交。</p>
        <SubmitWizard key={location.search} initialTarget={initialTarget} />
      </main>
    </Layout>
  );
}
