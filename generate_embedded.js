const fs = require('fs');
const path = require('path');

const img1Path = 'C:/Users/pc/.gemini/antigravity/brain/7c427445-d156-44b4-a98a-e29352f9ae53/.user_uploaded/media_1791147128996.png';
const img2Path = 'C:/Users/pc/.gemini/antigravity/brain/7c427445-d156-44b4-a98a-e29352f9ae53/.user_uploaded/media_1791146455752.png';

const b64_1 = fs.readFileSync(img1Path).toString('base64');
const b64_2 = fs.readFileSync(img2Path).toString('base64');

const code = `// Embedded Fallback Images for Render Cloud Deployment
module.exports = {
  heroBg: "${b64_1}",
  pageBg: "${b64_2}"
};
`;

fs.writeFileSync('C:/Users/pc/.gemini/antigravity/scratch/vibe-together/embedded_images.js', code);
console.log('Successfully generated embedded_images.js');
