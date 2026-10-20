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
    <Layout title="分享资料">
      <main className="container margin-vert--lg">
        <h1>分享资料</h1>
        <p>选好课程或方向，写几句介绍，再上传文件或贴上链接。审核通过后就会发布。</p>
        <SubmitWizard key={location.search} initialTarget={initialTarget} />
      </main>
    </Layout>
  );
}
