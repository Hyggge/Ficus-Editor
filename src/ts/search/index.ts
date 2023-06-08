import { processAfterRender } from "../sv/process";
import { hasClosestBlock } from "../util/hasClosest";
import { getEditorRange, insertHTML, setRangeByWbr } from "../util/selection";
import { afterRenderEvent } from "../wysiwyg/afterRenderEvent";

export class Search {
    public isSearching: boolean;
    public searchText: string;
    private searchResults: Node[];
    private pos: number;
    private ignoreCase: boolean;
    private matchWholeWord: boolean;

    constructor() {
        this.isSearching = false;
        this.searchText = "";
        this.searchResults = [];
        this.pos = 0;
        this.ignoreCase = true;
        this.matchWholeWord = false;
    }

    /**
     * 开启搜索
     * @param searchText 
     * @param vditor 
     */
    public run(vditor: IVditor, searchText: string, focus: boolean = false) :void {
        // 保存光标位置
        vditor[vditor.currentMode].element.querySelectorAll("wbr").forEach((wbr) => {
            wbr.remove();
        });
        insertHTML('<wbr>', vditor);
        let wbr = vditor[vditor.currentMode].element.querySelector("wbr");
        if (wbr.nextSibling?.textContent === "") {
            wbr.parentNode.removeChild(wbr.nextSibling);
        }

        // 如果已经处于开启状态，则需要先清空已经高亮的内容
        if (this.isSearching) {
            this.clearResults(vditor);
        }
        // 合并连续的文本节点
        this.mergeTextNodes(vditor);

        // 设置当前状态和当前搜索文本
        this.isSearching = true;
        this.searchText = searchText;
        
        // 如果发现插入的<wbr>正好将一个可以匹配的字符串分割，则调整<wbr>的位置
        // 假设<wbr>正好将一个可以匹配的字符串分割, 则len1表示分割后前半部分的长度, len2表示后半部分长度
        wbr = vditor[vditor.currentMode].element.querySelector("wbr");
        let len1 = -1, len2 = -1; 
        
        if (this.searchText !== "" && wbr.previousSibling && wbr.nextSibling) {
            const previousText = wbr.previousSibling.textContent;
            const nextText = wbr.nextSibling.textContent;
            const check = previousText + nextText.slice(0, this.searchText.length-1);
            const index = check.lastIndexOf(this.searchText);
            if (index !== -1 && index < previousText.length && index + this.searchText.length > previousText.length) {
                len1 = previousText.length - index;
                len2 = this.searchText.length - len1;
                wbr.nextSibling.textContent = nextText.slice(len2)
                wbr.previousSibling.textContent += nextText.slice(0, len2)
            }
        }
        
        // 获取所有匹配searchText的节点, 并进行高亮
        this.searchResults = this.getSearchResult(vditor);
   
        // 将<wbr>重新设置到原来的位置
        if (len2 !== -1) {
            wbr = vditor[vditor.currentMode].element.querySelector("wbr");
            const splitedNode = wbr.previousSibling.previousSibling as HTMLElement
            splitedNode.innerHTML = this.searchText.slice(0, len1) + "<wbr>" + this.searchText.slice(len1)
            wbr.remove()
        }

        // 找到光标后第一个匹配searchText的节点，作为第一个跳转的节点
        this.pos = this.getStartPos(vditor);
        if (this.pos !== -1) {
            (this.searchResults[this.pos] as HTMLElement).classList.add("vditor-search__current");
            // 将第一个跳转的节点滚动到可视区域, 并进行特殊的高亮
            if (focus) {
                this.focusOnNode(this.searchResults[this.pos]);
            }
        }
        
        // 将光标设置到<wbr>的位置
        setRangeByWbr(vditor[vditor.currentMode].element, getEditorRange(vditor));
    }


    /**
     * 关闭搜索, 清除搜索结果的高亮
     * @param vditor 
     */
    public close(vditor: IVditor) :void {
        if (!this.isSearching) {
            return;
        }
        this.isSearching = false;

        // 保存光标位置
        vditor[vditor.currentMode].element.querySelectorAll("wbr").forEach((wbr) => {
            wbr.remove();
        });
        insertHTML('<wbr>', vditor);
        let wbr = vditor[vditor.currentMode].element.querySelector("wbr");
        if (wbr.nextSibling?.textContent === "") {
            wbr.parentNode.removeChild(wbr.nextSibling);
        }

        // 清除result的内容及其高亮
        this.clearResults(vditor);

        // 将光标设置到<wbr>的位置
        setRangeByWbr(vditor[vditor.currentMode].element, getEditorRange(vditor));
    }

