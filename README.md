<!-- Banner -->
<div align="center">
  <img src="https://raw.githubusercontent.com/tashfiqul-islam/metro-station-finder/master/public/assets/metro-station-finder.png" alt="Metro-Banner" />
</div>

<!-- Project Title Section -->
<h1 align="center">Metro Station Finder</h1>

<!-- GHA, Prettier & Linting Badges -->
<p align="center">
  <img src="https://custom-icon-badges.demolab.com/badge/Version-v0.0.1-blue?logo=metro-station-finder" alt="Metro Station Version">
  <a href="https://github.com/tashfiqul-islam/metro-station-finder/actions/workflows/nextjs.yml">
    <img src="https://img.shields.io/badge/Deployment-Passing-4BC51D?logo=github" alt="Deployment Passing">
  </a>
  <img src="https://img.shields.io/badge/Lint-Passing-00aa00?logo=eslint&logoColor=white" alt="Lint Passing">
  <img src="https://img.shields.io/badge/Code Style-Prettier-ff69b4?logo=prettier&logoColor=white" alt="Code Style Prettier">
</p>

<br>

<!-- Introduction Section -->
<h2>🚇 Introduction</h2>
<p>
  Finding the closest metro station in Dhaka was a real headache. Every time someone asked, "Where's the nearest metro station to where I'm going?" I had to dig through maps, trying to figure it out. It was a slow and annoying process because Google Maps still needed to show metro stations. That's when I thought of a better way. I created the Metro Station Finder, a simple app made with Next.js. It makes my life easier by quickly showing the closest metro station and how far it is just by entering a location. No more map headaches!
</p>

<br>

<!-- Features Section -->
<h2>✨ Features</h2>
<ul>
  <li>Search functionality to input a location.</li>
  <li>Interactive map view to display user's location and nearest metro station.</li>
  <li>Distance calculation from the user's location to the nearest metro station.</li>
</ul>

<br>

<!-- Technology Stack Section -->
<h2>💻 Tech Stack</h2>
<p>
  <!-- Next.js Badge -->
  <a href="https://nextjs.org/" target="_blank">
    <img src="https://img.shields.io/badge/Next.js-14.0.4-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  </a>
  <!-- React Badge -->
  <a href="https://reactjs.org/" target="_blank">
    <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React">
  </a>
  <!-- Tailwind CSS Badge -->
  <a href="https://tailwindcss.com/" target="_blank">
    <img src="https://img.shields.io/badge/Tailwind CSS-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  </a>
  <!-- Google Maps API Badge -->
  <a href="https://developers.google.com/maps/documentation/javascript/overview" target="_blank">
    <img src="https://img.shields.io/badge/Google Maps API-Latest-4285F4?style=for-the-badge&logo=google-maps&logoColor=white" alt="Google Maps API">
  </a>
  <!-- TypeScript Badge -->
  <a href="https://www.typescriptlang.org/" target="_blank">
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  </a>
</p>

<br>

<!-- Hosted with GitHub Pages -->
<h2>Hosted with GitHub Pages</h2>
<p>
  <a href="https://tashfiqul-islam.github.io/metro-station-finder/">
    <img src="https://img.shields.io/badge/GitHub Pages-Visit-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Pages">
  </a>
</p>

<br>

<!-- Usage -->
<h2>Usage</h2>
<p>
  Enter a location in the search bar and click the 'Search' button. The map will update to show your location and the nearest metro station, along with the distance to it.
</p>

<!-- Demo -->
<div align="center">
  <img src="https://raw.githubusercontent.com/tashfiqul-islam/metro-station-finder/master/public/assets/metro-station-finder.gif" alt="Metro-Banner" />
</div>

<br>

<!-- Getting Started Section -->
<h2>Getting Started</h2>

<!-- Prerequisites -->
<h3>Prerequisites</h3>
<p>
  <img src="https://img.shields.io/badge/Node.js-v20.11.0-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/npm-v10.3.0-CB3837?style=for-the-badge&logo=npm&logoColor=white" alt="npm">
