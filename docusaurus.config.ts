import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const projectName = 'kym-commons';
const organizationName = process.env.GITHUB_REPOSITORY_OWNER ?? 'kanashimi';
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const config: Config = {
  title: 'KYM Commons',
  tagline: '匡院资料站',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: isGithubActions ? `https://${organizationName}.github.io` : 'http://localhost:3000',
  baseUrl: isGithubActions ? `/${projectName}/` : '/',
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

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
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
        {to: '/foundation', label: 'Foundation', position: 'left'},
        {to: '/tracks', label: 'Tracks', position: 'left'},
        {to: '/browse', label: 'Browse', position: 'left'},
        {to: '/submit', label: 'Submit', position: 'left'},
        {to: '/docs/rules', label: 'Rules', position: 'left'},
        {to: '/docs/about', label: 'About', position: 'left'},
        {
          href: `https://github.com/${organizationName}/${projectName}`,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'KYM Commons',
          items: [
            {label: 'Foundation', to: '/foundation'},
            {label: 'Tracks', to: '/tracks'},
          ],
        },
        {
          title: 'Contribute',
          items: [
            {label: 'Submit Materials', to: '/submit'},
            {label: 'Rules', to: '/docs/rules'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'About', to: '/docs/about'},
            {label: 'GitHub', href: `https://github.com/${organizationName}/${projectName}`},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} KYM Commons. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
