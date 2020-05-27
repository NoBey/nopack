const fs = require('fs')
const path = require('path')

function noPack(config) {
    let files = []
    let assets = {}
    if(config.entry){
        files.push(config.entry)
    }
    while(files.length){
        getDependencies(files.shift(), files, assets)
    }
    const bundle = Buffer.from(generateFile(assets, config)) 
    console.log(`bundle: ${bundle.length / 1000 } kb`)
}


function getModulePath(filename, dirPath){
    for (const modulePath of process.mainModule.paths) {
       if( fs.existsSync(path.join(modulePath, filename)) ) {
           //  package 有配置的情况
           if( fs.existsSync(path.join(modulePath, filename, 'package.json')) ){
               const packageJson = require(path.join(modulePath, filename, 'package.json'));
               return path.join(modulePath, filename, packageJson.main || 'index.js')
           }
           if( fs.existsSync( path.join(modulePath, filename, 'indexs.js') ) ){
               return path.join(modulePath, filename, 'indexs.js')
           }
       }
       if( fs.existsSync( path.join(modulePath, filename + '.js') ) ){
           return path.join(modulePath, filename + '.js')
       }
    }
    if( fs.existsSync( path.join(dirPath, filename) ) ) return path.join(dirPath, filename)
    if( fs.existsSync( path.join(dirPath, filename + '.js') ) ) return path.join(dirPath, filename + '.js')

    
    throw `${moduleName} - 文件未找到`
}

function getDependencies(filePath, files, assets){
    if(assets[filePath]) return 
    let code = fs.readFileSync(filePath, 'utf-8')
    const dirPath = path.dirname(filePath)
    const deps = [] //code.match(/require\((.*)\)/g) || []
    //  这个方法 属于取巧, 最好的还是老老实实用 ast 树来判断处理
    code = code.replace(/require\([\"\']([^\"\']*)[\"\']\)/g, (all, moduleName) => {
        const depPath = getModulePath(moduleName, dirPath) 
        deps.push(depPath)
        return `_require("${depPath}")`
    })
    
    deps.forEach(dep => files.push(dep) )
    assets[filePath] = { code, deps, dirPath }

}


function generateFile(assets, config){
    const { output, entry } = config

   function generateTemplate(entry, assets){
    let modules = ''
    Object.keys(assets).forEach( key => modules += `"${key}" :function(_require, module){ 
        ${assets[key].code}
        return module.exports }, `)

    return `(function (modules) {
        // 已使用的模块
        var installedModules = {};
        function _require(modulId) {
          if(installedModules[modulId]){
              // 如果已经安装过直接调用
              return installedModules[modulId]
          }
          const module = { exports: {} }
          installedModules[modulId] = modules[modulId](_require, module);
          return installedModules[modulId];
        }
        return _require("${entry}");
      })({ ${modules} });`
   }

   const bundle = generateTemplate(entry, assets)
   const { filename = 'bundle.js' } = config.output
   if(!fs.existsSync(output.path)) fs.mkdirSync(output.path)
   fs.writeFileSync(path.join(output.path, filename), bundle)
   return bundle
}


module.exports = noPack;


