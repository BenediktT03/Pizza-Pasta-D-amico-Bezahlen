// /tools/config/webpack.base.js
// EATECH V3.0 - Base Webpack Configuration
// Shared configuration for all applications

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');

/**
 * Create base webpack configuration
 * @param {Object} options - Configuration options
 * @param {string} options.mode - Development or production mode
 * @param {string} options.entry - Entry point file path
 * @param {string} options.outputPath - Output directory path
 * @param {string} options.publicPath - Public path for assets
 * @param {string} options.appName - Application name
 * @param {boolean} options.analyze - Whether to analyze bundle
 * @param {boolean} options.serviceWorker - Whether to generate service worker
 * @param {Object} options.env - Environment variables
 * @returns {Object} Webpack configuration
 */
function createBaseConfig(options = {}) {
    const {
        mode = 'development',
        entry = './src/index.js',
        outputPath = path.resolve(__dirname, '../../dist'),
        publicPath = '/',
        appName = 'eatech-app',
        analyze = false,
        serviceWorker = false,
        env = {}
    } = options;

    const isProduction = mode === 'production';
    const isDevelopment = mode === 'development';

    // Get project root directory
    const projectRoot = path.resolve(__dirname, '../..');

    // Define paths
    const paths = {
        root: projectRoot,
        nodeModules: path.resolve(projectRoot, 'node_modules'),
        packages: path.resolve(projectRoot, 'packages'),
        tools: path.resolve(projectRoot, 'tools')
    };

    const config = {
        mode,

        // Entry points
        entry: {
            main: entry
        },

        // Output configuration
        output: {
            path: outputPath,
            filename: isProduction
                ? 'js/[name].[contenthash:8].js'
                : 'js/[name].js',
            chunkFilename: isProduction
                ? 'js/[name].[contenthash:8].chunk.js'
                : 'js/[name].chunk.js',
            assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
            publicPath,
            clean: true,
            pathinfo: isDevelopment
        },

        // Module resolution
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            modules: [
                'node_modules',
                paths.nodeModules,
                paths.packages
            ],
            alias: {
                // Application aliases
                '@': path.resolve(outputPath, '../src'),
                '@components': path.resolve(outputPath, '../src/components'),
                '@hooks': path.resolve(outputPath, '../src/hooks'),
                '@utils': path.resolve(outputPath, '../src/utils'),
                '@services': path.resolve(outputPath, '../src/services'),
                '@types': path.resolve(outputPath, '../src/types'),
                '@styles': path.resolve(outputPath, '../src/styles'),

                // Package aliases
                '@eatech/core': path.resolve(paths.packages, 'core/src'),
                '@eatech/ui': path.resolve(paths.packages, 'ui/src'),
                '@eatech/types': path.resolve(paths.packages, 'types/src'),
                '@eatech/utils': path.resolve(paths.packages, 'utils/src'),
                '@eatech/analytics': path.resolve(paths.packages, 'analytics/src'),
                '@eatech/ai': path.resolve(paths.packages, 'ai/src'),

                // React hot reloading for development
                ...(isDevelopment && {
                    'react-dom': '@hot-loader/react-dom'
                })
            },
            fallback: {
                // Node.js polyfills for browser
                buffer: require.resolve('buffer'),
                crypto: require.resolve('crypto-browserify'),
                stream: require.resolve('stream-browserify'),
                process: require.resolve('process/browser'),
                path: require.resolve('path-browserify'),
                fs: false,
                net: false,
                tls: false
            }
        },

        // Module rules
        module: {
            rules: [
                // JavaScript/TypeScript files
                {
                    test: /\.(js|jsx|ts|tsx)$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                [
                                    '@babel/preset-env',
                                    {
                                        targets: {
                                            browsers: [
                                                'last 2 versions',
                                                'not dead',
                                                '> 1%',
                                                'not ie 11'
                                            ]
                                        },
                                        useBuiltIns: 'entry',
                                        corejs: 3,
                                        modules: false
                                    }
                                ],
                                [
                                    '@babel/preset-react',
                                    {
                                        runtime: 'automatic',
                                        development: isDevelopment
                                    }
                                ],
                                '@babel/preset-typescript'
                            ],
                            plugins: [
                                '@babel/plugin-proposal-class-properties',
                                '@babel/plugin-proposal-object-rest-spread',
                                '@babel/plugin-syntax-dynamic-import',
                                [
                                    '@babel/plugin-transform-runtime',
                                    {
                                        corejs: false,
                                        helpers: true,
                                        regenerator: true,
                                        useESModules: false
                                    }
                                ],
                                ...(isDevelopment ? [
                                    'react-hot-loader/babel'
                                ] : []),
                                ...(isProduction ? [
                                    'babel-plugin-transform-react-remove-prop-types'
                                ] : [])
                            ],
                            cacheDirectory: true,
                            cacheCompression: false,
                            compact: isProduction
                        }
                    }
                },

                // CSS files
                {
                    test: /\.css$/,
                    use: [
                        isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                modules: {
                                    auto: /\.module\.css$/,
                                    localIdentName: isDevelopment
                                        ? '[local]--[hash:base64:5]'
                                        : '[hash:base64]'
                                },
                                importLoaders: 1,
                                sourceMap: isDevelopment
                            }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: [
                                        ['autoprefixer'],
                                        ['tailwindcss'],
                                        ...(isProduction ? [['cssnano']] : [])
                                    ]
                                },
                                sourceMap: isDevelopment
                            }
                        }
                    ]
                },

                // SCSS files
                {
                    test: /\.(scss|sass)$/,
                    use: [
                        isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
                        {
                            loader: 'css-loader',
                            options: {
                                modules: {
                                    auto: /\.module\.(scss|sass)$/,
                                    localIdentName: isDevelopment
                                        ? '[local]--[hash:base64:5]'
                                        : '[hash:base64]'
                                },
                                importLoaders: 2,
                                sourceMap: isDevelopment
                            }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    plugins: [
                                        ['autoprefixer'],
                                        ...(isProduction ? [['cssnano']] : [])
                                    ]
                                },
                                sourceMap: isDevelopment
                            }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: isDevelopment,
                                sassOptions: {
                                    includePaths: [
                                        path.resolve(paths.packages, 'ui/src/styles'),
                                        paths.nodeModules
                                    ]
                                }
                            }
                        }
                    ]
                },

                // Images
                {
                    test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
                    type: 'asset',
                    parser: {
                        dataUrlCondition: {
                            maxSize: 8 * 1024 // 8kb
                        }
                    },
                    generator: {
                        filename: 'images/[name].[contenthash:8][ext]'
                    }
                },

                // Fonts
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'fonts/[name].[contenthash:8][ext]'
                    }
                },

                // Audio/Video
                {
                    test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i,
                    type: 'asset/resource',
                    generator: {
                        filename: 'media/[name].[contenthash:8][ext]'
                    }
                },

                // SVG as React components
                {
                    test: /\.svg$/,
                    issuer: /\.(js|jsx|ts|tsx)$/,
                    use: [
                        {
                            loader: '@svgr/webpack',
                            options: {
                                prettier: false,
                                svgo: true,
                                svgoConfig: {
                                    plugins: [
                                        {
                                            name: 'preset-default',
                                            params: {
                                                overrides: {
                                                    removeViewBox: false
                                                }
                                            }
                                        }
                                    ]
                                },
                                titleProp: true
                            }
                        },
                        'file-loader'
                    ]
                }
            ]
        },

        // Plugins
        plugins: [
            // Define environment variables
            new webpack.DefinePlugin({
                'process.env.NODE_ENV': JSON.stringify(mode),
                'process.env.PUBLIC_PATH': JSON.stringify(publicPath),
                'process.env.APP_NAME': JSON.stringify(appName),
                ...Object.keys(env).reduce((acc, key) => {
                    acc[`process.env.${key}`] = JSON.stringify(env[key]);
                    return acc;
                }, {})
            }),

            // Provide global variables
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer'],
                process: 'process/browser'
            }),

            // Extract CSS in production
            ...(isProduction ? [
                new MiniCssExtractPlugin({
                    filename: 'css/[name].[contenthash:8].css',
                    chunkFilename: 'css/[name].[contenthash:8].chunk.css',
                    ignoreOrder: false
                })
            ] : []),

            // Compression in production
            ...(isProduction ? [
                new CompressionPlugin({
                    filename: '[path][base].gz',
                    algorithm: 'gzip',
                    test: /\.(js|css|html|svg)$/,
                    threshold: 8192,
                    minRatio: 0.8
                }),
                new CompressionPlugin({
                    filename: '[path][base].br',
                    algorithm: 'brotliCompress',
                    test: /\.(js|css|html|svg)$/,
                    compressionOptions: {
                        params: {
                            [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11
                        }
                    },
                    threshold: 8192,
                    minRatio: 0.8
                })
            ] : []),

            // Service Worker
            ...(serviceWorker ? [
                new WorkboxPlugin.GenerateSW({
                    clientsClaim: true,
                    skipWaiting: true,
                    runtimeCaching: [
                        {
                            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
                            handler: 'StaleWhileRevalidate',
                            options: {
                                cacheName: 'google-fonts-stylesheets'
                            }
                        },
                        {
                            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'google-fonts-webfonts',
                                expiration: {
                                    maxEntries: 30,
                                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                                }
                            }
                        },
                        {
                            urlPattern: /\/api\//,
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'api-cache',
                                networkTimeoutSeconds: 3,
                                expiration: {
                                    maxEntries: 50,
                                    maxAgeSeconds: 60 * 5 // 5 minutes
                                }
                            }
                        },
                        {
                            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'images',
                                expiration: {
                                    maxEntries: 100,
                                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                                }
                            }
                        }
                    ]
                })
            ] : []),

            // Bundle analyzer
            ...(analyze ? [
                new BundleAnalyzerPlugin({
                    analyzerMode: 'static',
                    openAnalyzer: false,
                    reportFilename: 'bundle-report.html'
                })
            ] : [])
        ],

        // Optimization
        optimization: {
            minimize: isProduction,
            minimizer: [
                // JavaScript minification
                new TerserPlugin({
                    terserOptions: {
                        parse: {
                            ecma: 8
                        },
                        compress: {
                            ecma: 5,
                            warnings: false,
                            comparisons: false,
                            inline: 2,
                            drop_console: isProduction,
                            drop_debugger: isProduction
                        },
                        mangle: {
                            safari10: true
                        },
                        output: {
                            ecma: 5,
                            comments: false,
                            ascii_only: true
                        }
                    },
                    parallel: true,
                    extractComments: false
                }),

                // CSS minification
                new CssMinimizerPlugin({
                    minimizerOptions: {
                        preset: [
                            'default',
                            {
                                discardComments: { removeAll: true }
                            }
                        ]
                    }
                })
            ],

            // Code splitting
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        priority: 20,
                        chunks: 'all'
                    },
                    react: {
                        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                        name: 'react',
                        priority: 30,
                        chunks: 'all'
                    },
                    eatech: {
                        test: /[\\/]packages[\\/].*[\\/]src[\\/]/,
                        name: 'eatech-packages',
                        priority: 25,
                        chunks: 'all'
                    },
                    common: {
                        name: 'common',
                        minChunks: 2,
                        priority: 10,
                        chunks: 'all',
                        enforce: true
                    }
                }
            },

            // Runtime chunk
            runtimeChunk: {
                name: 'runtime'
            }
        },

        // Performance hints
        performance: {
            hints: isProduction ? 'warning' : false,
            maxEntrypointSize: 512000,
            maxAssetSize: 512000
        },

        // Development server configuration
        devServer: isDevelopment ? {
            static: {
                directory: path.join(outputPath, 'public')
            },
            compress: true,
            port: 3000,
            hot: true,
            open: false,
            historyApiFallback: {
                disableDotRule: true
            },
            client: {
                overlay: {
                    warnings: false,
                    errors: true
                }
            },
            devMiddleware: {
                stats: 'minimal'
            }
        } : undefined,

        // Source maps
        devtool: isDevelopment
            ? 'cheap-module-source-map'
            : isProduction
                ? 'source-map'
                : false,

        // Stats configuration
        stats: {
            preset: 'minimal',
            moduleTrace: true,
            errorDetails: true
        },

        // Cache configuration
        cache: {
            type: 'filesystem',
            buildDependencies: {
                config: [__filename]
            }
        }
    };

    return config;
}

