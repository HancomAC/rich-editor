/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{svelte,ts}'],
	corePlugins: {
		preflight: false
	},
	theme: {
		extend: {
			colors: {
				border: 'var(--border)',
				foreground: 'var(--foreground)',
				background: 'var(--background)',
				primary: {
					DEFAULT: 'var(--primary)',
					foreground: 'var(--primary-foreground)'
				},
				muted: {
					DEFAULT: 'var(--muted)',
					foreground: 'var(--muted-foreground)'
				},
				popover: 'var(--popover)',
				ring: 'var(--ring)',
				destructive: {
					DEFAULT: 'var(--destructive)',
					foreground: 'var(--destructive-foreground)'
				},
				accent: {
					DEFAULT: 'var(--accent)',
					foreground: 'var(--accent-foreground)'
				}
			}
		}
	}
};
