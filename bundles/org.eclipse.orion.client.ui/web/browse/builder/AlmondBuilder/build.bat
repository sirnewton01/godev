rmdir /s /q temp
node ./copy/copy.js "D:/JazzIntegration/OrionSource/org.eclipse.orion.client/bundles"
xcopy /y .\temp\browse\builder\i18n.js .\temp\orion
node ./node_modules/requirejs/bin/r.js -o temp/browse/builder/browse.css.build.json cssIn=temp/browse/builder/browseBuilder.css out=output/built-browser.css
cd temp
java -classpath ../builderLibs/js.jar;../builderLibs/compiler.jar org.mozilla.javascript.tools.shell.Main ../builderLibs/r.js -o browse/builder/browse.build.almond-js.js optimize="none" out="../output/built-browser.js" dir=
java -classpath ../builderLibs/js.jar;../builderLibs/compiler.jar org.mozilla.javascript.tools.shell.Main ../builderLibs/r.js -o browse/builder/browse.build.almond-js.js optimize="closure" out="../output/built-browser.min.js" dir=
