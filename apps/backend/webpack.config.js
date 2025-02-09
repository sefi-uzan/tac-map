const { composePlugins, withNx } = require('@nx/webpack');
const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = composePlugins(withNx(), (config) => {
  // Update the webpack config as needed here.
  return {
    ...config,
    // Backend specific settings
    target: 'node',
    output: {
      ...config.output,
      // Ensures proper handling of __dirname in the bundled code
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
      path: join(__dirname, '../../dist/apps/backend'),
    },
    // Exclude node_modules from the bundle
    externals: [
      /^@nestjs\/.+$/,
      'class-transformer',
      'class-validator',
      'socket.io',
      'uuid',
    ],
    plugins: [
      new NxAppWebpackPlugin({
        target: 'node',
        compiler: 'tsc',
        main: './src/main.ts',
        tsConfig: './tsconfig.app.json',
        assets: ['./src/assets'],
        optimization: false,
        outputHashing: 'none',
        generatePackageJson: true,
      }),
    ],
  };
});
