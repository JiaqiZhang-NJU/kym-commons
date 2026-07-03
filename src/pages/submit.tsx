import Layout from "@theme/Layout";
import SubmitWizard from "../components/submit/SubmitWizard";

export default function SubmitPage() {
  return (
    <Layout title="Submit">
      <main className="container margin-vert--lg">
        <h1>Submit Materials</h1>
        <p>按步骤整理投稿信息，预览生成内容后再跳转到 GitHub Issue 完成提交。</p>
        <SubmitWizard />
      </main>
    </Layout>
  );
}
