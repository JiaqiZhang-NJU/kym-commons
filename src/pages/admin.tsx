import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import { useEffect, useState, type FormEvent } from "react";
import { formatFileSize, SubmissionRequestError, submissionRequest, type SubmissionManifest } from "../lib/submission";
import styles from "./admin.module.css";

type ReviewRecord = {
  id: string;
  manifest: SubmissionManifest;
  files: Array<{ id: string; name: string; size: number; sha256?: string; uploadedAt?: string }>;
  status: string;
  createdAt: string;
  reason?: string;
  publishError?: string;
};
type AdminStatus = {
  authenticated: boolean;
  csrfToken?: string;
  worker?: { running: boolean; lastError?: string | null };
  publishedRevision?: string | null;
  counts?: Record<string, number>;
};

const statusLabels: Record<string, string> = {
  uploading: "上传未完成",
  pending: "待审核",
  approved: "审核通过，等待发布",
  publishing: "正在发布",
  published: "已发布",
  rejected: "已退回",
  "publication-failed": "发布失败",
};

function displayTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN");
}

export default function AdminPage() {
  const apiUrl = useBaseUrl("/api/admin");
  const [status, setStatus] = useState<AdminStatus>({ authenticated: false });
  const [records, setRecords] = useState<ReviewRecord[]>([]);
  const [password, setPassword] = useState("");
  const [filter, setFilter] = useState("pending");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    try {
      const nextStatus = await submissionRequest<AdminStatus>(`${apiUrl}/status`);
      setStatus(nextStatus);
      if (nextStatus.authenticated) {
        const result = await submissionRequest<{ submissions: ReviewRecord[] }>(`${apiUrl}/submissions`);
        setRecords(result.submissions);
      } else { setRecords([]); }
    } catch (failure) {
      if (failure instanceof SubmissionRequestError && failure.status === 401) {
        setStatus({ authenticated: false }); setRecords([]);
      } else { throw failure; }
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try { await refresh(); }
      catch (failure) { if (active) setError(failure instanceof Error ? failure.message : "无法连接审核服务。"); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [apiUrl]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    if (!password || activeAction) return;
    setActiveAction("login"); setError("");
    try {
      await submissionRequest(`${apiUrl}/login`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-KYM-CSRF": "1" }, body: JSON.stringify({ password }),
      });
      setPassword("");
      await refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "登录失败。"); }
    finally { setActiveAction(""); }
  };

  const mutate = async (record: ReviewRecord, action: "approve" | "reject" | "retry") => {
    if (activeAction) return;
    const reason = (reasons[record.id] ?? "").trim();
    if (action === "reject" && !reason) { setError("退回前请填写原因，便于后续处理。"); return; }
    setActiveAction(`${record.id}:${action}`); setError(""); setNotice("");
    try {
      await submissionRequest(`${apiUrl}/submissions/${encodeURIComponent(record.id)}/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-KYM-CSRF": status.csrfToken ?? "" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      setNotice(action === "reject" ? "已退回投稿。" : action === "retry" ? "已重新安排发布，请刷新查看结果。" : "审核已通过，正在安排发布。发布完成后网站才会更新。");
      await refresh();
    } catch (failure) {
      if (failure instanceof SubmissionRequestError && failure.status === 401) { setStatus({ authenticated: false }); setRecords([]); }
      setError(failure instanceof Error ? failure.message : "操作失败，请刷新后重试。");
    }
    finally { setActiveAction(""); }
  };

  const logout = async () => {
    if (activeAction) return;
    setActiveAction("logout"); setError("");
    try {
      await submissionRequest(`${apiUrl}/logout`, { method: "POST", headers: { "X-KYM-CSRF": status.csrfToken ?? "" } });
      setStatus({ authenticated: false }); setRecords([]); setNotice(""); setPassword("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "退出失败，请重试。"); }
    finally { setActiveAction(""); }
  };

  const manualRefresh = async () => {
    if (loading || activeAction) return;
    setLoading(true); setError("");
    try { await refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "刷新失败。"); }
    finally { setLoading(false); }
  };
  const visibleRecords = records.filter((record) => filter === "all" || record.status === filter);

  return <Layout title="投稿审核" noFooter>
    <main className={`container margin-vert--lg ${styles.shell}`}>
      <h1>投稿审核</h1>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {loading && <p role="status">正在连接审核服务…</p>}
      {!status.authenticated ? <form className={styles.login} onSubmit={login}>
        <p>请使用管理员密码登录。</p>
        <label>管理员密码<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={!!activeAction} required /></label>
        <button type="submit" className="button button--primary" disabled={loading || !!activeAction || !password}>{activeAction === "login" ? "正在登录…" : "登录"}</button>
      </form> : <>
        <div className={styles.toolbar}>
          <label>查看<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">全部投稿（{records.length}）</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}（{records.filter((record) => record.status === value).length}）</option>)}</select></label>
          <div className={styles.actions}><button className="button button--secondary" type="button" onClick={manualRefresh} disabled={loading || !!activeAction}>刷新状态</button><button className="button button--secondary" type="button" onClick={logout} disabled={!!activeAction}>退出</button></div>
        </div>
        {status.worker?.running && <p className={styles.notice} role="status">发布服务正在处理任务，可刷新查看最新结果。</p>}
        {status.worker?.lastError && <p className={styles.error} role="alert">发布服务需要处理：{status.worker.lastError}</p>}
        <p className={styles.muted}>审核通过后，系统会构建并发布网站。请区分“审核通过”和“已发布”，发布失败时可以重试。</p>
        {visibleRecords.length === 0 && !loading && <p>当前没有{filter === "all" ? "" : `“${statusLabels[filter]}”`}投稿。</p>}
        <div className={styles.records}>{visibleRecords.map((record) => <article key={record.id} className={styles.record}>
          <div className={styles.recordHeading}><h2>{record.manifest.title}</h2><strong className={record.status === "publication-failed" ? styles.error : styles.badge}>{statusLabels[record.status] ?? record.status}</strong></div>
          <p className={styles.muted}>投稿编号：<code>{record.id}</code> · {displayTime(record.createdAt)}</p>
          <dl className={styles.details}>
            <dt>归属</dt><dd>{record.manifest.track?.label ?? "大类培养课程"} / {record.manifest.course.title}{(record.manifest.track?.mode === "new" || record.manifest.course.mode === "new") && "（含新建目录）"}</dd>
            <dt>类型 / 时间</dt><dd>{record.manifest.materialType} / {record.manifest.term}</dd>
            <dt>发布偏好</dt><dd>{record.manifest.anonymous ? "匿名发布" : "不匿名"}</dd>
            <dt>说明</dt><dd className={styles.summary}>{record.manifest.summary}</dd>
          </dl>
          {record.manifest.sourceMode === "external-link" && <p>外部链接：<a href={record.manifest.externalLink ?? undefined} target="_blank" rel="noopener noreferrer">{record.manifest.externalLink}</a></p>}
          {record.files.length > 0 && <ul className={styles.files}>{record.files.map((file) => <li key={file.id}><span>{file.name}（{formatFileSize(file.size)}）</span>{record.status !== "uploading" || file.sha256 || file.uploadedAt ? <a href={`${apiUrl}/submissions/${encodeURIComponent(record.id)}/files/${encodeURIComponent(file.id)}`} download>下载检查</a> : <span className={styles.muted}>尚未上传</span>}</li>)}</ul>}
          {record.reason && <p>审核备注：{record.reason}</p>}
          {record.publishError && <p className={styles.error}>发布失败原因：{record.publishError}</p>}
          {record.status === "pending" && <>
            <label className={styles.reason}>退回原因（退回时必填）<textarea rows={2} maxLength={2000} value={reasons[record.id] ?? ""} onChange={(event) => setReasons((previous) => ({ ...previous, [record.id]: event.target.value }))} disabled={!!activeAction} /></label>
            <div className={styles.actions}><button className="button button--primary" type="button" disabled={!!activeAction} onClick={() => mutate(record, "approve")}>审核通过并发布</button><button className="button button--secondary" type="button" disabled={!!activeAction} onClick={() => mutate(record, "reject")}>退回</button></div>
          </>}
          {record.status === "publication-failed" && <button className="button button--primary" type="button" disabled={!!activeAction} onClick={() => mutate(record, "retry")}>重试发布</button>}
          {activeAction.startsWith(`${record.id}:`) && <p role="status">正在处理…</p>}
        </article>)}</div>
      </>}
    </main>
  </Layout>;
}
