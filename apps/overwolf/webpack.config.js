const { composePlugins, withNx, withWeb } = require('@nx/webpack');
const { join } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = composePlugins(withNx(), withWeb(), (config) => {
    return {
        ...config,
        entry: {
            background: './src/background.tsx',
            desktop: './src/desktop.tsx',
            'in-game': './src/in-game.tsx'
        },
        output: {
            ...config.output,
            filename: '[name].js',
            path: join(__dirname, '../../dist/apps/overwolf')
        },
        plugins: [
            ...config.plugins || [],
            new HtmlWebpackPlugin({
                template: './src/index.html',
                filename: 'background.html',
                chunks: ['background'],
                inject: true
            }),
            new HtmlWebpackPlugin({
                template: './src/index.html',
                filename: 'desktop.html',
                chunks: ['desktop'],
                inject: true
            }),
            new HtmlWebpackPlugin({
                template: './src/index.html',
                filename: 'in-game.html',
                chunks: ['in-game'],
                inject: true
            })
        ],
        target: 'web',
        mode: 'development',
        devtool: 'source-map'
    };
}); 