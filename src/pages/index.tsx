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
          <div><h1>匡院资料站</h1><p>把找资料的时间，留给学习。</p></div>
          <Link className="button button--secondary" to="/submit">分享资料 ↗</Link>
        </header>
        <section className={styles.searchSection}>
          <p className={styles.eyebrow}>KYM COMMONS</p>
          <h2>这次想找什么？</h2>
          <p className={styles.intro}>课程笔记、历年试卷、复习资料和学习经验，都可以从这里找起。</p>
          <form action={browseUrl} method="get" role="search">
            <label className={styles.searchLabel} htmlFor="home-material-search">搜索课程或资料</label>
            <div className={styles.searchRow}>
              <input id="home-material-search" type="search" name="q" placeholder="输入课程名、资料标题或关键词" autoComplete="off" />
              <button className="button button--primary" type="submit">搜索资料</button>
            </div>
          </form>
          <div className={styles.suggestions} aria-label="常用搜索">
            <span>试试</span><Link to="/browse?q=期末试卷">期末试卷</Link><Link to="/browse?q=机器学习">机器学习</Link><Link to="/browse?q=大学物理">大学物理</Link>
          </div>
        </section>
        <section className={styles.directory} aria-labelledby="directory-title">
          <div className={styles.sectionHeading}><h2 id="directory-title">按课程和方向找</h2><Link to="/browse">查看全部资料 →</Link></div>
          <div className={styles.entryGrid}>
            <SectionCard title="基础课程" description="前三学期的基础课，按课程查找笔记、试卷与参考资料。" to="/foundation" />
            <SectionCard title="各方向资料" description="查看各方向的课程资料，以及入门指南、书目和学习经验。" to="/tracks" />
            <SectionCard title="找资料" description="按关键词搜索，再用课程、分类和学期缩小范围。" to="/browse" />
          </div>
        </section>
        <section className={styles.community}>
          <div><h2>一起把资料补全</h2><p>你整理的笔记、踩过的坑，也许正好能帮到下一位同学。</p><Link to="/submit">分享一份资料 →</Link><span className={styles.ruleLink}><Link to="/docs/rules">先看看投稿规则</Link></span></div>
          <dl className={styles.stats}><div><dt>收录资料</dt><dd>{catalogPackages.length}<small> 份</small></dd></div><div><dt>学习方向</dt><dd>{runtimeCatalog.tracks.length}<small> 个</small></dd></div></dl>
        </section>
        <p className={styles.note}>资料由同学分享，审核后发布。收藏保存在当前浏览器中。</p>
      </main>
    </Layout>
  );
}