    /**
     * 清空搜索结果及其高亮
     */
    private clearResults(vditor: IVditor) :void {
        const nodeList =  [...this.searchResults];
        while (nodeList.length) {
            const node = nodeList.shift();
            // 如果node已经在编辑区中被删去了,则不需要进行处理
            if (node.parentNode === null) {
                continue;
            }
            // 如果node中包含了<wbr>标签
            const wbr = (node as HTMLElement).querySelector("wbr");
            if (wbr) {
                const span1 = document.createElement("span");
                const span2 = document.createElement("span");
                span1.innerHTML = wbr.previousSibling.textContent;
                span2.innerHTML = wbr.nextSibling.textContent;
                node.parentNode.insertBefore(span1, node);
                node.parentNode.insertBefore(document.createElement("wbr"), node);
                node.parentNode.insertBefore(span2, node);
                node.parentNode.removeChild(node);
                nodeList.unshift(span2, span1);
                wbr.remove();
                continue;
            }
            // // 如果前面的节点是文本节点，则将当前节点的内容添加到前面的文本节点中
            // if (node.previousSibling?.nodeType === 3) {
            //     node.previousSibling.textContent += node.textContent;
            //     // 如果后面的节点也是文本节点，则将后面的文本节点的内容添加到前面的文本节点中，并删除后面的文本节点
            //     if (node.nextSibling?.nodeType === 3) {
            //         node.previousSibling.textContent += node.nextSibling.textContent;
            //         node.parentNode.removeChild(node.nextSibling);
            //     }
            // }
            // // 如果后面的节点是文本节点，则将当前节点的内容添加到后面的文本节点中
            // else if (node.nextSibling?.nodeType === 3) {
            //     node.nextSibling.textContent = node.textContent + node.nextSibling.textContent;
            // }
            // // 如果前后的节点都不是文本节点，则在当前节点前面插入一个文本节点
            // else {
            //     node.parentNode.insertBefore(document.createTextNode(node.textContent), node);
            // }

            node.parentNode.insertBefore(document.createTextNode(node.textContent), node);
            // 删除当前节点
            node.parentNode.removeChild(node);
        }

        this.searchResults = [];
        this.pos = -1;
    }

    /**
     * 跳转到下一个匹配searchText的节点, 同时进行高亮
     * 如果没有匹配的节点，则不进行任何操作
     * @param vditor 
     */
    public next(vditor: IVditor) :void {
        if (!this.isSearching || this.searchResults.length === 0) {
            return;
        }
        (this.searchResults[this.pos] as HTMLElement).classList.remove("vditor-search__current");    
        this.pos = (this.pos + 1) % this.searchResults.length;
        this.focusOnNode(this.searchResults[this.pos]);
    }
    
    /**
     * 跳转到上一个匹配searchText的节点, 同时进行高亮
     * 如果没有匹配的节点，则不进行任何操作
     * @param vditor 
    */
    public prev(vditor: IVditor) :void {
       if (!this.isSearching || this.searchResults.length === 0) {
           return;
        }
        (this.searchResults[this.pos] as HTMLElement).classList.remove("vditor-search__current");    
        this.pos = (this.pos - 1 + this.searchResults.length) % this.searchResults.length;
        this.focusOnNode(this.searchResults[this.pos]);
    }


    /** 
     * 设置是否忽略大小写
     * @param ignoreCase    值为true表示忽略大小写
     */
    public setIgnoreCase(ignoreCase: boolean) :void {
        this.ignoreCase = ignoreCase;
    }

    /**
     *
     * 设置是否全词匹配
     * @param matchWholeWord    值为true表示全词匹配
     */
    public setMatchWholeWord(matchWholeWord: boolean) :void {
        this.matchWholeWord = matchWholeWord;
    }

