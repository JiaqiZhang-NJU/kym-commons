import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

import SectionCard from '@site/src/components/SectionCard';
import styles from './index.module.css';

export default function Home(): ReactNode {
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
