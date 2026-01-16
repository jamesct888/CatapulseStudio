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
                    teal: '#009087',      // Primary Brand (Guessing hex based on name)
                    tealHover: '#007A73', // Darker for hover
                    lightGray: '#F3F4F6', // Backgrounds
                    text: '#1F2937',      // Main text
                    red: '#EF4444',       // Error / Delete
                }
            },
            fontFamily: {
                serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
