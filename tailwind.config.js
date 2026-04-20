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
			},
			borderRadius: {
				sm: 'var(--radius-sm, 2px)',
				DEFAULT: 'var(--radius-md, 4px)',
				md: 'var(--radius-md, 6px)',
				lg: 'var(--radius-xl, 8px)',
				xl: 'var(--radius-2xl, 12px)',
				'2xl': 'var(--radius-2xl, 12px)',
				'3xl': 'var(--radius-3xl, 16px)',
				full: '9999px'
			},
			boxShadow: {
				sm: 'var(--shadow-dropdown, 0 1px 2px 0 rgb(0 0 0 / 0.05))',
				DEFAULT: 'var(--shadow-dropdown, 0 1px 3px 0 rgb(0 0 0 / 0.1))',
				md: 'var(--shadow-dropdown, 0 4px 6px -1px rgb(0 0 0 / 0.1))',
				lg: 'var(--shadow-dropdown, 0 10px 15px -3px rgb(0 0 0 / 0.1))',
				xl: 'var(--shadow-popup, 0 20px 25px -5px rgb(0 0 0 / 0.1))',
				'2xl': 'var(--shadow-popup, 0 25px 50px -12px rgb(0 0 0 / 0.25))'
			}
		}
	}
};
