import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {runtimeCatalog, catalogPackages} from '../catalog/runtime';
import SectionCard from '../components/SectionCard';
import styles from './index.module.css';

export default function Home(): ReactNode {
  const browseUrl = useBaseUrl('/browse');
  return (
    <Layout title="匡院资料站" description="查找课程资料，分享笔记与学习经验。">
      <main className={'container margin-vert--lg ' + styles.home}>
        <header className="kym-page-heading">
          <div><h1>匡院资料站</h1></div>
          <Link className="button button--secondary" to="/submit">分享资料 ↗</Link>
        </header>
        <section className={styles.searchSection}>
          <form action={browseUrl} method="get" role="search">
            <label className={styles.searchLabel} htmlFor="home-material-search">搜索课程或资料</label>
            <div className={styles.searchRow}>
              <input id="home-material-search" type="search" name="q" placeholder="输入课程名、资料标题或关键词" autoComplete="off" />
              <button className="button button--primary" type="submit">搜索资料</button>
            </div>
          </form>
          <div className={styles.suggestions} aria-label="常用搜索">
            <span>常用搜索</span><Link to="/browse?q=期末试卷">期末试卷</Link><Link to="/browse?q=机器学习">机器学习</Link><Link to="/browse?q=大学物理">大学物理</Link>
          </div>
        </section>
        <section className={styles.directory} aria-labelledby="directory-title">
          <div className={styles.sectionHeading}><h2 id="directory-title">按课程和方向找</h2><Link to="/browse">查看全部资料 →</Link></div>
          <div className={styles.entryGrid}>
            <SectionCard title="基础课程" description="前三学期基础课程资料。" to="/foundation" />
            <SectionCard title="各方向资料" description="课程资料、入门指南和参考书目。" to="/tracks" />
            <SectionCard title="找资料" description="按关键词、课程、分类和学期筛选。" to="/browse" />
          </div>
        </section>
        <section className={styles.summary} aria-label="资料统计">
          <dl className={styles.stats}><div><dt>收录资料</dt><dd>{catalogPackages.length}<small> 份</small></dd></div><div><dt>学习方向</dt><dd>{runtimeCatalog.tracks.length}<small> 个</small></dd></div></dl>
        </section>
        <p className={styles.note}>收藏保存在当前浏览器中。</p>
      </main>
    </Layout>
  );
}
