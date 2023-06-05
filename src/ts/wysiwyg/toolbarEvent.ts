import {Constants} from "../constants";
import {removeCurrentToolbar} from "../toolbar/setToolbar";
import {listToggle} from "../util/fixBrowserBehavior";
import {hasClosestBlock, hasClosestByMatchTag} from "../util/hasClosest";
import {processCodeRender} from "../util/processCode";
import {getEditorRange, setRangeByWbr, setSelectionFocus} from "../util/selection";
import {afterRenderEvent} from "./afterRenderEvent";
import {genAPopover, highlightToolbarWYSIWYG, genImagePopover} from "./highlightToolbarWYSIWYG";
import {getNextHTML, getPreviousHTML, splitElement} from "./inlineTag";
import {inputEvent} from "../../ts/sv/inputEvent";
import {input} from "../../ts/wysiwyg/input";
import {input as irInput} from "../../ts/ir/input";


const insertValue = (vditor: IVditor, value: string, render = true) => {
    const range = getEditorRange(vditor);
    range.collapse(true);
    const tmpElement = document.createElement("template");
    tmpElement.innerHTML = value;
    range.insertNode(tmpElement.content.cloneNode(true));
    if (vditor.currentMode === "sv") {
        vditor.sv.preventInput = true;
        if (render) {
            inputEvent(vditor);
        }
    } else if (vditor.currentMode === "wysiwyg") {
        vditor.wysiwyg.preventInput = true;
        if (render) {
            input(vditor, getSelection().getRangeAt(0));
        }
    } else if (vditor.currentMode === "ir") {
        vditor.ir.preventInput = true;
        if (render) {
            irInput(vditor, getSelection().getRangeAt(0), true);
        }
    }
}

const deleteValue = (vditor: IVditor) => {
    if (window.getSelection().isCollapsed) {
        return;
    }
    document.execCommand("delete", false);
}

const cancelBES = (range: Range, vditor: IVditor, commandName: string) => {
    let element = range.startContainer.parentElement;
    let jump = false;
    let lastTagName = "";
    let lastEndTagName = "";

    const splitHTML = splitElement(range);
    let lastBeforeHTML = splitHTML.beforeHTML;
    let lastAfterHTML = splitHTML.afterHTML;

    while (element && !jump) {
        let tagName = element.tagName;
        if (tagName === "STRIKE") {
            tagName = "S";
        }
        if (tagName === "I") {
            tagName = "EM";
        }
        if (tagName === "B") {
            tagName = "STRONG";
        }
        if (tagName === "S" || tagName === "STRONG" || tagName === "EM" || tagName === "MARK") {
            let insertHTML = "";
            let previousHTML = "";
            let nextHTML = "";
            if (element.parentElement.getAttribute("data-block") !== "0") {
                previousHTML = getPreviousHTML(element);
                nextHTML = getNextHTML(element);
            }

            if (lastBeforeHTML || previousHTML) {
                insertHTML = `${previousHTML}<${tagName}>${lastBeforeHTML}</${tagName}>`;
                lastBeforeHTML = insertHTML;
            }
            if ((commandName === "bold" && tagName === "STRONG") ||
                (commandName === "italic" && tagName === "EM") ||
                (commandName === "strikeThrough" && tagName === "S") ||
                (commandName === "highlight" && tagName === "MARK")) {
                // 取消
                insertHTML += `${lastTagName}${Constants.ZWSP}<wbr>${lastEndTagName}`;
                jump = true;
            }

            if (lastAfterHTML || nextHTML) {
                lastAfterHTML = `<${tagName}>${lastAfterHTML}</${tagName}>${nextHTML}`;
                insertHTML += lastAfterHTML;
            }

            if (element.parentElement.getAttribute("data-block") !== "0") {
                element = element.parentElement;
                element.innerHTML = insertHTML;
            } else {
                element.outerHTML = insertHTML;
                element = element.parentElement;
            }

            lastTagName = `<${tagName}>` + lastTagName;
            lastEndTagName = `</${tagName}>` + lastEndTagName;
        } else {
            jump = true;
        }
    }

    setRangeByWbr(vditor.wysiwyg.element, range);
};

