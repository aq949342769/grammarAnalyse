import { targetStr } from './render.js';
//  枚举类型nil必须放在最后，同时要和对应的字符数组顺序保持一致
// 测试用例1
// enum VN { E0, E1, T0, T1, F };
// enum VT { i, plus, mul, leftBracket, rightBrancket, shur, nil };
let VN_arr = ["E", "E'", "T", "T'", "F"];
let VT_arr = ["i", "+", "*", "(", ")", "#", "nil"];
let G = ["E->TE'", "E'->+TE'", "E'->nil", "T->FT'", "T'->*FT'", "T'->nil", "F->i", "F->(E)"];
let startChar = 'E';
// ------------------------
// 测试用例2
// enum VN { S, A, B, C, D }
// enum VT { a, b, c, shur, nil }
// let VN_arr: Array<string> = ["S", "A", "B", "C", "D",]
// let VT_arr: Array<string> = ["a", "b", "c", "#", "nil"]
// let G: Array<string> = ["S->AB", "S->bC", "A->nil", "A->b", "B->nil", "B->aD", "C->AD", "C->b", "D->aS", "D->c"]
// let startChar = 'S'
let isToNil = {}; //能推出空字符的布尔向量
let FIRST_table = {}; //每个文法符号的first集
let FOLLOW_table = {}; //每个非终结符的follow集
let SELECT_table = {}; //每个产生式的select集
let FORECAST_TABLE = []; //预测分析表
let CStack = []; //分析栈
let cur = 0; //指向目前读到的字母索引
let SYM = ''; //目前读到的符号
let history = [];
/**
 * 处理字符串形式的文法，变成结构化的文法规则
 * 形如：
 * {
 *    E: [[T, E']],
 *    E':[[+, T, E'],[nil]],
 *    ...
 * }
 */
function getGrammar() {
    let G_struct = {};
    G.forEach((e, i, arr) => {
        let [vn, right] = e.split("->");
        let chars = right.split('');
        //处理使用E'命名非终结符的情况
        chars.forEach((e, i, arr) => {
            if (arr[i + 1] === "'") {
                arr.splice(i, 2, `${e}'`);
            }
            if (e === 'n') {
                if (arr[i + 1] === 'i') {
                    if (arr[i + 2] === 'l') {
                        arr.splice(i, 3, 'nil');
                    }
                }
            }
        });
        if (Object.keys(G_struct).indexOf(vn) === -1) {
            //未添加的非终结符
            G_struct[vn] = [];
        }
        //按顺序添加文法右边的字母
        G_struct[vn].push([...chars]);
    });
    return G_struct;
}
/**
 * 求出能推出nil的非终结符
 */
function getIsToNil() {
    let G_struct = getGrammar();
    VN_arr.forEach(e => {
        isToNil[e] = undefined;
    });
    //遍历所有非终结符的产生式
    for (let i = 0; i < VN_arr.length; i++) {
        let vn = VN_arr[i];
        let productionArr = G_struct[vn];
        //第一次扫描该非终结符所有产生式
        for (let j = 0; j < productionArr.length; j++) {
            let production = productionArr[j];
            //遍历某一条产生式的右部
            for (let k = 0; k < production.length; k++) {
                let ch = production[k];
                if (ch === 'nil') {
                    // 如果推出空
                    isToNil[vn] = true;
                    productionArr.length = 0;
                    break;
                }
                else if (VT_arr.indexOf(ch) !== -1) {
                    // 如果含有终结符
                    productionArr.splice(j--, 1);
                    if (productionArr.length === 0) {
                        isToNil[vn] = false;
                    }
                    break;
                }
            }
        }
    }
    //第二次扫描所有产生式
    let modify = true;
    while (modify) {
        modify = false;
        for (let i = 0; i < VN_arr.length; i++) {
            let vn = VN_arr[i];
            let productionArr = G_struct[vn];
            if (productionArr.length === 0)
                continue;
            //遍历某一条产生式的右部
            for (let j = 0; j < productionArr.length; j++) {
                let production = productionArr[j];
                for (let k = 0; k < production.length; k++) {
                    let ch = production[k];
                    // 如果该非终结符可以推出nil，删去
                    if (isToNil[ch] === true) {
                        production.splice(k--, 1);
                        // 如果右部为空，将该产生式左部的的标志改为true，并删除其所有产生式
                        if (production.length === 0) {
                            isToNil[vn] = true;
                            modify = true;
                        }
                        continue;
                    }
                    //如果该非终结符不能推出nil
                    if (isToNil[ch] === false) {
                        //删除该产生式
                        productionArr.splice(j--, 1);
                        //如果该产生式的左部的所有产生式都没了，设置其标记为false
                        if (G_struct[vn].length === 0) {
                            isToNil[vn] = false;
                            modify = true;
                        }
                        continue;
                    }
                }
            }
        }
    }
    return isToNil;
}
/**
 * 求出FIRST集
 */
