import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
export default defineConfig({
  output: 'static',
  integrations: [starlight({
    title: 'Масляница · Белград',
    defaultLocale: 'root',
    locales: { root: { label: 'Русский', lang: 'ru' } },
    favicon: '/icon.svg',
    customCss: ['./src/styles/app.css'],
    components: { Header: './src/components/Header.astro' },
    head: [
      { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' } },
      { tag: 'meta', attrs: { name: 'theme-color', content: '#d99b00' } },
      { tag: 'script', attrs: { src: '/app.js', defer: true } }
    ],
    pagination: false,
    lastUpdated: false,
    credits: false
  })]
});
