import {Constants} from "../constants";
import {processAfterRender} from "../ir/process";
import { getHTML } from "../markdown/getHTML";
import {code160to32} from "../util/code160to32";
import {isCtrl, updateHotkeyTip} from "../util/compatibility";
import {execAfterRender} from "../util/fixBrowserBehavior";
import {hasClosestByAttribute, hasClosestByClassName, hasClosestByMatchTag} from "../util/hasClosest";
import {processCodeRender} from "../util/processCode";
import {getCursorPosition, insertHTML, setRangeByWbr, setSelectionFocus} from "../util/selection";
import { showCode } from "../wysiwyg/showCode";
import * as katexFuncs from './katex-funcs';

export class Hint {
    public timeId: number;
    public element: HTMLDivElement;
    public recentLanguage: string;
    private splitChar = "";
    private lastIndex = -1;
    private c0 = Array.from(new Set(
        [
            ...katexFuncs.delimiters0, ...katexFuncs.delimeterSizing0,
            ...katexFuncs.greekLetters0, ...katexFuncs.otherLetters0,
            ...katexFuncs.spacing0, ...katexFuncs.verticalLayout0,
            ...katexFuncs.logicAndSetTheory0, ...katexFuncs.macros0, ...katexFuncs.bigOperators0,
            ...katexFuncs.binaryOperators0, ...katexFuncs.binomialCoefficients0,
            ...katexFuncs.fractions0, ...katexFuncs.mathOperators0,
            ...katexFuncs.relations0, ...katexFuncs.negatedRelations0,
            ...katexFuncs.arrows0, ...katexFuncs.font0, ...katexFuncs.size0,
            ...katexFuncs.style0, ...katexFuncs.symbolsAndPunctuation0,
            ...katexFuncs.debugging0
        ]
    ))
    private c1 = Array.from(new Set(
        [
            ...katexFuncs.accents1, ...katexFuncs.annotation1,
            ...katexFuncs.verticalLayout1, ...katexFuncs.overlap1, ...katexFuncs.spacing1,
            ...katexFuncs.logicAndSetTheory1, ...katexFuncs.mathOperators1, ...katexFuncs.sqrt1,
            ...katexFuncs.extensibleArrows1, ...katexFuncs.font1,
            ...katexFuncs.braketNotation1, ...katexFuncs.classAssignment1
        ]
    ))
    private c2 = Array.from(new Set(
        [
            ...katexFuncs.verticalLayout2, ...katexFuncs.binomialCoefficients2,
            ...katexFuncs.fractions2, ...katexFuncs.color2
        ]
    ))
    private latexList : String[] = []
    private environments : String[] = ['matrix', 'align', 'align*']

    constructor(hintExtends: IHintExtend[]) {
        this.timeId = -1;
        this.element = document.createElement("div");
        this.element.className = "vditor-hint";
        this.recentLanguage = "";
        hintExtends.push({key: ":"});

        this.c0.forEach(
            (item) => {this.latexList.push(item) + '<wbr>'}
        )
        this.c1.forEach(
            (item) => {this.latexList.push(item + '{<wbr>}')}
        )
        this.c2.forEach(
            (item) => {this.latexList.push(item + '{<wbr>}{}')}
        )
        this.latexList.push('begin{}<wbr>')

        hintExtends.push(
            {
                key: '\\',
                hint: (key) =>
                {
                    let ret :IHintData[]= []
                    let ret0 :IHintData[]= []
                    if (key !== "")
                    {
                        this.latexList.forEach(
                            (kw) =>
                            {
                                // key 是 kw 的前缀
                                if (key.toLowerCase() === kw.substring(0, key.length).toLowerCase()) {
                                    if (key === kw.substring(0, key.length))  // 完全匹配的
                                        ret.push({value: '\\' + kw, html: '\\' + kw})
                                    
                                    else // 忽略大小写匹配的
                                        ret0.push({value: '\\' + kw, html: '\\' + kw})
                                }
                            }
                        )
                        ret = [...ret, ...ret0]
                    }
                    else {
                        this.latexList.forEach(
                            (kw) =>
                            {
                                ret.push({value: '\\' + kw, html: '\\' + kw})
                            }
                        )
                    }
                    return ret
                }
            }
        )

        hintExtends.push({
            key: 'begin{',
            hint: (key)=>
            {
                let ret :IHintData[]= []
                if (key != "")
                {
                    this.environments.forEach(
                        (kw) =>
                        {
                            // key 是 kw 的前缀
                            if (key.toLowerCase() === kw.substring(0, key.length).toLowerCase()) {
                                    ret.push({value: 'begin{' + kw + '}\n\t<wbr> \n \\end{' + kw , html: '' + kw})
                            }
                        }
                    )
                    ret.push({value: 'begin{' + key + '}\n\t<wbr> \n \\end{' + key , html: key + '\t ?'})
                }
                else {
                    this.environments.forEach(
                        (kw) =>
                        {
                            ret.push({value: 'begin{' + kw + '}\n\t<wbr> \n \\end{' + kw , html: '' + kw})
                        }
                    )
                }
                return ret
            }
        })
    }