function getSingleSymFIRST(x, G_struct) {
    //1.如果X是终结符，则FIRST(X) = {X}
    //2.如果X是非终结符，且有以终结符a为开头的产生式，则a添加到FIRST(X)
    //3.如果X是非终结符，但是X能推出nil，则把nil添加到FIRST(X)
    //4.按顺序扫描X的某条产生式右部，如果全部都是非终结符且都能推出nil，则 FIRST(所有这些非终结符) - {nil} 与FIRST(X)合并
    //5.4结束了，把nil添加到FIRST(X)
    let singleSymFIRST = FIRST_table.hasOwnProperty(x) ? FIRST_table[x] : new Set();
    if (VT_arr.indexOf(x) !== -1) {
        singleSymFIRST = new Set([x]);
    }
    else {
        let productions = G_struct[x];
        let modify = true;
        while (modify) {
            modify = false;
            // debugger
            let curSize = singleSymFIRST.size;
            //遍历x的所有产生式
            for (let i = 0; i < productions.length; i++) {
                let production = productions[i];
                //遍历某一条产生式的右部
                for (let j = 0; j < production.length; j++) {
                    //Y是该条产生式的右部某符号
                    let Y = production[j];
                    //如果遇到终结符或者nil,添加
                    if (VT_arr.indexOf(Y) !== -1) {
                        singleSymFIRST.add(Y);
                        break;
                    }
                    else {
                        //如果Y间接推出nil,除去nil,合并
                        if (isToNil[Y]) {
                            let firstOfK = new Set([...getSingleSymFIRST(Y, G_struct)]); //复制一份，因为这里是使用的是引用
                            firstOfK.delete('nil');
                            singleSymFIRST = new Set([...singleSymFIRST, ...firstOfK]);
                            //如果全部都最后推出nil
                            if (j === production.length - 1) {
                                singleSymFIRST.add('nil');
                            }
                        }
                        else {
                            // 该项不能推出nil
                            singleSymFIRST = new Set([...singleSymFIRST, ...getSingleSymFIRST(Y, G_struct)]);
                            break;
                        }
                    }
                }
            }
            modify = (curSize !== singleSymFIRST.size);
        }
    }
    FIRST_table[x] = singleSymFIRST;
    return singleSymFIRST;
}
/**
 * 求任意符号的FIRST集
 */
function getAnySymFIRST(str, G_struct) {
    //只有一个字符,调用getSingleSymFIRST
    if (str.length === 1 || str === 'nil') {
        return FIRST_table.hasOwnProperty(str) ? FIRST_table[str] : getSingleSymFIRST(str, G_struct);
    }
    //有多个字符
    let FIRST = new Set();
    let strArr = str.split('');
    for (let i = 0; i < strArr.length; i++) {
        let X = strArr[i];
        //第一个字符不能推出nil
        if (i === 0 && !isToNil[X]) {
            return getSingleSymFIRST(X, G_struct);
        }
        //一直合并到第一个不能推出nil的字符
        let Xset = new Set([...getSingleSymFIRST(X, G_struct)]);
        if (isToNil[X]) {
            Xset.delete('nil');
            FIRST = new Set([...FIRST, ...Xset]);
            if (i === strArr.length - 1) {
                FIRST.add('nil');
            }
        }
        else {
            FIRST = new Set([...FIRST, ...Xset]);
        }
    }
    return FIRST;
}
/**
 * 求出FOLLOW集
 */
