const fs = require("fs");
const path = require("path");

const distRoute = path.join(__dirname, "..", "dist", "routes", "companyRoutes.js");
const requiredSnippets = ["/numero-anagrafica/next"];

if (!fs.existsSync(distRoute)) {
  console.error(`[verify-dist] Missing build output: ${distRoute}`);
  process.exit(1);
}

const content = fs.readFileSync(distRoute, "utf8");
const missing = requiredSnippets.filter((snippet) => !content.includes(snippet));

if (missing.length > 0) {
  console.error(
    `[verify-dist] Build output missing required routes: ${missing.join(", ")}`
  );
  process.exit(1);
}

console.log("[verify-dist] Build output looks OK.");