    public render(vditor: IVditor) {
        if (!window.getSelection().focusNode) {
            return;
        }
        let currentLineValue: string;
        let range = getSelection().getRangeAt(0);

        // 链接提示
        const link = hasClosestByClassName(range.startContainer, "vditor-sv__marker--link");
        if (link && range.toString().length == 0) {
            this.genLinkHintHTML(link, vditor);
            return;
        }

        // 截取开头和光标位置之间的字符串
        currentLineValue = range.startContainer.textContent.substring(0, range.startOffset) || "";
        // 当前行
        const key = this.getKey(currentLineValue, vditor.options.hint.extend);

        if (typeof key === "undefined") {
            this.element.style.display = "none";
            clearTimeout(this.timeId);
        } else {
            if (this.splitChar === ":") {
                const emojiHint = key === "" ? vditor.options.hint.emoji : vditor.lute.GetEmojis();
                const matchEmojiData: IHintData[] = [];
                Object.keys(emojiHint).forEach((keyName) => {
                    if (keyName.indexOf(key.toLowerCase()) === 0) {
                        // 如果是图片链接
                        if (emojiHint[keyName].indexOf(".") > -1) {
                            matchEmojiData.push({
                                html: `<img src="${emojiHint[keyName]}" title=":${keyName}:"/> :${keyName}:`,
                                value: `:${keyName}:`,
                            });
                        } else {
                            // html表示列表展示的内容，value表示插入的内容
                            matchEmojiData.push({
                                html: `<span class="vditor-hint__emoji">${emojiHint[keyName]}</span>${keyName}`,
                                value: emojiHint[keyName],
                            });
                        }
                    }
                });
                this.genHTML(matchEmojiData, key, vditor);
            } else {
                vditor.options.hint.extend.forEach((item) => {
                    if (item.key === this.splitChar) {
                        if ((item.key === "\\" || item.key === "begin{") && !this.isMath(vditor)) {
                            return;
                        }
                        clearTimeout(this.timeId);
                        this.timeId = window.setTimeout(async () => {
                            this.genHTML(await item.hint(key), key, vditor);
                        }, vditor.options.hint.delay);
                    }
                });
            }
        }
    }

    public genLinkHintHTML = async (link: HTMLElement, vditor: IVditor) => {
        // 合并link中所有的文本节点
        insertHTML('<wbr>', vditor)
        const textNodes = Array.from(link.childNodes);
        for (let i = 1; i < textNodes.length; i++) {
            const item = textNodes[i];
            if (item.nodeType === 3 && item.previousSibling.nodeType === 3) {
                item.previousSibling.textContent += item.textContent;
                item.remove();
            }
        }
        const range = new Range();
        range.setStart(link.childNodes[0], 0);
        setRangeByWbr(vditor.sv.element, range);

        // 截取开头和光标位置之间的字符串
        const currentLineValue = range.startContainer.textContent.substring(0, range.startOffset) || "";

        // 构造提示列表
        const matchingData: IHintData[] = [];
        const hints = await vditor.options.hint.genLinkHint(currentLineValue);
        for (let i in hints) {
            matchingData.push({
                html: hints[i].trim(),
                value: hints[i].trim(),
            });
        }
        this.lastIndex = 0;
        vditor.hint.genHTML(matchingData, currentLineValue, vditor);
    }