</p>
<h6>
  <em>P.S. This is what I had installed while working on this.</em>
</h6>

<br>

<!-- Project Directory Structure -->
<h3>Project Directory Structure</h3>

```plaintext
metro-station-finder/
├── src/
│   ├── components/
│   │   ├── mapview.tsx // Component for displaying the map view.
│   │   ├── metroInfoCard.tsx // Component for displaying metro station info card.
│   │   ├── Searchbar.tsx // Component for the search bar.
│
├── pages/
│   ├── _app.tsx // Main Next.js application component.
│   ├── index.tsx // Homepage of the application.
│
├── services/
│   ├── metroService.ts // Service for fetching metro station data.
│
├── styles/
│   ├── globals.css // Global CSS styles.
│
├── utils/
│   ├── constants.ts // Metro stations map location.
│   ├── loadGoogleMapScript.ts // Utility for loading Google Maps scripts.
```

<br>

<!-- Installation -->
<h3>Installation</h3>
<ol>
  <li>Clone the repository:<br>
    <code>git clone https://github.com/tashfiqul-islam/metro-station-finder.git</code>
  </li>
  <li>Navigate to the project directory:<br>
    <code>cd metro-station-finder</code>
  </li>
  <li>Install dependencies:<br>
    <code>npm install</code>
  </li>
  <li>Set up the environment variables:<br>
    Create a <code>.env.local</code> file in the root directory and add your Google Maps API key:<br>
    <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key</code>
  </li>
</ol>

<br>

<!-- Running the Application -->
<h3>Running the Application</h3>
<ol>
  <li><p>To start the development server, run: </p></li>
  <code>npm run dev</code>
  <li><p>Navigate to <a href="http://localhost:3000">http://localhost:3000</a> to view the application.</p></li>
</ol>

<br>

<!-- Credit Section -->
<h2>👏 Credits</h2>
<div style="display: flex; gap: 1rem;">
  <a href="https://flowbite.com" target="_blank">
    <img src="https://img.shields.io/badge/Search%20Bar%20Design-FLOWBITES-0073e6?style=for-the-badge&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAZElEQVR42mP8/wM/Af1EWY2UYMRgKLFq1q6K9rKVavXq3Kioq2NrY2W4KA8kwsi4EK8vgAAAABJRU5ErkJggg=="
      alt="FLOWBITES" />
  </a>
  <a href="https://snazzymaps.com/style/83/muted-blue" target="_blank">
    <img src="https://img.shields.io/badge/Custom%20Map%20Design-SNAZZY%20MAPS-77AA77?style=for-the-badge&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAVUlEQVR42mL4/wM/D5WYuyZjBhYGBgaGhobGBoYGBhYWVl5fJtihqKgohweKioKKIoYHoIuBoeGBooChoaGioKChhIKGhgoCBHYMGABiSp0HhIHM0AAAAAElFTkSuQmCC"
      alt="SNAZZY MAPS" />
  </a>
</div>

<br>

<!-- Contributing -->
<h2>Contributing</h2>
<p>
  Contributions to the Metro Station Finder are welcome. Please reach out to me if you've more ideas for this.
</p>

<br>

<!-- License section -->
<h2>📜 License</h2>
<p>
    Licensed under the <a href="LICENSE">MIT License</a>.<br>
    <em>Feel free to use and modify as you like.</em>
</p>

<br>

<!-- Footer Section -->
<div>
    <p>
        <strong>This project was a learning journey, crafted with ❤️ by Tashfiq.</strong><br>
        <em>A stepping stone in my ongoing quest to become a Programming Ninja!</em>
    </p>
    <p>
        <a href="https://github.com/tashfiqul-islam" target="_blank">🌟 Follow me on GitHub</a> —
        I promise, my future projects will only have <em>slightly</em> fewer bugs! 🐛
    </p>
</div>
