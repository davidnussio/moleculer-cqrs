process.argv.push("--dest", process.cwd());

const { Plop, run } = require("plop");
const path = require("path");

const configPath = path.join(__dirname, "../src/plop-generator.js");

Plop.launch(
  {
    cwd: process.cwd(),
    configPath,
    // require: argv.require,
    // completion: argv.completion,
  },
  run
);
