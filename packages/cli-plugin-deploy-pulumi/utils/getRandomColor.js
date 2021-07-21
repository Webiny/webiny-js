const randomColor = require("random-color");

module.exports = () => {
    return randomColor().hexString();
};
