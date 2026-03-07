const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const sharedPackageRoot = path.resolve(workspaceRoot, 'packages', 'shared');

const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
// Avoid watching the entire monorepo on Windows; only the shared workspace
// package needs to be visible outside the app root for this project.
config.watchFolders = [sharedPackageRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
