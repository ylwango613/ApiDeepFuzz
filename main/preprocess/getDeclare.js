const esprima = require('esprima');
const fs = require('fs');
const vm = require('vm');

// 定义 config 对象
const config = {
  iJSDirectory: '/home/fuzz/JavaScriptParser/ApiDeepFuzz/Data/poc/1.js', // 输入文件目录
  oJSDirectory: '/home/fuzz/JavaScriptParser/ApiDeepFuzz/Data/pocref/1.js', // 输出文件目录
  objectTypeDiectory: "/home/fuzz/JavaScriptParser/ApiDeepFuzz/Data/output.txt", //对象类型输出的文件
  objectDiectory: "/home/fuzz/JavaScriptParser/ApiDeepFuzz/Data/obj.txt", //对象类型输出的文件
  newSampleDir: "/home/fuzz/JavaScriptParser/ApiDeepFuzz/Data/newsamples/", //存放编译后js的文件路径
  apiDir: "/home/fuzz/JavaScriptParser/ApiDeepFuzz/API/" //存放API文档的路径，API文档名称是对象类型
};


// 读取 JavaScript 代码
const script = fs.readFileSync(config.iJSDirectory, 'utf8');

const varType = "";
// 使用 esprima 解析 JavaScript 代码
const ast = esprima.parseScript(script, { loc: true, range: true, tokens: true });

function extractVarVariableNames(node, script, result) {
    if (node && node.type === 'VariableDeclaration') {
        // 遍历声明的变量
        node.declarations.forEach(declaration => {
            if (declaration.id.type === 'Identifier') {
                // 获取变量名和所在行号
                const variableName = declaration.id.name;
                const startlineNumber = declaration.loc.start.line;
                const endlineNumber = declaration.loc.end.line;
                const startColNumber = declaration.loc.start.column;
                const endColNumber = declaration.loc.end.column;
                // 将变量名和行号保存到结果数组中
                result.push({ variableName, startlineNumber, endlineNumber, startColNumber, endColNumber, varType});
            }
        });
    }

    // 递归遍历子节点
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

const result = [];
extractVarVariableNames(ast, script, result);

fs.writeFileSync(config.objectDiectory, JSON.stringify(result, null, 2));