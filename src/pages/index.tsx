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
            <p className={styles.subtitle}>A shared course materials hub for the academy.</p>
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
            <SectionCard title="Foundation" description="前三学期大类培养课程资料" to="/foundation" />
          </div>
          <div className="col col--4">
            <SectionCard title="Tracks" description="宽口径方向课程与 General Resources" to="/tracks" />
          </div>
          <div className="col col--4">
            <SectionCard title="Browse" description="按方向、课程、资料类型快速检索" to="/browse" />
          </div>
        </section>

        <section className="margin-top--xl">
          <h2>How It Works</h2>
          <p>Browse Foundation courses, explore track-level General Resources, and submit curated links through the built-in review flow.</p>
        </section>
      </main>
    </Layout>
  );
}
