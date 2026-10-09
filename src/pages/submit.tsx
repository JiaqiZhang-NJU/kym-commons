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
    <Layout title="资料投稿">
      <main className="container margin-vert--lg">
        <h1>资料投稿</h1>
        <p>选择归属位置，填写说明并上传资料。维护者审核通过后会发布到网站。</p>
        <SubmitWizard key={location.search} initialTarget={initialTarget} />
      </main>
    </Layout>
  );
}
