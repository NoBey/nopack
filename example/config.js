const path = require('path')
const noPack = require("../src/index.js");

const config = {
  entry: path.resolve(__dirname, './src/index.js'),
  output: {
    path: path.join(__dirname, "dist"),
    filename: "index.js",
  },
};

noPack(config)

