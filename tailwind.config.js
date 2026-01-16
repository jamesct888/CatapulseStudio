/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                sw: {
                    teal: '#0b3239',       /* Primary Navy/Teal */
                    tealHover: '#062126',
                    red: '#e61126',        /* Primary Red */
                    redHover: '#c40e20',
                    gold: '#f5efe6',       /* Secondary Beige/Gold */
                    lightGray: '#eee',
                    lighterGray: '#fafafa',
                    purpleLight: '#ede9ff',
                    surface: '#ffffff',
                    text: '#0b3239',
                    error: '#db0f30'
                }
            },
            fontFamily: {
                sans: ['"GT Ultra Standard"', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
                serif: ['"ABC Arizona Flare"', 'Georgia', 'Times New Roman', 'serif'],
            },
            borderRadius: {
                'xl': '12px',
                '2xl': '16px',
                'btn': '50px'
            },
            boxShadow: {
                'card': '0 0 8px 0 rgba(11,50,57,.04), 0 2px 5px 0 rgba(11,50,57,.06)',
                'input-focus': '0 0 0 2px #fff, 0 0 0 4px #0b3239'
            }
        },
    },
    plugins: [],
}