export const toolbarEvent = (vditor: IVditor, actionBtn: Element, event: Event) => {
    if (vditor.wysiwyg.composingLock // Mac Chrome 中韩文结束会出发此事件，导致重复末尾字符 https://github.com/Vanessa219/vditor/issues/188
        && event instanceof CustomEvent // 点击按钮应忽略输入法 https://github.com/Vanessa219/vditor/issues/473
    ) {
        return;
    }

    let useHighlight = true;
    let useRender = true;
    if (vditor.wysiwyg.element.querySelector("wbr")) {
        vditor.wysiwyg.element.querySelector("wbr").remove();
    }
    const range = getEditorRange(vditor);

    let commandName = actionBtn.getAttribute("data-type");

    // 如果是高亮
    if (commandName === "highlight") {
        // bold, italic, strike, highlight
        useHighlight = false;
        actionBtn.classList.add("vditor-menu--current");

        if (range.toString() === "") {
            const node = document.createElement("mark");
            node.textContent = Constants.ZWSP;
            range.insertNode(node);
            if (node.previousSibling && node.previousSibling.textContent === Constants.ZWSP) {
                // 移除多层嵌套中的 zwsp
                node.previousSibling.textContent = "";
            }
            range.setStart(node.firstChild, 1);
            range.collapse(true);
            setSelectionFocus(range);
        } else {
            document.execCommand('BackColor', false, 'yellow')
            // 将选中的文字用 mark 包裹
            const yellowSpans = document.querySelectorAll('span[style="background-color: yellow;"]');
            yellowSpans.forEach((span) => {
                const mark = document.createElement('mark');
                mark.textContent = span.textContent;
                span.parentNode.replaceChild(mark, span);
            });
            // 将相邻的两个mark合并
            const marks = document.querySelectorAll('mark');
            for (let i = 0; i < marks.length - 1; i++) {
                if (marks[i].nextSibling === marks[i + 1]) {
                    marks[i].textContent += marks[i + 1].textContent;
                    marks[i + 1].remove();
                }
            }
        }
    }
    // 移除
    else if (actionBtn.classList.contains("vditor-menu--current")) {
        if (commandName === "strike") {
            commandName = "strikeThrough";
        }

        if (commandName === "quote") {
            let quoteElement = hasClosestByMatchTag(range.startContainer, "BLOCKQUOTE");
            if (!quoteElement) {
                quoteElement = range.startContainer.childNodes[range.startOffset] as HTMLElement;
            }
            if (quoteElement) {
                useHighlight = false;
                actionBtn.classList.remove("vditor-menu--current");
                range.insertNode(document.createElement("wbr"));
                quoteElement.outerHTML = quoteElement.innerHTML.trim() === "" ?
                    `<p data-block="0">${quoteElement.innerHTML}</p>` : quoteElement.innerHTML;
                setRangeByWbr(vditor.wysiwyg.element, range);
            }
        } else if (commandName === "inline-code") {
            let inlineCodeElement = hasClosestByMatchTag(range.startContainer, "CODE");
            if (!inlineCodeElement) {
                inlineCodeElement = range.startContainer.childNodes[range.startOffset] as HTMLElement;
            }
            if (inlineCodeElement) {
                inlineCodeElement.outerHTML = inlineCodeElement.innerHTML.replace(Constants.ZWSP, "") + "<wbr>";
                setRangeByWbr(vditor.wysiwyg.element, range);
            }
        } else if (commandName === "link") {
            if (!range.collapsed) {
                document.execCommand("unlink", false, "");
            } else {
                range.selectNode(range.startContainer.parentElement);
                document.execCommand("unlink", false, "");
            }
        } else if (commandName === "check" || commandName === "list" || commandName === "ordered-list") {
            listToggle(vditor, range, commandName);
            setRangeByWbr(vditor.wysiwyg.element, range);
            useHighlight = false;
            actionBtn.classList.remove("vditor-menu--current");
        } else {
            // bold, italic, strike
            useHighlight = false;
            actionBtn.classList.remove("vditor-menu--current");
            if (range.toString() === "") {
                cancelBES(range, vditor, commandName);
            } else {
                // todo
                document.execCommand(commandName, false, "");
            }
        }
    } else {
        // 添加
        if (vditor.wysiwyg.element.childNodes.length === 0) {
            // 设置编辑器内最上层dom元素
            vditor.wysiwyg.element.innerHTML = '<p data-block="0"><wbr></p>';
            setRangeByWbr(vditor.wysiwyg.element, range);
        }

        let blockElement = hasClosestBlock(range.startContainer);
        if (commandName === "quote") {
            if (!blockElement) {
                blockElement = range.startContainer.childNodes[range.startOffset] as HTMLElement;
            }

            if (blockElement) {
                useHighlight = false;
                actionBtn.classList.add("vditor-menu--current");
                range.insertNode(document.createElement("wbr"));

                const liElement = hasClosestByMatchTag(range.startContainer, "LI");
                // li 中软换行
                if (liElement && blockElement.contains(liElement)) {
                    liElement.innerHTML = `<blockquote data-block="0">${liElement.innerHTML}</blockquote>`;
                } else {
                    blockElement.outerHTML = `<blockquote data-block="0">${blockElement.outerHTML}</blockquote>`;
                }
                setRangeByWbr(vditor.wysiwyg.element, range);
            }
        } else if (commandName === "check" || commandName === "list" || commandName === "ordered-list") {
            listToggle(vditor, range, commandName, false);
            setRangeByWbr(vditor.wysiwyg.element, range);
            useHighlight = false;
            removeCurrentToolbar(vditor.toolbar.elements, ["check", "list", "ordered-list"]);
            actionBtn.classList.add("vditor-menu--current");
        } else if (commandName === "inline-code") {
            if (range.toString() === "") {
                const node = document.createElement("code");
                node.setAttribute("data-marker", "`")
                node.textContent = Constants.ZWSP;
                range.insertNode(node);
                range.setStart(node.firstChild, 1);
                range.collapse(true);
                setSelectionFocus(range);
            } else if (range.startContainer.nodeType === 3) {
                const node = document.createElement("code");
                node.setAttribute("data-marker", "`")
                range.surroundContents(node);
                range.insertNode(node);
                setSelectionFocus(range);
            }
            actionBtn.classList.add("vditor-menu--current");
        }
        else if (commandName === 'inline-math') {
            if (range.toString() === "") {
                insertValue(vditor, '$$', true);
                if (range.startContainer.nodeValue !== "$$") {
                    range.setStart(range.startContainer.nextSibling, 0)
                }
                range.setStart(range.startContainer, 1)
            }
            else if (range.startContainer.nodeType === 3) {
                const text = range.toString();
                deleteValue(vditor);
                insertValue(vditor, '$' + text + '$', true);
            }
        }
        else if (commandName === "code") {
            const node = document.createElement("div");
            node.className = "vditor-wysiwyg__block";
            node.setAttribute("data-type", "code-block");
            node.setAttribute("data-block", "0");
            node.setAttribute("data-marker", "```");
            if (range.toString() === "") {
                node.innerHTML = "<pre><code><wbr>\n</code></pre>";
            } else {
                node.innerHTML = `<pre><code>${range.toString()}<wbr></code></pre>`;
                range.deleteContents();
            }
            range.insertNode(node);
            if (blockElement) {
                blockElement.outerHTML = vditor.lute.SpinVditorDOM(blockElement.outerHTML);
            }
            setRangeByWbr(vditor.wysiwyg.element, range);
            vditor.wysiwyg.element.querySelectorAll(".vditor-wysiwyg__preview[data-render='2']").forEach(
                (item: HTMLElement) => {
                    processCodeRender(item, vditor);
                });
            actionBtn.classList.add("vditor-menu--disabled");
        } 
        else if (commandName === "math-block") {
            const node = document.createElement("div");
            node.className = "vditor-wysiwyg__block"
            node.setAttribute("data-type", "math-block");
            node.setAttribute("data-block", "0");
            if (range.toString() === "") {
                node.innerHTML = `<pre style="display: none"><code data-type="math-block"><wbr>
                                </code></pre><pre class="vditor-wysiwyg__preview" data-render="2"><div data-type="math-block" class="language-math"></div></pre>`
            } else if (range.startContainer.nodeType === 3) {
                node.innerHTML = `<pre style="display: none"><code data-type="math-block">${range.toString()}<wbr>
                </code></pre><pre class="vditor-wysiwyg__preview" data-render="2"><div data-type="math-block" class="language-math"></div></pre>`
                range.deleteContents();
            }
            range.insertNode(node)
            if (blockElement) {
                blockElement.outerHTML = vditor.lute.SpinVditorDOM(blockElement.outerHTML);
            }
            setRangeByWbr(vditor.wysiwyg.element, range);
        }
        else if (commandName === "link" || commandName === "file-link") {
            if (range.toString() === "") {
                const aElement = document.createElement("a");
                if (commandName === "file-link") {
                    aElement.classList.add("ficus-filelink");
                }
                aElement.innerText = Constants.ZWSP;
                range.insertNode(aElement);
                range.setStart(aElement.firstChild, 1);
                range.collapse(true);
                genAPopover(vditor, aElement, range);
                const textInputElement = vditor.wysiwyg.popover.querySelector("input");
                textInputElement.value = "";
                textInputElement.focus();
                useRender = false;
            } else {
                const node = document.createElement("a");
                if (commandName === "file-link") {
                    node.classList.add("ficus-filelink");
                }
                node.setAttribute("href", "");
                node.innerHTML = range.toString();
                range.surroundContents(node);
                range.insertNode(node);
                setSelectionFocus(range);
                genAPopover(vditor, node, range);
                const textInputElements = vditor.wysiwyg.popover.querySelectorAll("input");
                textInputElements[0].value = node.innerText;
                textInputElements[1].focus();
            }
            useHighlight = false;
            actionBtn.classList.add("vditor-menu--current");
        } else if (commandName === "img-link") {
            if (range.toString() === "") {
                const imgElement = document.createElement("img");
                imgElement.innerText = Constants.ZWSP;
                range.insertNode(imgElement);
                range.setStart(imgElement.firstChild, 1);
                range.collapse(true);
                genImagePopover(null, vditor, imgElement);
                const textInputElement = vditor.wysiwyg.popover.querySelector("input");
                textInputElement.value = "";
                textInputElement.focus();
                useRender = false;
            } else {
                const node = document.createElement("img");
                node.setAttribute("href", "");
                node.innerHTML = range.toString();
                range.surroundContents(node);
                range.insertNode(node);
                setSelectionFocus(range);
                genImagePopover(null, vditor, node);
                const textInputElements = vditor.wysiwyg.popover.querySelectorAll("input");
                textInputElements[0].value = node.innerText;
                textInputElements[1].focus();
            }
            useHighlight = false;
            actionBtn.classList.add("vditor-menu--current");

        } else if (commandName === "table") {
            let tableHTML = `<table data-block="0"><thead><tr><th>col1<wbr></th><th>col2</th><th>col3</th></tr></thead><tbody><tr><td> </td><td> </td><td> </td></tr><tr><td> </td><td> </td><td> </td></tr></tbody></table>`;
            if (range.toString().trim() === "") {
                if (blockElement && blockElement.innerHTML.trim().replace(Constants.ZWSP, "") === "") {
                    blockElement.outerHTML = tableHTML;
                } else {
                    document.execCommand("insertHTML", false, tableHTML);
                }
                range.selectNode(vditor.wysiwyg.element.querySelector("wbr").previousSibling);
                vditor.wysiwyg.element.querySelector("wbr").remove();
                setSelectionFocus(range);
            } else {
                tableHTML = `<table data-block="0"><thead><tr>`;
                const tableText = range.toString().split("\n");
                const delimiter = tableText[0].split(",").length > tableText[0].split("\t").length ? "," : "\t";

                tableText.forEach((rows, index) => {
                    if (index === 0) {
                        rows.split(delimiter).forEach((header, subIndex) => {
                            if (subIndex === 0) {
                                tableHTML += `<th>${header}<wbr></th>`;
                            } else {
                                tableHTML += `<th>${header}</th>`;
                            }
                        });
                        tableHTML += "</tr></thead>";
                    } else {
                        if (index === 1) {
                            tableHTML += "<tbody><tr>";
                        } else {
                            tableHTML += "<tr>";
                        }
                        rows.split(delimiter).forEach((cell) => {
                            tableHTML += `<td>${cell}</td>`;
                        });
                        tableHTML += `</tr>`;
                    }
                });
                tableHTML += "</tbody></table>";
                document.execCommand("insertHTML", false, tableHTML);
                setRangeByWbr(vditor.wysiwyg.element, range);
            }
            useHighlight = false;
            actionBtn.classList.add("vditor-menu--disabled");
        } else if (commandName === "line") {
            if (blockElement) {
                const hrHTML = '<hr data-block="0"><p data-block="0"><wbr>\n</p>';
                if (blockElement.innerHTML.trim() === "") {
                    blockElement.outerHTML = hrHTML;
                } else {
                    blockElement.insertAdjacentHTML("afterend", hrHTML);
                }
                setRangeByWbr(vditor.wysiwyg.element, range);
            }
        } else {
            // bold, italic, strike
            useHighlight = false;
            actionBtn.classList.add("vditor-menu--current");

            if (commandName === "strike") {
                commandName = "strikeThrough";
            }
            if (range.toString() === "" && (commandName === "bold" || commandName === "italic" || commandName === "strikeThrough")) {
                let tagName = "strong";
                if (commandName === "italic") {
                    tagName = "em";
                } else if (commandName === "strikeThrough") {
                    tagName = "s";
                }
                const node = document.createElement(tagName);
                node.textContent = Constants.ZWSP;

                range.insertNode(node);

                if (node.previousSibling && node.previousSibling.textContent === Constants.ZWSP) {
                    // 移除多层嵌套中的 zwsp
                    node.previousSibling.textContent = "";
                }

                range.setStart(node.firstChild, 1);
                range.collapse(true);
                setSelectionFocus(range);
            } else {
                document.execCommand(commandName, false, "");
            }
        }
    }

    if (useHighlight) {
        highlightToolbarWYSIWYG(vditor);
    }

    if (useRender) {
        afterRenderEvent(vditor);
    }
};