    public genHTML(data: IHintData[], key: string, vditor: IVditor) {
        if (data.length === 0 || vditor.options.editable === false) {
            this.element.style.display = "none";
            return;
        }

        const editorElement = vditor[vditor.currentMode].element;
        const textareaPosition = getCursorPosition(editorElement);
        const x = textareaPosition.left +
            (vditor.options.outline.position === "left" ? vditor.outline.element.offsetWidth : 0);
        const y = textareaPosition.top;
        let hintsHTML = "";

        // 遍历匹配的数据，构造下拉框的html
        data.forEach((hintData, i) => {
            if (i > 7) {
                return;
            }
            // 加粗匹配的字符
            let html = hintData.html;
            if (key !== "") {
                const lastIndex = html.lastIndexOf(">") + 1;
                let replaceHtml = html.substr(lastIndex);
                const replaceIndex = replaceHtml.toLowerCase().indexOf(key.toLowerCase());
                if (replaceIndex > -1) {
                    replaceHtml = replaceHtml.substring(0, replaceIndex) + "<b>" +
                        replaceHtml.substring(replaceIndex, replaceIndex + key.length) + "</b>" +
                        replaceHtml.substring(replaceIndex + key.length);
                    html = html.substr(0, lastIndex) + replaceHtml;
                }
            }
            // 构造对应的按钮，加入到hintsHTML中
            // data-value表示插入的内容
            // html表示列表按钮展示的内容
            hintsHTML += `<button data-value="${encodeURIComponent(hintData.value)}"
${i === 0 ? "class='vditor-hint--current'" : ""}> ${html}</button>`;
        });

        // 将生成的下拉框html插入到this.element中，调整下拉框的位置，同时进行显示
        this.element.innerHTML = hintsHTML;
        const lineHeight = parseInt(document.defaultView.getComputedStyle(editorElement, null)
            .getPropertyValue("line-height"), 10);
        this.element.style.top = `${y + (lineHeight || 22)}px`;
        this.element.style.left = `${x}px`;
        this.element.style.display = "block";
        this.element.style.right = "auto";

        // 为下拉框的每个button绑定click事件，事件发生时通过fillEmoji方法进行内容的插入
        this.element.querySelectorAll("button").forEach((element) => {
            element.addEventListener("click", (event) => {
                this.fillEmoji(element, vditor);
                event.preventDefault();
            });
        });
        // hint 展现在上部
        if (this.element.getBoundingClientRect().bottom > window.innerHeight) {
            this.element.style.top = `${y - this.element.offsetHeight}px`;
        }
        if (this.element.getBoundingClientRect().right > window.innerWidth) {
            this.element.style.left = "auto";
            this.element.style.right = "0";
        }
    }

