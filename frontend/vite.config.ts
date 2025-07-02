import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		allowedHosts: ["nathanlee.ngrok.io"]
	},
	resolve: {
    alias: {
      '@libsql/client$': '@libsql/client/web',
      '@libsql/client/index.js': '@libsql/client/web',
    },
  },
});