    /**
     * 替换pos所指向的node的内容
     * @param vditor
     * @param replaceText   替换后的内容
     * @param focus         是否跳转到下一个可以被替换的node
     * @param saveCursor    是否在替换之前保存光标位置(替换后恢复)
     */
    public replace(vditor: IVditor, replaceText: string, focus: boolean = true, saveCursor = true) :void {
        if (!this.isSearching || this.searchResults.length === 0 || vditor.options.editable === false) {
            return;
        }

        // 如果replaceText和searchText相同, 跳过, 直接聚焦到下一个搜索结果
        if (replaceText === this.searchText) {
            this.next(vditor);
            return;
        }

        // 保存光标位置
        let wbr = null;
        if (saveCursor) {
            vditor[vditor.currentMode].element.querySelectorAll("wbr").forEach((wbr) => {
               wbr.remove();
            });
            insertHTML('<wbr>', vditor);
            wbr = vditor[vditor.currentMode].element.querySelector("wbr");
            if (wbr.nextSibling?.textContent === "") {
                wbr.parentNode.removeChild(wbr.nextSibling);
            }
        }

        // 找到当前聚焦的匹配节点
        let node = this.searchResults[this.pos];

        // 在当前节点前面插入一个文本节点，用于替换当前节点
        let textNode = document.createTextNode(replaceText);
        node.parentNode.insertBefore(textNode, node);
        if (saveCursor && node.contains(wbr)) {
            node.parentNode.insertBefore(document.createElement("wbr"), node);
        }
        node.parentNode.removeChild(node);
        node = textNode;

        // 如果replaceText仍然匹配searchText
        const pattern = /[\[\(\$\^\.\]\*\\\?\+\{\}\\|\)]/gi;
        const newSearchText = this.searchText.replace(pattern, key => "\\" + key);
        const regExp = new RegExp(this.matchWholeWord ? `\\b${newSearchText}\\b` : newSearchText,
                                  this.ignoreCase ? "i" : "");
        if (replaceText.match(regExp)) {
            let text = node.textContent;
            let index = node.textContent.search(regExp);
            const newNodeList: Node[] = [];

            // 得到replaceText中所有的搜索结果, 存入newNodeList中
            while (index !== -1) {
                const newNode = document.createElement("span");
                newNode.classList.add("vditor-search__result");
                newNode.textContent = text.slice(index, index + this.searchText.length);
                node.parentNode.insertBefore(newNode, node);
                node.parentNode.insertBefore(document.createTextNode(text.slice(0, index)), newNode);
                node.nodeValue = text.slice(index + this.searchText.length);
                newNodeList.push(newNode);
                // 更新循环变量
                text = node.textContent;
                index = node.textContent.search(regExp);
            }

            // 将newNodeList中的元素插入到this.searchResults中对应位置
            this.searchResults.splice(this.pos, 1, ...newNodeList);
            this.pos = this.pos + newNodeList.length;
            if (this.pos === this.searchResults.length) this.pos = 0;
        }

        // 否则, 直接删除指针对应的Node，同时更新指针位置
        else {
            this.searchResults.splice(this.pos, 1);
            if (this.searchResults.length === 0)                this.pos = -1;
            else if (this.pos === this.searchResults.length)    this.pos = 0;
        }

        // 将光标设置到<wbr>的位置
        if (saveCursor) {
            setRangeByWbr(vditor[vditor.currentMode].element, getEditorRange(vditor));
        }
        // 聚焦到新的匹配节点
        if (this.pos !== -1) {

            if (focus) {
                // 进行特殊高亮并聚焦
                this.focusOnNode(this.searchResults[this.pos]);
            } else {
                // 只进行特殊高亮
                (this.searchResults[this.pos] as HTMLElement).classList.add("vditor-search__current");
            }
        }

        // 渲染后处理
        this.isSearching = false;
        if (vditor.currentMode === "sv") {
            processAfterRender(vditor, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        } else if (vditor.currentMode === "wysiwyg") {
            afterRenderEvent(vditor, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        }
        this.isSearching = true;
    }

    /**
     * 全部替换
     * @param vditor
     * @param replaceText   替换后的内容
     */
    public replaceAll(vditor: IVditor, replaceText: string) :void {
        if (!this.isSearching || this.searchResults.length === 0 || replaceText === this.searchText) {
            return;
        }

        // 保存光标位置
        vditor[vditor.currentMode].element.querySelectorAll("wbr").forEach((wbr) => {
            wbr.remove();
        });
        insertHTML('<wbr>', vditor);
        let wbr = vditor[vditor.currentMode].element.querySelector("wbr");
        if (wbr.nextSibling?.textContent === "") {
            wbr.parentNode.removeChild(wbr.nextSibling);
        }

        // 对所有的搜索结果都进行替换
        const num = this.searchResults.length;
        for (let i = 0; i < num; i++) {
            this.replace(vditor, replaceText, false, false);
        }

        // 将光标设置到<wbr>的位置
        setRangeByWbr(vditor[vditor.currentMode].element, getEditorRange(vditor));
    }

    /**
     * 获取当前搜索结果的总数和当前搜索结果的位置
     * @returns ISearchCounter对象
     */
    public getSearchCounter() :ISearchCounter {
        return {
            current: this.pos + 1,
            total: this.searchResults.length
        }
    }


    /**
     * 找到所有匹配searchText的节点
     * 为匹配的文本添加span标签，用于高亮显示
     * @param vditor 
     * @returns 搜索结果对应的节点列表
     */
    private getSearchResult(vditor: IVditor) :Node[] {
        if (this.searchText === "") {
            return [];
        }

        const result: Node[] = [];
        const nodeList = Array.from(vditor[vditor.currentMode].element.childNodes);
        const pattern = /[\[\(\$\^\.\]\*\\\?\+\{\}\\|\)]/gi
        const newSearchText = this.searchText.replace(pattern, key => "\\" + key);
        const regExp = new RegExp(this.matchWholeWord ? `\\b${newSearchText}\\b` : newSearchText,
                                  this.ignoreCase ? "i" : "");
                                  
        while(nodeList.length) {
            let node = nodeList.shift()
            // 如果是文本节点
            if (node.nodeType === node.TEXT_NODE) {
                let text = node.textContent;
                let index = node.textContent.search(regExp);
                            
                while (index !== -1) {
                    const newNode = document.createElement("span");
                    newNode.classList.add("vditor-search__result");
                    newNode.textContent = text.slice(index, index + this.searchText.length);
                    node.parentNode.insertBefore(newNode, node);
                    node.parentNode.insertBefore(document.createTextNode(text.slice(0, index)), newNode);
                    node.nodeValue = text.slice(index + this.searchText.length);
                    result.push(newNode);
                    
                    text = node.textContent;
                    index = node.textContent.search(regExp);
                }
            } 
            // 如果是元素节点
            else {
                const element = node as HTMLElement;
                if (element.tagName === "PRE" && element.classList.contains("vditor-wysiwyg__pre") || // 代码块编辑区域
                    element.tagName === "PRE" && element.classList.contains("vditor-wysiwyg__preview") ||  // 代码块渲染区域
                    element.tagName === "CODE" && element.getAttribute("data-marker") === "`" || // 内联代码
                    element.tagName === "CODE" && element.getAttribute("data-type") === "math-inline" || // 内联公式编辑区域
                    element.tagName === "CODE" && element.getAttribute("data-type") === "math-block" || // 公式块编辑区域
                    element.tagName === "SPAN" && element.classList.contains("katex-html") || // 内联公式，公式块的渲染区域
                    element.tagName === "CODE" && element.getAttribute("data-type") === "yaml-front-matter" // front matter编辑区域
                    ) {
                    continue;
                }
                nodeList.unshift(...Array.from(node.childNodes))
            }
        }

        return result;
    }

    /**
     * 合并相邻的文本节点
     */
    private mergeTextNodes(vditor: IVditor) :void {
        const nodeList = Array.from(vditor[vditor.currentMode].element.childNodes);
        while (nodeList.length) {
            let node = nodeList.shift();
            if (node.nodeType === node.TEXT_NODE) {
                let prevNode = node.previousSibling;
                if (prevNode && prevNode.nodeType === 3) {
                    prevNode.textContent += node.textContent;
                    node.parentNode.removeChild(node);
                }
            } else {
                nodeList.unshift(...Array.from(node.childNodes));
            }
        }
    }

    /**
     * 找到光标后第一个匹配searchText的节点，作为第一个跳转的节点
     * @param vditor 
     * @returns 第一个跳转节点的位置
     */
    private getStartPos(vditor: IVditor) :number {
        // 如果没有匹配的节点，则返回-1
        if (this.searchResults.length === 0) {
            return -1;
        }
        // 如果wbr在可匹配文本之间, 则返回该文本所在的位置
        const wbr = vditor[vditor.currentMode].element.querySelector("wbr")
        if (wbr.parentElement.classList.contains('vditor-search__result')) {
            return this.searchResults.indexOf(wbr.parentElement)
        }
        // 定义dfs函数
        const dfs = (currentNode: Node) : number => {
            if (currentNode.nodeType === 1) {
                let element = currentNode as HTMLElement;
                if (element.classList.contains("vditor-search__result")) {
                    return this.searchResults.indexOf(element);
                } 
                for (let i in element.children) {
                    let child = element.children[i];
                    const res = dfs(child);
                    if (res !== -1)  return res;
                }    
            }
            return -1;
        }
        // 定义"遍历某节点后的所有兄弟节点"的函数
        const traverseSiblings = (currentNode: Node) : number => {
            let node = currentNode.nextSibling;
            while (node !== null) {
                const res = dfs(node);
                if (res !== -1) {
                    return res;
                }
                node = node.nextSibling;
            }
            return -1;
        }
        // 从wbr开始向上遍历，直到遍历到vditor的根节点
        // 每遍历到一个节点，就遍历该节点后的所有兄弟节点
        let node = wbr;
        while (node !== null && node !== vditor[vditor.currentMode].element) {
            const res = traverseSiblings(node);
            if (res !== -1) {
                return res;
            }
            node = node.parentElement;
        }
        return 0;
    }

    /**
     * 将node滚动到可视区域，并进行特殊的高亮
     * @param node 
     * @param vditor 
     */
    private focusOnNode(node: Node) {
        const targetElement = node as HTMLElement;
        if (targetElement) {
            targetElement.scrollIntoView({block: "center"});
            targetElement.classList.add("vditor-search__current");
        }
    }


}