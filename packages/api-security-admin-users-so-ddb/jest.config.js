const dynamoDbPreset = require("jest-dynalite/jest-preset");
const base = require("../../jest.config.base");

module.exports = base({ path: __dirname }, [dynamoDbPreset]);
