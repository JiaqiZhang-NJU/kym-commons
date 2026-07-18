import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

import SectionCard from '@site/src/components/SectionCard';
import styles from './index.module.css';

export default function Home(): ReactNode {
  const browseUrl = useBaseUrl('/browse');

  return (
    <Layout title="KYM Commons" description="匡院资料站">
      <main className="container margin-vert--xl">
        <section className={`hero hero--primary ${styles.heroBanner}`}>
          <div className="container">
            <h1 className="hero__title">KYM Commons</h1>
            <p className="hero__subtitle">匡院资料站</p>
            <p className={styles.subtitle}>
              A curated academic materials platform for Foundation courses, track-based learning, and shared disciplinary resources.
            </p>
            <form className={styles.searchForm} action={browseUrl} method="get" role="search">
              <label className={styles.searchLabel} htmlFor="home-material-search">
                直接查找资料
              </label>
              <div className={styles.searchRow}>
                <input
                  id="home-material-search"
                  className={styles.searchInput}
                  type="search"
                  name="q"
                  placeholder="输入课程名、资料标题或多个关键词"
                  autoComplete="off"
                />
                <button className="button button--secondary button--lg" type="submit">
                  搜索资料
                </button>
              </div>
              <div className={styles.searchSuggestions} aria-label="常用搜索">
                <span>试试：</span>
                <Link to="/browse?q=期末试卷">期末试卷</Link>
                <Link to="/browse?q=机器学习">机器学习</Link>
                <Link to="/browse?q=大学物理">大学物理</Link>
              </div>
            </form>
            <div className={styles.buttons}>
              <Link className="button button--secondary button--lg" to="/browse">
                Browse Materials
              </Link>
              <Link className="button button--outline button--secondary button--lg" to="/submit">
                Submit Materials
              </Link>
            </div>
          </div>
        </section>

        <section className="row margin-top--xl">
          <div className="col col--4">
            <SectionCard title="Foundation" description="系统整理前三学期大类培养课程相关资料与参考内容" to="/foundation" />
          </div>
          <div className="col col--4">
            <SectionCard title="Tracks" description="按宽口径方向组织课程资料与 General Resources" to="/tracks" />
          </div>
          <div className="col col--4">
            <SectionCard title="Browse" description="按方向、课程与资料类型进行统一检索与浏览" to="/browse" />
          </div>
        </section>

        <section className="margin-top--xl">
          <h2>Platform Overview</h2>
          <p>
            KYM Commons 以课程与方向为主线组织资料内容，通过统一的投稿、审核与发布流程，支持课程资料沉淀、
            方向资源整理与长期维护。
          </p>
        </section>
      </main>
    </Layout>
  );
}