function getFOLLOW(G_struct) {
    VN_arr.forEach(e => {
        if (e === startChar) {
            FOLLOW_table[e] = new Set(['#']);
        }
        else {
            FOLLOW_table[e] = new Set([]);
        }
    });
    let modify = true;
    // debugger
    while (modify) {
        modify = false;
        for (let i = 0; i < VN_arr.length; i++) {
            let A = VN_arr[i];
            let FOLLOW_A = FOLLOW_table[A];
            let produtions = G_struct[A];
            produtions.forEach(prodution => {
                prodution.forEach((ch, i, arr) => {
                    if (VT_arr.indexOf(ch) !== -1) {
                        //1.遇到终结符,跳过
                    }
                    else {
                        //2.遇到非终结符
                        let FOLlOW_B = FOLLOW_table[ch];
                        if (i + 1 === arr.length) {
                            //形如A->aB 如果b能推出nil follow(A) U follow(B)
                            let change = isChange(FOLlOW_B.size, FOLlOW_B = new Set([...FOLLOW_A, ...FOLlOW_B]));
                            if (change) {
                                FOLLOW_table[ch] = FOLlOW_B;
                                modify = true;
                            }
                        }
                        else {
                            //形如A->aBb
                            //first(b) - {nil} U follow(B)
                            let b = arr[i + 1];
                            let bFIRST = new Set([...FIRST_table[b]]);
                            bFIRST.delete('nil');
                            let change = isChange(FOLlOW_B.size, FOLlOW_B = new Set([...FOLlOW_B, ...bFIRST]));
                            if (change) {
                                FOLLOW_table[ch] = FOLlOW_B;
                                modify = true;
                            }
                            if (isToNil[b]) {
                                //形如A->aB 如果b能推出nil follow(A) U follow(B)
                                let change = isChange(FOLlOW_B.size, FOLlOW_B = new Set([...FOLLOW_A, ...FOLlOW_B]));
                                if (change) {
                                    FOLLOW_table[ch] = FOLlOW_B;
                                    modify = true;
                                }
                            }
                        }
                    }
                });
            });
        }
    }
    return FOLLOW_table;
}
function isChange(size, set_) {
    return size !== set_.size;
}
/**
 * 求出SECLECT集
 */
function getSELLECT(G_struct) {
    //遍历所有产生式A->a
    G.forEach(production => {
        let [left, right] = production.split('->');
        let fisrtOfRight = new Set([...getAnySymFIRST(right, G_struct)]);
        if (!fisrtOfRight.has('nil')) {
            //如果a不能推出nil select(A->a) =  first(a)
            SELECT_table[production] = fisrtOfRight;
        }
        else {
            //如果a可以推出nil select(A->a) = first(a) -{nil} U follow(A)
            fisrtOfRight.delete('nil');
            let followOfLeft = FOLLOW_table[left];
            SELECT_table[production] = new Set([...fisrtOfRight, ...followOfLeft]);
        }
    });
    return SELECT_table;
}
/**
 * 构造预测表
 */
