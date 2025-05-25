
const fs = require('fs');const { stdout } = process;
const originalWrite = stdout.write;
const writeStream = fs.createWriteStream("/home/fuzz/JavaScriptParser/ApiDeepFuzz/Data/output.txt"); let flag = 0;let maxflag = 2;
function f() {
    let arr = new Uint32Array(10);
    if(flag < maxflag){
      stdout.write = writeStream.write.bind(writeStream);
      console.log(Object.prototype.toString.call(arr));
      stdout.write = originalWrite;
      flag ++;
    }
    for (let i = 0; i < 0x100000; i++) {
    if(flag < maxflag){
      stdout.write = writeStream.write.bind(writeStream);
      console.log(Object.prototype.toString.call(i));
      stdout.write = originalWrite;
      flag ++;
    }
        parseInt();
    }
    arr[8] = 1;
    arr[-0x12345678] = 2;
}

f();