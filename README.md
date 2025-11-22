# JSON Viewer

A powerful, client-side JSON visualization and formatting tool.

## Features

- **Dual Modes**: Switch between Text (Code) view and Graph visualization
- **Graph Visualization**: Interactive node-based graph view of your JSON data
- **Formatting**: Auto-format and validate JSON
- **Minification**: Quickly minify JSON for production use
- **Search**: Filter and search nodes in Graph mode
- **Minimalist UI**: Clean black & white aesthetics
- **Dark Mode**: Fully supported dark theme

## Usage

1. Open `index.html` in your browser.
2. Paste your JSON into the input pane.
3. Click **Format** to beautify or **Minify** to compress.
4. Switch to **Graph** tab to visualize the data structure.
5. Use the search bar in Graph mode to find specific keys or values.

## Setup

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Rajat-malhotra0/json-viewer.git
   cd json-viewer
   ```

2. (Optional) Create a `.env` file to customize the home URL (see `.env.example`):
   ```env
   HOME_URL=https://your-landing-page.com
   ```

3. Run the build script:
   ```bash
   node build.js
   ```

4. Open the generated `index.html` in any modern web browser.

### Netlify Deployment

1. Set environment variables in Netlify dashboard:
   - `HOME_URL`: URL to your landing page (e.g., `https://devtoolkit.netlify.app`)

2. Deploy! Netlify will automatically run `build.js` during deployment.

**Note**: The source template is `index.template.html`. The `index.html` file is generated and gitignored.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