function getForecastTable() {
    let productions = Object.keys(SELECT_table);
    //减一是因为‘nil’在最后，不需要包含在预测表中
    FORECAST_TABLE = new Array(VN_arr.length).fill(0).map(_ => new Array(VT_arr.length - 1).fill(-1));
    for (let i = 0; i < productions.length; i++) {
        let production = productions[i];
        let set = SELECT_table[production];
        let vn = production.split('->')[0];
        set.forEach(vt => {
            FORECAST_TABLE[VN_arr.indexOf(vn)][VT_arr.indexOf(vt)] = G.indexOf(production);
        });
    }
    return FORECAST_TABLE;
}
/**
 * 初始化工作
 * 1.存储文法规则
 * 2.初始化能推出空字符的布尔向量
 * 3.初始化每个文法符号的first集
 * 4.初始化每个非终结符的follow集
 * 5.初始化每个产生式的select集
 * 6.初始化预测分析表
 */
function init() {
    isToNil = {}; //能推出空字符的布尔向量
    FIRST_table = {}; //每个文法符号的first集
    FOLLOW_table = {}; //每个非终结符的follow集
    SELECT_table = {}; //每个产生式的select集
    FORECAST_TABLE = []; //预测分析表
    CStack = []; //分析栈
    cur = 0; //指向目前读到的字母索引
    SYM = ''; //目前读到的符号
    history = [];
    let G_struct = getGrammar();
    getIsToNil();
    VN_arr.forEach(e => {
        getSingleSymFIRST(e, G_struct);
    });
    VT_arr.forEach(e => {
        if (e !== '#')
            getSingleSymFIRST(e, G_struct);
    });
    getFOLLOW(G_struct);
    getSELLECT(G_struct);
    getForecastTable();
}
/**
 * 读入一个字母
 *
 */
function getSym() {
    SYM = targetStr.charAt(cur++);
}
/**
 * 分析入口程序
 */
function interpret(target) {
    init();
    CStack.push('#');
    CStack.push(startChar);
    getSym();
    history.push({
        curState: [...CStack],
        curSym: SYM,
        remainTarget: target.slice(cur),
        prod: `M[${CStack[CStack.length - 1]}, ${SYM}]`,
        match: CStack[CStack.length - 1] === SYM
    });
    while (CStack.length > 0) {
        let X = CStack.pop();
        // @ts-ignore
        if (VT_arr.indexOf(X) !== -1 && X !== '#') {
            //是终结符
            if (X === SYM) {
                getSym();
                history.push({
                    curState: [...CStack],
                    curSym: SYM,
                    remainTarget: target.slice(cur),
                    prod: `M[${CStack[CStack.length - 1]}, ${SYM}]`,
                    match: CStack[CStack.length - 1] === SYM
                });
            }
            else if (X === 'nil') {
                continue;
            }
            else {
                throw Error('语法错误 错误代码：1');
            }
        }
        else if (X !== '#') {
            // @ts-ignore
            let index = FORECAST_TABLE[VN_arr.indexOf(X)][VT_arr.indexOf(SYM)];
            if (index >= 0) {
                let readyToStack = G[index].split('->')[1].split('');
                readyToStack.forEach((e, i, arr) => {
                    if (arr[i + 1] === "'") {
                        arr.splice(i, 2, `${e}'`);
                    }
                    if (e === 'n') {
                        if (arr[i + 1] === 'i') {
                            if (arr[i + 2] === 'l') {
                                arr.splice(i, 3, 'nil');
                            }
                        }
                    }
                });
                readyToStack.reverse();
                CStack.push(...readyToStack);
                history.push({
                    curState: [...CStack],
                    curSym: SYM,
                    remainTarget: target.slice(cur),
                    prod: `M[${CStack[CStack.length - 1]}, ${SYM}]`,
                    match: CStack[CStack.length - 1] === SYM
                });
            }
        }
        else if (X === SYM) {
            history.push({
                curState: [...CStack],
                curSym: SYM,
                remainTarget: target.slice(cur),
                prod: '',
                match: '接受'
            });
        }
        else {
            throw Error('语法错误 错误代码：2');
        }
    }
}
export { interpret, FIRST_table as first, FOLLOW_table as follow, SELECT_table as select, FORECAST_TABLE as forecast, VT_arr as vtArr, G as grammar, history };
