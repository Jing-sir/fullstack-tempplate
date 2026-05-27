import type { Config } from 'tailwindcss';

const config: Config = {
    // Keep route views, shared components, and TS entry files in the scan scope for utility generation.
    content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
    theme: {
        extend: {}
    },
    plugins: []
};

export default config;
