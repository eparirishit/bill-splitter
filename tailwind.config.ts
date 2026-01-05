import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"], // Keep dark mode config even if styles are removed for now
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
            // Map colors directly to the CSS HSL variables
            background: 'hsl(var(--background-h) var(--background-s) var(--background-l))',
            foreground: 'hsl(var(--foreground-h) var(--foreground-s) var(--foreground-l))',
            card: {
                DEFAULT: 'hsl(var(--card-h) var(--card-s) var(--card-l))',
                foreground: 'hsl(var(--card-foreground-h) var(--card-foreground-s) var(--card-foreground-l))'
            },
            popover: {
                DEFAULT: 'hsl(var(--popover-h) var(--popover-s) var(--popover-l))',
                foreground: 'hsl(var(--popover-foreground-h) var(--popover-foreground-s) var(--popover-foreground-l))'
            },
            primary: {
                DEFAULT: 'hsl(var(--primary-h) var(--primary-s) var(--primary-l))',
                foreground: 'hsl(var(--primary-foreground-h) var(--primary-foreground-s) var(--primary-foreground-l))'
            },
            secondary: {
                DEFAULT: 'hsl(var(--secondary-h) var(--secondary-s) var(--secondary-l))',
                foreground: 'hsl(var(--secondary-foreground-h) var(--secondary-foreground-s) var(--secondary-foreground-l))'
            },
            muted: {
                DEFAULT: 'hsl(var(--muted-h) var(--muted-s) var(--muted-l))',
                foreground: 'hsl(var(--muted-foreground-h) var(--muted-foreground-s) var(--muted-foreground-l))'
            },
            accent: {
                DEFAULT: 'hsl(var(--accent-h) var(--accent-s) var(--accent-l))',
                foreground: 'hsl(var(--accent-foreground-h) var(--accent-foreground-s) var(--accent-foreground-l))'
            },
            destructive: {
                DEFAULT: 'hsl(var(--destructive-h) var(--destructive-s) var(--destructive-l))',
                foreground: 'hsl(var(--destructive-foreground-h) var(--destructive-foreground-s) var(--destructive-foreground-l))'
            },
            border: 'hsl(var(--border-h) var(--border-s) var(--border-l))',
            input: 'hsl(var(--input-h) var(--input-s) var(--input-l))',
            ring: 'hsl(var(--ring-h) var(--ring-s) var(--ring-l))',
            chart: {
                '1': 'hsl(var(--chart-1-h) var(--chart-1-s) var(--chart-1-l))',
                '2': 'hsl(var(--chart-2-h) var(--chart-2-s) var(--chart-2-l))',
                '3': 'hsl(var(--chart-3-h) var(--chart-3-s) var(--chart-3-l))',
                '4': 'hsl(var(--chart-4-h) var(--chart-4-s) var(--chart-4-l))',
                '5': 'hsl(var(--chart-5-h) var(--chart-5-s) var(--chart-5-l))'
            },
            splitwise: '#1cc08d',
             // Map sidebar colors as well, although not primary focus now
            sidebar: {
                DEFAULT: 'var(--sidebar-background)',
                foreground: 'var(--sidebar-foreground)',
                primary: 'var(--sidebar-primary)',
                'primary-foreground': 'var(--sidebar-primary-foreground)',
                accent: 'var(--sidebar-accent)',
                'accent-foreground': 'var(--sidebar-accent-foreground)',
                border: 'var(--sidebar-border)',
                ring: 'var(--sidebar-ring)'
            }
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.3s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
