# Workout Planner 💪

A modern React + TypeScript web application for creating custom workout routines. Built with Vite, TailwindCSS, and lucide-react icons.

![Workout Planner Screenshot](https://github.com/user-attachments/assets/85229198-cdab-465e-ad32-35bb0e684fb8)

## Features

- 🏋️ **Exercise Library**: Browse a collection of exercises with difficulty levels, categories, and rep/set information
- 📅 **Custom Workout Builder**: Add exercises to create your personalized workout plan
- 🎨 **Modern UI**: Clean, responsive design with TailwindCSS
- 🚀 **Fast Development**: Built with Vite for lightning-fast HMR
- 📊 **TypeScript**: Fully typed for better developer experience
- 🌐 **GitHub Pages Ready**: Configured for easy deployment

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/matthieu-00/workout-analysis.git
cd workout-analysis
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173/workout-analysis/`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment

This project is configured to deploy to GitHub Pages automatically when you push to the `main` branch. The GitHub Actions workflow handles the build and deployment process.

### Manual Deployment

You can also deploy manually using:
```bash
npm run build
# Then upload the dist folder to your hosting provider
```

## Technologies Used

- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **lucide-react**: Beautiful icon library
- **GitHub Actions**: CI/CD for automated deployment

## Project Structure

```
workout-analysis/
├── src/
│   ├── App.tsx              # Main app component
│   ├── WorkoutPlanner.tsx   # Workout planner component
│   ├── main.tsx             # App entry point
│   └── index.css            # Global styles with Tailwind
├── public/                  # Static assets
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Pages deployment workflow
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # TailwindCSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts

```

## Customization

### Adding More Exercises

The exercise data is fetched from a JSON source. You can modify the exercises in `src/WorkoutPlanner.tsx` or point to your own JSON gist by updating the `EXERCISES_URL` constant.

### Styling

The app uses TailwindCSS. You can customize the theme in `tailwind.config.js` or add custom styles in `src/index.css`.

## License

MIT

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.
