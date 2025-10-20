let preprocessor = "sass", // 'sass', 'less', or 'styl'
  fileswatch = "html,htm,txt,json,md,woff2";

import pkg from "gulp";
const { src, dest, parallel, series, watch } = pkg;

import browserSync from "browser-sync";
import bssi from "browsersync-ssi";
import ssi from "ssi";
import webpackStream from "webpack-stream";
import webpack from "webpack";
import TerserPlugin from "terser-webpack-plugin";
import gulpSass from "gulp-sass";
import * as dartSass from "sass";
const sass = gulpSass(dartSass);
import sassglob from "gulp-sass-glob";
import less from "gulp-less";
import lessglob from "gulp-less-glob";
import styl from "gulp-stylus";
import stylglob from "gulp-noop";
import postCss from "gulp-postcss";
import cssnano from "cssnano";
import autoprefixer from "autoprefixer";
import imagemin from "imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant from "imagemin-pngquant";
import imageminSvgo from "imagemin-svgo";
import path from "path";
import fs from "fs-extra";
import concat from "gulp-concat";
import rsync from "gulp-rsync";
import { deleteAsync } from "del";

const appDir = "app";
const distDir = "dist";

/* ------------------ BrowserSync ------------------ */
function browsersync() {
  browserSync.init({
    server: {
      baseDir: `${appDir}/`,
      middleware: bssi({ baseDir: `${appDir}/`, ext: ".html" }),
    },
    ghostMode: { clicks: false },
    notify: false,
    online: true,
  });
}

/* ------------------ Scripts ------------------ */
function scripts() {
  return src([`${appDir}/js/*.js`, `!${appDir}/js/*.min.js`])
    .pipe(
      webpackStream(
        {
          mode: "production",
          performance: { hints: false },
          plugins: [
            new webpack.ProvidePlugin({
              $: "jquery",
              jQuery: "jquery",
              "window.jQuery": "jquery",
            }),
          ],
          module: {
            rules: [
              {
                test: /\.m?js$/,
                exclude: /(node_modules)/,
                use: {
                  loader: "babel-loader",
                  options: {
                    presets: ["@babel/preset-env"],
                    plugins: ["babel-plugin-root-import"],
                  },
                },
              },
            ],
          },
          optimization: {
            minimize: true,
            minimizer: [
              new TerserPlugin({
                terserOptions: { format: { comments: false } },
                extractComments: false,
              }),
            ],
          },
        },
        webpack
      )
    )
    .on("error", function (err) {
      console.error("❌ Error in Gulp task scripts:", err.message);
      this.emit("end");
    })
    .pipe(concat("app.min.js"))
    .pipe(dest(`${appDir}/js`))
    .pipe(browserSync.stream());
}

/* ------------------ Styles ------------------ */
function styles() {
  return src([
    `${appDir}/styles/${preprocessor}/*.*`,
    `!${appDir}/styles/${preprocessor}/_*.*`,
  ])
    .pipe(eval(`${preprocessor}glob`)())
    .pipe(
      eval(preprocessor)({
        "include css": true,
        silenceDeprecations: [
          "legacy-js-api",
          "mixed-decls",
          "color-functions",
          "global-builtin",
          "import",
        ],
        loadPaths: ["./"],
      })
    )
    .on("error", function handleError(err) {
      console.error("❌ Preprocessor error:", err.message);
      this.emit("end");
    })
    .pipe(
      postCss([
        autoprefixer({ grid: "autoplace" }),
        cssnano({
          preset: ["default", { discardComments: { removeAll: true } }],
        }),
      ])
    )
    .pipe(concat("app.min.css"))
    .pipe(dest(`${appDir}/css`))
    .pipe(browserSync.stream());
}

/* ------------------ Images ------------------ */
async function images() {
  try {
    const srcDir = path.resolve(`${appDir}/images/src`);
    const outputDir = path.resolve(`${appDir}/images`);

    // 🧹 Очистка старых оптимизированных изображений, кроме src/
    const subdirs = await fs.readdir(outputDir);
    for (const dir of subdirs) {
      const fullPath = path.join(outputDir, dir);
      if (dir !== "src") {
        await fs.remove(fullPath);
      }
    }

    console.log("🧽 Old optimized images cleaned.");

    // 📸 Оптимизация
    const files = await imagemin([`${srcDir}/**/*.{jpg,jpeg,png,svg}`], {
      plugins: [
        imageminMozjpeg({ quality: 90 }),
        imageminPngquant({ quality: [0.6, 0.8] }),
        imageminSvgo(),
      ],
    });

    for (const v of files) {
      const relativePath = path.relative(srcDir, v.sourcePath);
      const destPath = path.join(outputDir, relativePath);
      await fs.outputFile(destPath, v.data);
    }

    console.log("✅ Images optimized successfully.");
  } catch (err) {
    console.error("❌ Image Minification Error:", err.message || err);
  }
}

/* ------------------ Build: Copy ------------------ */
function buildcopy() {
  return src(
    [
      `{${appDir}/js,${appDir}/css}/*.min.*`,
      `${appDir}/images/**/*.*`,
      `!${appDir}/images/src/**/*`,
      // `${appDir}/fonts/**/*`,
    ],
    { base: `${appDir}/`, encoding: false }
  ).pipe(dest(distDir));
}

/* ------------------ Build: HTML ------------------ */
async function buildhtml() {
  let includes = new ssi(appDir, distDir, "/**/*.html");
  includes.compile();
  await deleteAsync(`${distDir}/parts`, { force: true });
}

/* ------------------ Clean ------------------ */
async function cleandist() {
  await deleteAsync(`${distDir}/**/*`, { force: true });
}

/* ------------------ Deploy ------------------ */
function deploy() {
  return src(distDir).pipe(
    rsync({
      root: distDir,
      hostname: "username@yoursite.com",
      destination: "yoursite/public_html/",
      clean: true,
      exclude: ["**/Thumbs.db", "**/*.DS_Store"],
      recursive: true,
      archive: true,
      silent: false,
      compress: true,
    })
  );
}

/* ------------------ Watch ------------------ */
function startwatch() {
  watch(
    [`${appDir}/styles/${preprocessor}/**/*`],
    { usePolling: true },
    styles
  );
  watch(
    [`${appDir}/js/**/*.js`, `!${appDir}/js/**/*.min.js`],
    { usePolling: true },
    scripts
  );
  watch([`${appDir}/images/src/**/*`], { usePolling: true }, images);
  watch([`${appDir}/**/*.{${fileswatch}}`], { usePolling: true }).on(
    "change",
    browserSync.reload
  );
}

/* ------------------ Exports ------------------ */
export { scripts, styles, images, deploy };
export const assets = series(scripts, styles, images);
export const build = series(
  cleandist,
  images,
  scripts,
  styles,
  buildcopy,
  buildhtml
);
export default series(
  scripts,
  styles,
  images,
  parallel(browsersync, startwatch)
);
