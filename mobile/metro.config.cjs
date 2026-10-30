const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const config = getDefaultConfig(__dirname);
// The app installs independently; include the sibling shared-domain source.
config.watchFolders = [path.resolve(__dirname, '..', 'packages')];
module.exports = config;
