const esprima = require('esprima');
const fs = require('fs');

// 读取 JavaScript 代码
const jsCode = fs.readFileSync('./1.js', 'utf8');
// 使用配置对象解析代码
const ast = esprima.parseScript(jsCode, {
  range: true, // 添加基于索引的位置信息
  loc: true,  // 添加基于行和列的位置信息
  tokens: true, // 收集令牌
  comment: true // 收集注释
});

// 将 AST 转换为 JSON 字符串
const astJson = JSON.stringify(ast, null, 2);

// 将 JSON 数据写入到当前文件夹下的文件中
fs.writeFile('ast.json', astJson, (err) => {
  if (err) {
    console.error('写入文件失败:', err);
  } else {
    console.log('AST 已成功导出到 ast.json 文件中');
  }
});