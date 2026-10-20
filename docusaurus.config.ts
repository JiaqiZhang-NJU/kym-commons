import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const projectName = 'kym-commons';
const organizationName = process.env.GITHUB_REPOSITORY_OWNER ?? 'JiaqiZhang-NJU';
const siteUrl = process.env.KYM_SITE_URL ?? 'http://localhost:3000';
const baseUrl = process.env.KYM_BASE_URL ?? '/';

const config: Config = {
  title: 'KYM Commons',
  tagline: '匡院资料站',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: siteUrl,
  baseUrl,
  organizationName,
  projectName,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: `https://github.com/${organizationName}/${projectName}/tree/main/`,
          exclude: ['superpowers/**'],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: ["./src/plugins/catalogRoutes.ts"],

  themeConfig: {
    image: 'img/docusaurus-social-card.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'KYM Commons',
      logo: {
        alt: 'KYM Commons Logo',
        src: 'img/logo.svg',
      },
      items: [
        {to: '/', label: '首页', position: 'left', activeBaseRegex: '^/$'},
        {to: '/foundation', label: '基础课程', position: 'left'},
        {to: '/tracks', label: '各方向资料', position: 'left'},
        {to: '/browse', label: '找资料', position: 'left'},
        {to: '/submit', label: '分享资料', position: 'left'},
        {to: '/docs/rules', label: '投稿规则', position: 'left'},
        {to: '/docs/about', label: '关于本站', position: 'left'},
        {
          href: `https://github.com/${organizationName}/${projectName}`,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
        {
          title: 'KYM Commons',
          items: [
            {label: '基础课程', to: '/foundation'},
            {label: '各方向资料', to: '/tracks'},
          ],
        },
        {
          title: '一起分享',
          items: [
            {label: '分享资料', to: '/submit'},
            {label: '投稿规则', to: '/docs/rules'},
          ],
        },
        {
          title: '了解本站',
          items: [
            {label: '关于本站', to: '/docs/about'},
            {label: 'GitHub', href: `https://github.com/${organizationName}/${projectName}`},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} KYM Commons.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
