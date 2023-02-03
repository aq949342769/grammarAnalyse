import { TABLE } from './interpret.js'
import {
  first, follow, select, forecast, vtArr, history, grammar, interpret
} from './interpret.js'

let len = 0
let isRender = false
export let targetStr: string = '';
function render() {
  let listWrapper = document.getElementById('list_wrapper')
  let middleWrapper = document.getElementsByClassName('middle_wrapper')[0]
  if (isRender) {
    // @ts-ignore
    listWrapper.innerHTML = ''
    middleWrapper.innerHTML = ''
    len = 0
  }  //展示三张表
  let fg = document.createDocumentFragment()
  fg.append(makeTable(first, 'FIRST集'), makeTable(follow, "FOLLOW集"), makeTable(select, "SELECT集"))
  listWrapper?.appendChild(fg)

  //展示预测表
  middleWrapper.appendChild(makeTable(forecast, "预测分析表", vtArr.slice(0, vtArr.length - 1)))

  //展示分析栈
  makeProcess(len)
  isRender = true

}
//按钮操作交互
let showList = document.getElementById('show_list');
showList?.addEventListener('click', () => {
  const listWrapper = document.getElementById('list_wrapper')
  if (listWrapper) {
    if (listWrapper.style.display === 'none') {
      listWrapper.style.display = 'flex'
      //@ts-ignore
      showList.innerText = '隐藏first、follow、select集'
    } else {
      listWrapper.style.display = 'none'
      //@ts-ignore
      showList.innerText = '显示first、follow、select集'
    }
  }
})

let nextBtn = document.getElementById('next')
nextBtn?.addEventListener('click', () => {
  if (len >= 0 && len < history.length - 1)
    makeProcess(++len)
})

let prevBtn = document.getElementById('prev')
prevBtn?.addEventListener('click', () => {
  if (len > 0) {
    len--
    let tableNode = document.getElementById('process_table')
    // @ts-ignore
    tableNode?.removeChild(tableNode.lastChild)
    console.log(len);

  }
})

let confirBtn = document.getElementById('confirm')
confirBtn?.addEventListener('click', () => {
  let target = document.getElementById('target')
  // @ts-ignore
  targetStr = target.value
  if (!targetStr.endsWith('#')) {
    alert('请按格式输入目标串')
  } else {
    try {
      interpret(targetStr)
      render()
    } catch (error) {
      alert(error)
    }
  }


})

let allBtn = document.getElementById('all')
allBtn?.addEventListener('click', () => {
  if (len === 0) {
    makeAllProcess()
    len = history.length 
    console.log(len);
    
  }
})

function makeTable(table: TABLE | Array<Array<number>>, title: string, col_title?: Array<string>) {
  let keys = Object.keys(table);
  let tableNode: HTMLTableElement = document.createElement('table')
  // 表名
  let caption: HTMLTableCaptionElement = document.createElement('caption')
  caption.append(title)
  tableNode.appendChild(caption)
  //渲染列
  if (col_title?.length) {
    let tr: HTMLTableRowElement = document.createElement('tr')
    for (let i = 0; i < col_title.length; i++) {
      let td: HTMLTableCellElement = document.createElement('td')
      td.append(col_title[i])
      tr.appendChild(td)
    }
    tableNode.appendChild(tr)
  }

  // 渲染行
  for (let i = 0; i < keys.length; i++) {
    if (isTABLE(table)) {
      let tr: HTMLTableRowElement = document.createElement('tr')
      let td: HTMLTableCellElement = document.createElement('td')
      let td2: HTMLTableCellElement = document.createElement('td')
      td.append(keys[i])
      td2.append(`{${Array.from((table as TABLE)[keys[i]])}}`)
      tr.appendChild(td)
      tr.appendChild(td2)
      tableNode.appendChild(tr)
    } else {
      let tr: HTMLTableRowElement = document.createElement('tr')
      let td: HTMLTableCellElement = document.createElement('td')
      //传入的是数组
      let curRow = (table as Array<Array<number>>)[i]
      for (let j = 0; j < curRow.length; j++) {
        let td: HTMLTableCellElement = document.createElement('td')
        td.append(grammar[curRow[j]] ? grammar[curRow[j]] : '')
        tr.appendChild(td)
      }
      tableNode.appendChild(tr)
    }

  }
  return tableNode
}

function makeProcess(len: number) {
  let tableNode = document.getElementById('process_table')
  let middleWrapper = document.getElementsByClassName('middle_wrapper')[0]
  let keys = Object.keys(history[0])
  if (!tableNode) {
    let tableNode: HTMLTableElement = document.createElement('table')
    let caption: HTMLTableCaptionElement = document.createElement('caption')
    //表名
    caption.append('匹配过程')
    tableNode.appendChild(caption)
    tableNode.setAttribute('id', 'process_table')

    //表头
    let headers = ['分析栈状态', '当前字符', '剩余字串', '下一个产生式', '是否匹配']
    let headRow: HTMLTableRowElement = document.createElement('tr')
    headers.forEach(e => {
      let td: HTMLTableCellElement = document.createElement('td')
      td.append(e)
      headRow.appendChild(td);
    })
    tableNode.appendChild(headRow)
    middleWrapper.appendChild(tableNode)

  } else {
    //表项
    let tr: HTMLTableRowElement = document.createElement('tr')
    for (let j = 0; j < keys.length; j++) {
      let td: HTMLTableCellElement = document.createElement('td')
      // @ts-ignore
      td.append(history[len][keys[j]])
      tr.appendChild(td)
    }
    tableNode.appendChild(tr)
    middleWrapper.appendChild(tableNode)
  }
}

function isTABLE(data: Object): boolean {
  return Object.keys(data)[0] !== '0'
}

function makeAllProcess() {
  let tableNode = document.getElementById('process_table')
  let middleWrapper = document.getElementsByClassName('middle_wrapper')[0]
  let keys = Object.keys(history[0])
  if (!tableNode) {
    let tableNode: HTMLTableElement = document.createElement('table')
    let caption: HTMLTableCaptionElement = document.createElement('caption')
    //表名
    caption.append('匹配过程')
    tableNode.appendChild(caption)
    tableNode.setAttribute('id', 'process_table')

    //表头
    let headers = ['分析栈状态', '当前字符', '剩余字串', '下一个产生式', '是否匹配']
    let headRow: HTMLTableRowElement = document.createElement('tr')
    headers.forEach(e => {
      let td: HTMLTableCellElement = document.createElement('td')
      td.append(e)
      headRow.appendChild(td);
    })
    tableNode.appendChild(headRow)
    middleWrapper.appendChild(tableNode)

  } else {
    //表项
    for (let i = 0; i < history.length; i++) {
      let tr: HTMLTableRowElement = document.createElement('tr')
      for (let j = 0; j < keys.length; j++) {
        let td: HTMLTableCellElement = document.createElement('td')
        // @ts-ignore
        td.append(history[i][keys[j]])
        tr.appendChild(td)
      }
      tableNode.appendChild(tr)
    }

    middleWrapper.appendChild(tableNode)
  }
}
