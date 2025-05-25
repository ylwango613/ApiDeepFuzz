const esprima = require('esprima');
const fs = require('fs');
const fsPromises = require('fs').promises;
const vm = require('vm');

// 配置路径
const config = {
  iJSDirectory: '/home/fuzz/JavaScriptParser/ApiDeepFuzz/Data/poc/1.js',
  oJSDirectory: '/home/fuzz/JavaScriptParser/ApiDeepFuzz/Data/pocref/1.js',
  objectTypeDiectory: '/home/fuzz/JavaScriptParser/ApiDeepFuzz/Data/output.txt',
  objectDiectory: '/home/fuzz/JavaScriptParser/ApiDeepFuzz/Data/obj.txt',
  newSampleDir: '/home/fuzz/JavaScriptParser/ApiDeepFuzz/Data/newsamples/',
  apiDir: '/home/fuzz/JavaScriptParser/ApiDeepFuzz/API/'
};

// 提取变量名函数
function extractVarVariableNames(node, script, result) {
  if (node && node.type === 'VariableDeclaration') {
    node.declarations.forEach(declaration => {
      if (declaration.id.type === 'Identifier') {
        const variableName = declaration.id.name;
        const startlineNumber = declaration.loc.start.line;
        const endlineNumber = declaration.loc.end.line;
        const startColNumber = declaration.loc.start.column;
        const endColNumber = declaration.loc.end.column;
        const content = ''; // 初始类型未知
        result.push({ variableName, startlineNumber, endlineNumber, startColNumber, endColNumber, content });
      }
    });
  }

  for (const key in node) {
    if (node[key] && typeof node[key] === 'object') {
      if (Array.isArray(node[key])) {
        node[key].forEach(item => {
          if (item && typeof item === 'object') {
            extractVarVariableNames(item, script, result);
          }
        });
      } else {
        extractVarVariableNames(node[key], script, result);
      }
    }
  }
}

// 插入行辅助函数（基于 async/await）
async function addStringsAfterLines(filePath, lineNumbers, strs, outputPath) {
  let data = await fsPromises.readFile(filePath, 'utf8');
  data = '\n' + data;
  const lines = data.split('\n');

  const sortedPairs = lineNumbers.map((line, index) => ({ line, str: strs[index] }))
                                 .sort((a, b) => b.line - a.line);

  sortedPairs.forEach(pair => {
    const { line, str } = pair;
    if (line >= 1 && line <= lines.length + 1) {
      lines.splice(line, 0, str);
    }
  });

  await fsPromises.writeFile(outputPath, lines.join('\n'));
}

// 主函数
(async function main() {
  try {
    // 读取原始脚本
    const script = await fsPromises.readFile(config.iJSDirectory, 'utf8');

    // AST 分析
    const ast = esprima.parseScript(script, { loc: true, range: true, tokens: true });
    const result = [];
    extractVarVariableNames(ast, script, result);

    // 插桩准备
    const toaddline = [1];
    const toaddstring = [
      `const fs = require('fs');const { stdout } = process;\nconst originalWrite = stdout.write;\nconst writeStream = fs.createWriteStream("${config.objectTypeDiectory}"); let flag = 0;let maxflag = ${result.length};`
    ];

    result.forEach(item => {
      toaddline.push(item.endlineNumber + 1);
      toaddstring.push(`
if(flag < maxflag){
    stdout.write = writeStream.write.bind(writeStream);
    console.log(Object.prototype.toString.call(${item.variableName}));
    stdout.write = originalWrite;
    flag ++;
}`);
    });

    // 写入插桩后的新文件
    await addStringsAfterLines(config.iJSDirectory, toaddline, toaddstring, config.oJSDirectory);

    // 执行插桩后的 JS 文件
    const instrumentedCode = await fsPromises.readFile(config.oJSDirectory, 'utf8');

    const context = {
      console: console,
      process: process,
      require: require
    };

    const scriptToRun = new vm.Script(instrumentedCode, { timeout: 1000 });
    scriptToRun.runInNewContext(context);

    // 延时保证 writeStream 写入完成
    await new Promise(resolve => setTimeout(resolve, 300));

    // 读取类型输出文件
    const objtype = await fsPromises.readFile(config.objectTypeDiectory, 'utf8');
    const lines = objtype.split('\n');

    for (let i = 0; i < result.length; i++) {
      const match = lines[i].match(/\[object\s+(\w+)\]/);
      if (match) {
        result[i].content = match[1];
      }
    }

    // 写入最终类型结果
    await fsPromises.writeFile(config.objectDiectory, JSON.stringify(result, null, 2));
    console.log("变量类型提取完成 ✅");

  } catch (err) {
    console.error("程序运行出错 ❌:", err);
  }
})();
