# Include and replace
Use `@@include('partial.html')` inside your HTML files and include the partial and replace the content of it.
Or give custom data to the partial and show it with `@@show('title')`.

**Example:**
`@@include('partial.html', {"title": "My custom title"}) // in index.html`
`@@show('title') // in partial.html`

### Installation

**Inside webpack:**
``` javascript
let IncludeReplaceWebpackPlugin = require('include-replace');

// Require this inside your plugins array
new IncludeReplaceWebpackPlugin({
    src: './html',
    dist: './dist'
});
```
**For Laravel mix:**
``` javascript
let IncludeReplaceWebpackPlugin = require('include-replace');

// Extend the default Webpack config
mix.webpackConfig({
    plugins: [
        new IncludeReplaceWebpackPlugin({
            src: './html',
            dist: './dist'
        })
    ],
});
```
**With Laravel mix + browsersync**
``` javascript
let IncludeReplaceWebpackPlugin = require('include-replace');
let plugin;

// Extend the default Webpack config
mix.browserSync({
    proxy: 'domain.local',
    files: [
        'src/**/*',
        {
            match: 'src/**/*',
            fn: function(event, file) {
                plugin.compileHook();
            }
        },
        'dist/**/*',
    ]
})
.webpackConfig({
    plugins: [
        plugin = new IncludeReplaceWebpackPlugin({
            src: './html',
            dist: './dist'
        })
    ],
});
```
