const esprima = require('esprima');
const fs = require('fs');
const vm = require('vm');

// 定义 config 对象
const config = {
  iJSDirectory: '/home/fuzz/JavaScriptParser/DeepFuzz/1.js', // 输入文件目录
  oJSDirectory: '/home/fuzz/JavaScriptParser/esprima/_2subapi.js', // 输出文件目录
  objectTypeDiectory: "/home/fuzz/JavaScriptParser/esprima/output.txt", //对象类型输出的文件
  objectDiectory: "/home/fuzz/JavaScriptParser/esprima/obj.txt", //对象类型输出的文件
  newSampleDir: "/home/fuzz/JavaScriptParser/esprima/newsample/", //存放编译后js的文件路径
  apiDir: "/home/fuzz/JavaScriptParser/API/" //存放API文档的路径，API文档名称是对象类型
};


// 读取 JavaScript 代码
const script = fs.readFileSync(config.iJSDirectory, 'utf8');

const content = ""
// 使用 esprima 解析 JavaScript 代码
const ast = esprima.parseScript(script, { loc: true, range: true, tokens: true});

function extractVarVariableNames(node, script, result) {
    // 判断是否为 VariableDeclaration 类型的节点
    // AssignmentExpression left: 变量集合 right：update集合
    // 
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
                result.push({ variableName, startlineNumber, endlineNumber, startColNumber, endColNumber, content});
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

const toaddline = [1];
const toaddstring = [
  `const fs = require('fs');const { stdout } = process;\nconst originalWrite = stdout.write;\nconst writeStream = fs.createWriteStream("${config.objectTypeDiectory}"); let flag = 0;let maxflag = ${result.length};`
];

result.forEach(item => {
  toaddline.push(item.endlineNumber + 1);
  toaddstring.push(`    if(flag < maxflag){
      stdout.write = writeStream.write.bind(writeStream);
      console.log(Object.prototype.toString.call(${item.variableName}));
      stdout.write = originalWrite;
      flag ++;
    }`);
});

console.log('toaddline:', toaddline);
console.log('toaddstring:', toaddstring);


/**
 * 在指定文件的指定行后面添加字符串
 * @param {string} filePath - 文件路径
 * @param {number[]} lineNumbers - 行号数组（从1开始计数）
 * @param {string[]} strs - 要添加的字符串数组
 */
function addStringsAfterLines(filePath, lineNumbers, strs) {
    // 读取文件内容
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('读取文件失败:', err);
            return;
        }
        data = '\n' + data;
        // 按行分割文件内容
        const lines = data.split('\n');
        // 按行号排序，确保从后往前插入，避免影响后续行号
        const sortedPairs = lineNumbers.map((line, index) => ({ line, str: strs[index] }))
                                       .sort((a, b) => b.line - a.line);

        // 在指定行后面添加字符串
        sortedPairs.forEach(pair => {
            const { line, str } = pair;
            if (line < 1 || line > lines.length + 1) {
                console.error(`指定的行号 ${line} 超出文件范围`);
                return;
            }
            lines.splice(line, 0, str);
        });

        // 将修改后的内容写回文件
        fs.writeFile(config.oJSDirectory, lines.join('\n'), (err) => {
            if (err) {
                console.error('写入文件失败:', err);
            } else {
                console.log('字符串已成功添加到文件中');
            }
        });
    });
}

addStringsAfterLines(config.iJSDirectory,toaddline,toaddstring)

try{
    // 定义要运行的代码片段
    const code = fs.readFileSync(config.oJSDirectory, 'utf8');

    // 创建一个上下文环境
    const context = {
        console: console,
        process: process,
        require: require
    };

    // 创建一个脚本对象
    const script1 = new vm.Script(code);
    script1.runInNewContext(context);


    const objtype = fs.readFileSync(config.objectTypeDiectory, 'utf8');
    const lines = objtype.split('\n'); // 假设objtype是一个字符串，按行分割

    for (let i = 0; i < result.length; i++) {
    const match = lines[i].match(/\[object\s+(\w+)\]/); // 对每一行进行正则匹配
    if (match) { // 如果匹配成功
        result[i].content = match[1]; // 修改result数组中对应元素的content值
    }
    }
    // console.log(result)
    fs.writeFileSync(config.objectDiectory, JSON.stringify(result, null, 2));
    
} catch (error) {
    console.error('解析错误:', error.message);
}