/**
 * Create React application configuration
 */
function createReactConfig(options = {}) {
    const baseConfig = createBaseConfig(options);

    // Add React-specific plugins
    baseConfig.plugins.push(
        new HtmlWebpackPlugin({
            template: options.template || 'public/index.html',
            filename: 'index.html',
            inject: true,
            minify: options.mode === 'production' ? {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyJS: true,
                minifyCSS: true,
                minifyURLs: true
            } : false,
            meta: {
                viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
                'theme-color': '#000000',
                description: options.description || 'EATECH - Revolutionary Foodtruck Order System'
            }
        })
    );

    // Add React Hot Loader for development
    if (options.mode === 'development') {
        baseConfig.plugins.push(
            new webpack.HotModuleReplacementPlugin()
        );
    }

    return baseConfig;
}

/**
 * Create Next.js compatible configuration
 */
function createNextConfig(options = {}) {
    const baseConfig = createBaseConfig(options);

    // Remove conflicting plugins for Next.js
    baseConfig.plugins = baseConfig.plugins.filter(plugin =>
        !(plugin instanceof HtmlWebpackPlugin) &&
        !(plugin instanceof WorkboxPlugin.GenerateSW)
    );

    return baseConfig;
}

/**
 * Environment-specific configurations
 */
const environments = {
    development: {
        mode: 'development',
        env: {
            NODE_ENV: 'development',
            REACT_APP_ENV: 'development',
            REACT_APP_API_URL: 'http://localhost:3001',
            REACT_APP_WS_URL: 'ws://localhost:3001',
            REACT_APP_FIREBASE_PROJECT: 'eatech-dev'
        }
    },
    staging: {
        mode: 'production',
        env: {
            NODE_ENV: 'production',
            REACT_APP_ENV: 'staging',
            REACT_APP_API_URL: 'https://api-staging.eatech.ch',
            REACT_APP_WS_URL: 'wss://ws-staging.eatech.ch',
            REACT_APP_FIREBASE_PROJECT: 'eatech-staging'
        }
    },
    production: {
        mode: 'production',
        env: {
            NODE_ENV: 'production',
            REACT_APP_ENV: 'production',
            REACT_APP_API_URL: 'https://api.eatech.ch',
            REACT_APP_WS_URL: 'wss://ws.eatech.ch',
            REACT_APP_FIREBASE_PROJECT: 'eatech-prod'
        }
    }
};

/**
 * Get environment configuration
 */
function getEnvironmentConfig(env = 'development') {
    return environments[env] || environments.development;
}

module.exports = {
    createBaseConfig,
    createReactConfig,
    createNextConfig,
    getEnvironmentConfig,
    environments
};