    public fillEmoji = (element: HTMLElement, vditor: IVditor) => {
        this.element.style.display = "none";

        const value = decodeURIComponent(element.getAttribute("data-value"));
        const range: Range = window.getSelection().getRangeAt(0);

        // 代码提示
        if (vditor.currentMode === "ir") {
            const preBeforeElement = hasClosestByAttribute(range.startContainer, "data-type", "code-block-info");
            if (preBeforeElement) {
                preBeforeElement.textContent = Constants.ZWSP + value.trimRight();
                range.selectNodeContents(preBeforeElement);
                range.collapse(false);
                processAfterRender(vditor);
                preBeforeElement.parentElement.querySelectorAll("code").forEach((item) => {
                    item.className = "language-" + value.trimRight();
                });
                processCodeRender(preBeforeElement.parentElement.querySelector(".vditor-ir__preview"), vditor);
                this.recentLanguage = value.trimRight();
                return;
            }
        }
        if (vditor.currentMode === "wysiwyg" && range.startContainer.nodeType !== 3 ) {
            const startContainer = range.startContainer as HTMLElement;
            let inputElement: HTMLInputElement;
            if (startContainer.classList.contains("vditor-input")) {
                inputElement = startContainer as HTMLInputElement;
            } else {
                inputElement = startContainer.firstElementChild as HTMLInputElement;
            }
            if (inputElement && inputElement.classList.contains("vditor-input")) {
                inputElement.value = value.trimRight();
                inputElement.dispatchEvent(new Event('input'));
                range.selectNodeContents(inputElement);
                range.collapse(false);
                // {detail: 1}用于标识这个自定义事件是在编程语言选择后触发的
                // 用于在鼠标选择语言后，自动聚焦到代码输入框
                if (inputElement.getAttribute("placeholder")  ===  (window.VditorI18n.language + "<" + updateHotkeyTip("⌥Enter") + ">")) {
                    inputElement.dispatchEvent(new CustomEvent("input", {detail: 1}));
                } else {
                    inputElement.focus();
                }
                this.recentLanguage = value.trimRight();
                return;
            }

        }

        // 找到光标位置后面最近的终止符号——
        // 空白符, '{', '}', '[', ']', '(', ')', '\',
        // '$', ';', ',', ':', '.', '%', '?', '!', '|'
        let str = range.startContainer.textContent.substring(range.startOffset);
        let endPos = str.search(/\s|{|}|\[|\]|\(|\)|\\|\$|\;|\,|\:|\.|\%|\?|\!|\|/)
        if (endPos === -1) {
            endPos = range.startContainer.textContent.length
        } else {
            endPos = range.startOffset + endPos
        }

        range.setStart(range.startContainer, this.lastIndex);
        range.setEnd(range.startContainer, endPos)
        range.deleteContents();

        if (vditor.options.hint.parse) {
            if (vditor.currentMode === "sv") {
                insertHTML(vditor.lute.SpinVditorSVDOM(value), vditor);
            } else if (vditor.currentMode === "wysiwyg") {
                insertHTML(vditor.lute.SpinVditorDOM(value), vditor);
            } else {
                insertHTML(vditor.lute.SpinVditorIRDOM(value), vditor);
            }
        } else {
            insertHTML(value, vditor);
        }
        if (this.splitChar === ":" && value.indexOf(":") > -1 && vditor.currentMode !== "sv") {
            range.insertNode(document.createTextNode(" "));
        }
        range.collapse(false);
        setSelectionFocus(range);

        if (vditor.currentMode === "wysiwyg") {
            let preElement = hasClosestByClassName(range.startContainer, "vditor-wysiwyg__block");

            if (preElement && preElement.lastElementChild.classList.contains("vditor-wysiwyg__preview")) {
                // 将编辑区的内容同步到预览区
                preElement.lastElementChild.innerHTML = preElement.firstElementChild.innerHTML;
                // 调用SpinVditorDOM方法，进行初步渲染
                preElement.insertAdjacentHTML("afterend", vditor.lute.SpinVditorDOM(preElement.outerHTML));
                preElement = preElement.nextElementSibling as HTMLElement;
                preElement.previousElementSibling.remove();
                // 对于行内数学公式，SpinVditorDOM会自动在外面包裹一层p标签，这里需要去掉
                if (preElement.tagName === "P") {
                    preElement.insertAdjacentHTML("afterend", preElement.innerHTML);
                    preElement = preElement.nextElementSibling as HTMLElement;
                    preElement.previousElementSibling.remove();
                }

                showCode(preElement.lastElementChild as HTMLElement, vditor, false);
                processCodeRender(preElement.lastElementChild as HTMLElement, vditor);
                // 由于hint已经带了一个wbr标签，所以这里只需要将光标移动到wbr标签所在位置即可
                setRangeByWbr(preElement, range)
            }
        } else if (vditor.currentMode === "ir") {
            const preElement = hasClosestByClassName(range.startContainer, "vditor-ir__marker--pre");
            if (preElement && preElement.nextElementSibling.classList.contains("vditor-ir__preview")) {
                preElement.nextElementSibling.innerHTML = preElement.innerHTML;
                processCodeRender(preElement.nextElementSibling as HTMLElement, vditor);
            }
        }
        execAfterRender(vditor);
    }

