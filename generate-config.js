const fs = require('fs');
const path = require('path');

// Simple .env parser
function parseEnv(content) {
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            env[key] = value;
        }
    });
    return env;
}

// Load .env if it exists
let env = {};
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('Loading .env file...');
    const envContent = fs.readFileSync(envPath, 'utf8');
    env = parseEnv(envContent);
}

// Configuration defaults
const config = {
    HOME_URL: process.env.HOME_URL || env.HOME_URL || '#'
};

// Generate config.js content
const fileContent = `const CONFIG = {
    // The URL for the home/landing page
    HOME_URL: '${config.HOME_URL}'
};`;

// Write to config.js
const configPath = path.join(__dirname, 'config.js');
fs.writeFileSync(configPath, fileContent);

console.log('✅ config.js updated successfully!');
console.log('Home URL:', config.HOME_URL);
