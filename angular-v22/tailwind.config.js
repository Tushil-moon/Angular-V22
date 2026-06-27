/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{html,ts,scss}'],
    darkMode: ['class'],
    future: {
        hoverOnlyWhenSupported: true,
    },
    theme: {
        extend: {
            colors: {
                border: 'color-mix(in oklch, var(--border) calc(<alpha-value> * 100%), transparent)',
                input: 'color-mix(in oklch, var(--input) calc(<alpha-value> * 100%), transparent)',
                ring: 'color-mix(in oklch, var(--ring) calc(<alpha-value> * 100%), transparent)',
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                primary: {
                    DEFAULT:
                        'color-mix(in oklch, var(--primary) calc(<alpha-value> * 100%), transparent)',
                    foreground: 'var(--primary-foreground)',
                },
                secondary: {
                    DEFAULT:
                        'color-mix(in oklch, var(--secondary) calc(<alpha-value> * 100%), transparent)',
                    foreground: 'var(--secondary-foreground)',
                },
                muted: {
                    DEFAULT:
                        'color-mix(in oklch, var(--muted) calc(<alpha-value> * 100%), transparent)',
                    foreground: 'var(--muted-foreground)',
                },
                accent: {
                    DEFAULT:
                        'color-mix(in oklch, var(--accent) calc(<alpha-value> * 100%), transparent)',
                    foreground: 'var(--accent-foreground)',
                },
                card: {
                    DEFAULT: 'var(--card)',
                    foreground: 'var(--card-foreground)',
                },
                popover: {
                    DEFAULT: 'var(--popover)',
                    foreground: 'var(--popover-foreground)',
                },
                destructive: {
                    DEFAULT:
                        'color-mix(in oklch, var(--destructive) calc(<alpha-value> * 100%), transparent)',
                    foreground: 'var(--destructive-foreground)',
                },
                sidebar: {
                    DEFAULT: 'var(--sidebar)',
                    foreground: 'var(--sidebar-foreground)',
                    primary: 'var(--sidebar-primary)',
                    'primary-foreground': 'var(--sidebar-primary-foreground)',
                    accent: 'var(--sidebar-accent)',
                    'accent-foreground': 'var(--sidebar-accent-foreground)',
                    border: 'var(--sidebar-border)',
                    ring: 'var(--sidebar-ring)',
                },
                surface: {
                    DEFAULT: 'var(--surface)',
                    foreground: 'var(--surface-foreground)',
                },
                code: {
                    highlight: 'var(--code-highlight)',
                    number: 'var(--code-number)',
                },
                selection: {
                    DEFAULT: 'var(--selection)',
                    foreground: 'var(--selection-foreground)',
                },
                chart: {
                    1: 'var(--chart-1)',
                    2: 'var(--chart-2)',
                    3: 'var(--chart-3)',
                    4: 'var(--chart-4)',
                    5: 'var(--chart-5)',
                },
                danger: {
                    DEFAULT: 'var(--destructive)',
                    foreground: 'var(--destructive-foreground)',
                },
                success: {
                    DEFAULT: 'var(--success)',
                    foreground: 'var(--success-foreground)',
                },
                warning: {
                    DEFAULT: 'var(--warning)',
                    foreground: 'var(--warning-foreground)',
                },
                offwhite: 'var(--border)',
            },
            borderRadius: {
                xl: 'calc(var(--radius) + 4px)',
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            fontFamily: {
                sans: ['var(--font-sans)'],
                mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
            },
            boxShadow: {
                sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            },
            spacing: {
                safe: 'max(1rem, env(safe-area-inset-bottom))',
                'safe-top': 'env(safe-area-inset-top)',
                'safe-bottom': 'env(safe-area-inset-bottom)',
                'safe-left': 'env(safe-area-inset-left)',
                'safe-right': 'env(safe-area-inset-right)',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
    ],
};