    public select(event: KeyboardEvent, vditor: IVditor) {

        if (this.element.querySelectorAll("button").length === 0 ||
            this.element.style.display === "none") {
            return false;
        }

        const currentHintElement: HTMLElement = this.element.querySelector(".vditor-hint--current");

        if (event.key === "ArrowDown") {
            event.preventDefault();
            event.stopPropagation();
            currentHintElement.removeAttribute("class");
            if (!currentHintElement.nextElementSibling) {
                this.element.children[0].className = "vditor-hint--current";
            } else {
                currentHintElement.nextElementSibling.className = "vditor-hint--current";
            }
            return true;
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();
            currentHintElement.removeAttribute("class");
            if (!currentHintElement.previousElementSibling) {
                const length = this.element.children.length;
                this.element.children[length - 1].className = "vditor-hint--current";
            } else {
                currentHintElement.previousElementSibling.className = "vditor-hint--current";
            }
            return true;
        } else if (!isCtrl(event) && !event.shiftKey && !event.altKey &&
                    (event.key === "Enter" || event.key === "Tab") && !event.isComposing) {
            event.preventDefault();
            event.stopPropagation();
            this.fillEmoji(currentHintElement, vditor);
            return true;
        }
        return false;
    }

    private getKey(currentLineValue: string, extend: IHintExtend[]) {
        this.lastIndex = -1;
        this.splitChar = "";

        // 找到最后一个出现的 key
        extend.forEach((item) => {
            const currentLastIndex = currentLineValue.lastIndexOf(item.key);
            if (this.lastIndex < currentLastIndex) {
                this.splitChar = item.key;
                this.lastIndex = currentLastIndex;
            }
        });

        let key;
        if (this.lastIndex === -1) {
            return key;
        }
        const lineArray = currentLineValue.split(this.splitChar);
        const lastItem = lineArray[lineArray.length - 1];
        const maxLength = 32;
        if (lineArray.length > 1 && lastItem.trim() === lastItem) {
            if (lineArray.length === 2 && lineArray[0] === "" && lineArray[1].length < maxLength) {
                key = lineArray[1];
            } else {
                const preChar = lineArray[lineArray.length - 2].slice(-1);
                if (lastItem.length < maxLength) {
                    key = lastItem;
                }
            }
        }
        return key;
    }

    private isMath(vditor: IVditor) {
        // 所见即所得模式
        const range = getSelection().getRangeAt(0);
        const startContainer = range.startContainer;
        if (vditor.currentMode === "wysiwyg") {
            const codeElement = hasClosestByMatchTag(startContainer, "CODE") as HTMLElement;
            // 内联数学公式和数学公式块
            if (codeElement && (codeElement.getAttribute("data-type") === "math-inline" || codeElement.getAttribute("data-type") === "math-block")) {
                return true;
            }
        }

        // 源码模式
        else if (vditor.currentMode === "sv") {
            const divElement = hasClosestByMatchTag(startContainer, "DIV") as HTMLElement;
            // 内联数学公式
            if (startContainer.nodeType === 3 && startContainer.previousSibling?.nodeType === 1 &&
                    (startContainer.previousSibling as HTMLElement).matches("span.vditor-sv__marker") &&
                    (startContainer.previousSibling as HTMLElement).innerHTML === "$") {
                return true;
            }
            // 数学公式块
            if (divElement && divElement.firstElementChild.matches("span.vditor-sv__marker") &&
                    divElement.firstElementChild.innerHTML === "$$") {
                return true;
            }
        }
        return false;
    }

}
