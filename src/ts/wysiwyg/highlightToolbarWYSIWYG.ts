import {Constants} from "../constants";
import {disableToolbar, hidePanel} from "../toolbar/setToolbar";
import {enableToolbar} from "../toolbar/setToolbar";
import {removeCurrentToolbar} from "../toolbar/setToolbar";
import {setCurrentToolbar} from "../toolbar/setToolbar";
import {isCtrl, updateHotkeyTip} from "../util/compatibility";
import {scrollCenter} from "../util/editorCommonEvent";
import {
    deleteColumn,
    deleteRow,
    insertColumn,
    insertRow,
    insertRowAbove,
    listIndent,
    listOutdent,
    setTableAlign,
} from "../util/fixBrowserBehavior";
import {
    hasClosestByAttribute,
    hasClosestByClassName,
    hasClosestByMatchTag,
} from "../util/hasClosest";
import {
    hasClosestByHeadings,
    hasClosestByTag,
} from "../util/hasClosestByHeadings";
import {processCodeRender} from "../util/processCode";
import {
    getCursorPosition,
    getEditorRange,
    selectIsEditor,
    setRangeByWbr,
    setSelectionFocus,
} from "../util/selection";
import {afterRenderEvent} from "./afterRenderEvent";
import {removeBlockElement} from "./processKeydown";
import {renderToc} from "../util/toc";
import { removeHeading, setHeading } from "./setHeading";

export const highlightToolbarWYSIWYG = (vditor: IVditor) => {
    clearTimeout(vditor.wysiwyg.hlToolbarTimeoutId);
    vditor.wysiwyg.hlToolbarTimeoutId = window.setTimeout(() => {
        if (
            vditor.wysiwyg.element.getAttribute("contenteditable") === "false"
        ) {
            return;
        }
        if (!selectIsEditor(vditor.wysiwyg.element)) {
            return;
        }

        if (vditor.options.editable === false) {
            return;
        }

        removeCurrentToolbar(vditor.toolbar.elements, Constants.EDIT_TOOLBARS);
        enableToolbar(vditor.toolbar.elements, Constants.EDIT_TOOLBARS);

        const range = getSelection().getRangeAt(0);
        let typeElement = range.startContainer as HTMLElement;
        if (range.startContainer.nodeType === 3) {
            typeElement = range.startContainer.parentElement;
        } else {
            typeElement = typeElement.childNodes[
                range.startOffset >= typeElement.childNodes.length
                    ? typeElement.childNodes.length - 1
                    : range.startOffset
                ] as HTMLElement;
        }

        const footnotesElement = hasClosestByAttribute(typeElement, "data-type", "footnotes-block");
        if (footnotesElement) {
            vditor.wysiwyg.popover.innerHTML = "";
            genClose(footnotesElement, vditor);
            setPopoverPosition(vditor, footnotesElement);
            return;
        }

        // 工具栏高亮和禁用
        const liElement = hasClosestByMatchTag(typeElement, "LI");
        if (liElement) {
            if (liElement.classList.contains("vditor-task")) {
                setCurrentToolbar(vditor.toolbar.elements, ["check"]);
            } else if (liElement.parentElement.tagName === "OL") {
                setCurrentToolbar(vditor.toolbar.elements, ["ordered-list"]);
            } else if (liElement.parentElement.tagName === "UL") {
                setCurrentToolbar(vditor.toolbar.elements, ["list"]);
            }
            enableToolbar(vditor.toolbar.elements, ["outdent", "indent"]);
        } else {
            disableToolbar(vditor.toolbar.elements, ["outdent", "indent"]);
        }

        if (hasClosestByMatchTag(typeElement, "BLOCKQUOTE")) {
            setCurrentToolbar(vditor.toolbar.elements, ["quote"]);
        }

        if (
            hasClosestByMatchTag(typeElement, "B") ||
            hasClosestByMatchTag(typeElement, "STRONG")
        ) {
            setCurrentToolbar(vditor.toolbar.elements, ["bold"]);
        }

        if (
            hasClosestByMatchTag(typeElement, "I") ||
            hasClosestByMatchTag(typeElement, "EM")
        ) {
            setCurrentToolbar(vditor.toolbar.elements, ["italic"]);
        }

        if (
            hasClosestByMatchTag(typeElement, "STRIKE") ||
            hasClosestByMatchTag(typeElement, "S")
        ) {
            setCurrentToolbar(vditor.toolbar.elements, ["strike"]);
        }

        if (
            hasClosestByMatchTag(typeElement, "MARK")
        ) {
            setCurrentToolbar(vditor.toolbar.elements, ["highlight"]);
        }

        // comments
        vditor.wysiwyg.element
            .querySelectorAll(".vditor-comment--focus")
            .forEach((item) => {
                item.classList.remove("vditor-comment--focus");
            });
        const commentElement = hasClosestByClassName(typeElement, "vditor-comment");
        if (commentElement) {
            let ids = commentElement.getAttribute("data-cmtids").split(" ");
            if (ids.length > 1 && commentElement.nextSibling.isSameNode(commentElement.nextElementSibling)) {
                const nextIds = commentElement.nextElementSibling
                    .getAttribute("data-cmtids")
                    .split(" ");
                ids.find((id) => {
                    if (nextIds.includes(id)) {
                        ids = [id];
                        return true;
                    }
                });
            }
            vditor.wysiwyg.element
                .querySelectorAll(".vditor-comment")
                .forEach((item) => {
                    if (item.getAttribute("data-cmtids").indexOf(ids[0]) > -1) {
                        item.classList.add("vditor-comment--focus");
                    }
                });
        }

        const aElement = hasClosestByMatchTag(typeElement, "A");
        if (aElement) {
            setCurrentToolbar(vditor.toolbar.elements, ["link"]);
        }
        const tableElement = hasClosestByMatchTag(typeElement, "TABLE") as HTMLTableElement;
        const headingElement = hasClosestByHeadings(typeElement) as HTMLElement;
        const codeElement = hasClosestByMatchTag(typeElement, "CODE");
        if (codeElement) {
            if (hasClosestByMatchTag(typeElement, "PRE")) {
                disableToolbar(vditor.toolbar.elements, [
                    "headings",
                    "bold",
                    "italic",
                    "strike",
                    "line",
                    "quote",
                    "list",
                    "ordered-list",
                    "check",
                    "code",
                    "inline-code",
                    "upload",
                    "link",
                    "table",
                    "record",
                    "highlight"
                ]);
                setCurrentToolbar(vditor.toolbar.elements, ["code"]);
            } else {
                disableToolbar(vditor.toolbar.elements, [
                    "headings",
                    "bold",
                    "italic",
                    "strike",
                    "line",
                    "quote",
                    "list",
                    "ordered-list",
                    "check",
                    "code",
                    "upload",
                    "link",
                    "table",
                    "record",
                    "highlight"
                ]);
                setCurrentToolbar(vditor.toolbar.elements, ["inline-code"]);
            }
        } else if (headingElement) {
            disableToolbar(vditor.toolbar.elements, ["bold"]);
            setCurrentToolbar(vditor.toolbar.elements, ["headings"]);
        } else if (tableElement) {
            disableToolbar(vditor.toolbar.elements, ["table"]);
        }

        // toc popover
        const tocElement = hasClosestByClassName(typeElement, "vditor-toc") as HTMLElement;
        if (tocElement) {
            vditor.wysiwyg.popover.innerHTML = "";
            genClose(tocElement, vditor);
            setPopoverPosition(vditor, tocElement);
            return;
        }

        // quote popover
        const blockquoteElement = hasClosestByTag(typeElement, "BLOCKQUOTE") as HTMLTableElement;
        // if (blockquoteElement) {
        //     vditor.wysiwyg.popover.innerHTML = "";
        //     genUp(range, blockquoteElement, vditor);
        //     genDown(range, blockquoteElement, vditor);
        //     genClose(blockquoteElement, vditor);
        //     setPopoverPosition(vditor, blockquoteElement);
        // }

        // list item popover
        if (liElement && range.toString() === "") {
            vditor.wysiwyg.popover.innerHTML = "";

            // 列表反向缩进
            const outdentElement = document.createElement("button");
            outdentElement.setAttribute("type", "button");
            outdentElement.setAttribute("data-type", "outdent");
            outdentElement.setAttribute("aria-label", "列表反向缩进");
            outdentElement.innerHTML = '<svg><use xlink:href="#vditor-icon-outdent"></use></svg>';
            outdentElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            outdentElement.onclick = () => {
                listOutdent(vditor, liElement, range, liElement.parentElement);
            }

            // 列表正向缩进
            const indentElement = document.createElement("button");
            indentElement.setAttribute("type", "button");
            indentElement.setAttribute("data-type", "indent");
            indentElement.setAttribute("aria-label", "列表正向缩进");
            indentElement.innerHTML = '<svg><use xlink:href="#vditor-icon-indent"></use></svg>';
            indentElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            indentElement.onclick = () => {
                listIndent(vditor, liElement, range);
            }


            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", outdentElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", indentElement);
            setPopoverPosition(vditor, liElement);
            return;
        }

        // table popover
        if (tableElement) {
            const lang: keyof II18n | "" = vditor.options.lang;
            const options: IOptions = vditor.options;
            vditor.wysiwyg.popover.innerHTML = "";
            const updateTable = () => {
                const oldRow = tableElement.rows.length;
                const oldColumn = tableElement.rows[0].cells.length;
                const row = parseInt(input.value, 10) || oldRow;
                const column = parseInt(input2.value, 10) || oldColumn;

                if (row === oldRow && oldColumn === column) {
                    return;
                }

                if (oldColumn !== column) {
                    const columnDiff = column - oldColumn;
                    for (let i = 0; i < tableElement.rows.length; i++) {
                        if (columnDiff > 0) {
                            for (let j = 0; j < columnDiff; j++) {
                                if (i === 0) {
                                    tableElement.rows[i].lastElementChild.insertAdjacentHTML("afterend", "<th> </th>");
                                } else {
                                    tableElement.rows[i].lastElementChild.insertAdjacentHTML("afterend", "<td> </td>");
                                }
                            }
                        } else {
                            for (let k = oldColumn - 1; k >= column; k--) {
                                tableElement.rows[i].cells[k].remove();
                            }
                        }
                    }
                }

                if (oldRow !== row) {
                    const rowDiff = row - oldRow;
                    if (rowDiff > 0) {
                        let rowHTML = "<tr>";
                        for (let m = 0; m < column; m++) {
                            rowHTML += "<td> </td>";
                        }
                        for (let l = 0; l < rowDiff; l++) {
                            if (tableElement.querySelector("tbody")) {
                                tableElement
                                    .querySelector("tbody")
                                    .insertAdjacentHTML("beforeend", rowHTML);
                            } else {
                                tableElement
                                    .querySelector("thead")
                                    .insertAdjacentHTML("afterend", rowHTML + "</tr>");
                            }
                        }
                    } else {
                        for (let m = oldRow - 1; m >= row; m--) {
                            tableElement.rows[m].remove();
                            if (tableElement.rows.length === 1) {
                                tableElement.querySelector("tbody").remove();
                            }
                        }
                    }
                }
            };

            const setAlign = (type: string) => {
                setTableAlign(tableElement, type);
                if (type === "right") {
                    left.classList.remove("vditor-icon--current");
                    center.classList.remove("vditor-icon--current");
                    right.classList.add("vditor-icon--current");
                } else if (type === "center") {
                    left.classList.remove("vditor-icon--current");
                    right.classList.remove("vditor-icon--current");
                    center.classList.add("vditor-icon--current");
                } else {
                    center.classList.remove("vditor-icon--current");
                    right.classList.remove("vditor-icon--current");
                    left.classList.add("vditor-icon--current");
                }
                setSelectionFocus(range);
                afterRenderEvent(vditor);
            };

            const td = hasClosestByMatchTag(typeElement, "TD");
            const th = hasClosestByMatchTag(typeElement, "TH");
            let alignType = "left";
            if (td) {
                alignType = td.getAttribute("align") || "left";
            } else if (th) {
                alignType = th.getAttribute("align") || "center";
            }

            const left = document.createElement("button");
            left.setAttribute("type", "button");
            left.setAttribute("aria-label", window.VditorI18n.alignLeft + "<" + updateHotkeyTip("⇧⌘L") + ">");
            left.setAttribute("data-type", "left");
            left.innerHTML =
                '<svg><use xlink:href="#vditor-icon-align-left"></use></svg>';
            left.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
                (alignType === "left" ? " vditor-icon--current" : "");
            left.onclick = () => {
                setAlign("left");
            };

            const center = document.createElement("button");
            center.setAttribute("type", "button");
            center.setAttribute("aria-label", window.VditorI18n.alignCenter + "<" + updateHotkeyTip("⇧⌘C") + ">");
            center.setAttribute("data-type", "center");
            center.innerHTML =
                '<svg><use xlink:href="#vditor-icon-align-center"></use></svg>';
            center.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
                (alignType === "center" ? " vditor-icon--current" : "");
            center.onclick = () => {
                setAlign("center");
            };

            const right = document.createElement("button");
            right.setAttribute("type", "button");
            right.setAttribute("aria-label", window.VditorI18n.alignRight + "<" + updateHotkeyTip("⇧⌘R") + ">");
            right.setAttribute("data-type", "right");
            right.innerHTML =
                '<svg><use xlink:href="#vditor-icon-align-right"></use></svg>';
            right.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
                (alignType === "right" ? " vditor-icon--current" : "");
            right.onclick = () => {
                setAlign("right");
            };

            const insertRowElement = document.createElement("button");
            insertRowElement.setAttribute("type", "button");
            insertRowElement.setAttribute("aria-label", window.VditorI18n.insertRowBelow + "<" + updateHotkeyTip("⌘=") + ">");
            insertRowElement.setAttribute("data-type", "insertRow");
            insertRowElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-insert-row"></use></svg>';
            insertRowElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            insertRowElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    insertRow(vditor, range, cellElement);
                }
            };

            const insertRowBElement = document.createElement("button");
            insertRowBElement.setAttribute("type", "button");
            insertRowBElement.setAttribute("aria-label",
                window.VditorI18n.insertRowAbove + "<" + updateHotkeyTip("⇧⌘F") + ">");
            insertRowBElement.setAttribute("data-type", "insertRow");
            insertRowBElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-insert-rowb"></use></svg>';
            insertRowBElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            insertRowBElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    insertRowAbove(vditor, range, cellElement);
                }
            };

            const insertColumnElement = document.createElement("button");
            insertColumnElement.setAttribute("type", "button");
            insertColumnElement.setAttribute("aria-label", window.VditorI18n.insertColumnRight + "<" + updateHotkeyTip("⇧⌘=") + ">");
            insertColumnElement.setAttribute("data-type", "insertColumn");
            insertColumnElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-insert-column"></use></svg>';
            insertColumnElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            insertColumnElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    insertColumn(vditor, tableElement, cellElement);
                }
            };

            const insertColumnBElement = document.createElement("button");
            insertColumnBElement.setAttribute("type", "button");
            insertColumnBElement.setAttribute("aria-label", window.VditorI18n.insertColumnLeft + "<" + updateHotkeyTip("⇧⌘G") + ">");
            insertColumnBElement.setAttribute("data-type", "insertColumn");
            insertColumnBElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-insert-columnb"></use></svg>';
            insertColumnBElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            insertColumnBElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    insertColumn(vditor, tableElement, cellElement, "beforebegin");
                }
            };

            const deleteRowElement = document.createElement("button");
            deleteRowElement.setAttribute("type", "button");
            deleteRowElement.setAttribute("aria-label", window.VditorI18n["delete-row"] + "<" + updateHotkeyTip("⌘-") + ">");
            deleteRowElement.setAttribute("data-type", "deleteRow");
            deleteRowElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-delete-row"></use></svg>';
            deleteRowElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            deleteRowElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    deleteRow(vditor, range, cellElement);
                }
            };

            const deleteColumnElement = document.createElement("button");
            deleteColumnElement.setAttribute("type", "button");
            deleteColumnElement.setAttribute("aria-label", window.VditorI18n["delete-column"] + "<" + updateHotkeyTip("⇧⌘-") + ">");
            deleteColumnElement.setAttribute("data-type", "deleteColumn");
            deleteColumnElement.innerHTML =
                '<svg><use xlink:href="#vditor-icon-delete-column"></use></svg>';
            deleteColumnElement.className =
                "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            deleteColumnElement.onclick = () => {
                const startContainer = getSelection().getRangeAt(0)
                    .startContainer;
                const cellElement =
                    hasClosestByMatchTag(startContainer, "TD") ||
                    hasClosestByMatchTag(startContainer, "TH");
                if (cellElement) {
                    deleteColumn(vditor, range, tableElement, cellElement);
                }
            };

            const inputWrap = document.createElement("span");
            inputWrap.setAttribute("aria-label", window.VditorI18n.row);
            inputWrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const input = document.createElement("input");
            inputWrap.appendChild(input);
            input.type = "number";
            input.min = "1";
            input.className = "vditor-input";
            input.style.width = "42px";
            input.style.textAlign = "center";
            input.setAttribute("placeholder", window.VditorI18n.row);
            input.value = tableElement.rows.length.toString();
            input.oninput = () => {
                updateTable();
            };
            input.onkeydown = (event) => {
                if (event.isComposing) {
                    return;
                }
                if (event.key === "Tab") {
                    input2.focus();
                    input2.select();
                    event.preventDefault();
                    return;
                }
                if (removeBlockElement(vditor, event)) {
                    return;
                }
                if (focusToElement(event, range)) {
                    return;
                }
            };

            const input2Wrap = document.createElement("span");
            input2Wrap.setAttribute("aria-label", window.VditorI18n.column);
            input2Wrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const input2 = document.createElement("input");
            input2Wrap.appendChild(input2);
            input2.type = "number";
            input2.min = "1";
            input2.className = "vditor-input";
            input2.style.width = "42px";
            input2.style.textAlign = "center";
            input2.setAttribute("placeholder", window.VditorI18n.column);
            input2.value = tableElement.rows[0].cells.length.toString();
            input2.oninput = () => {
                updateTable();
            };
            input2.onkeydown = (event) => {
                if (event.isComposing) {
                    return;
                }
                if (event.key === "Tab") {
                    input.focus();
                    input.select();
                    event.preventDefault();
                    return;
                }
                if (removeBlockElement(vditor, event)) {
                    return;
                }
                if (focusToElement(event, range)) {
                    return;
                }
            };

            genUp(range, tableElement, vditor);
            genDown(range, tableElement, vditor);
            genClose(tableElement, vditor);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", left);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", center);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", right);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertRowBElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertRowElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertColumnBElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", insertColumnElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", deleteRowElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", deleteColumnElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inputWrap);
            vditor.wysiwyg.popover.insertAdjacentHTML("beforeend", " x ");
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", input2Wrap);
            setPopoverPosition(vditor, tableElement);
        }

        // link ref popover
        const linkRefElement = hasClosestByAttribute(typeElement, "data-type", "link-ref");
        if (linkRefElement) {
            genLinkRefPopover(vditor, linkRefElement, range);
        }

        // footnote popover
        const footnotesRefElement = hasClosestByAttribute(typeElement, "data-type", "footnotes-ref");
        if (footnotesRefElement) {
            const lang: keyof II18n | "" = vditor.options.lang;
            const options: IOptions = vditor.options;
            vditor.wysiwyg.popover.innerHTML = "";

            const inputWrap = document.createElement("span");
            inputWrap.setAttribute("aria-label", window.VditorI18n.footnoteRef + "<" + updateHotkeyTip("⌥Enter") + ">");
            inputWrap.className = "vditor-tooltipped vditor-tooltipped__n";
            const input = document.createElement("input");
            inputWrap.appendChild(input);
            input.className = "vditor-input";
            input.setAttribute("placeholder", window.VditorI18n.footnoteRef + "<" + updateHotkeyTip("⌥Enter") + ">");
            input.style.width = "120px";
            input.value = footnotesRefElement.getAttribute("data-footnotes-label");
            input.oninput = () => {
                if (input.value.trim() !== "") {
                    footnotesRefElement.setAttribute("data-footnotes-label", input.value);
                }
            };
            input.onkeydown = (event) => {
                if (event.isComposing) {
                    return;
                }
                if (removeBlockElement(vditor, event)) {
                    return;
                }
                if (focusToElement(event, range)) {
                    return;
                }
            };

            genClose(footnotesRefElement, vditor);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inputWrap);
            setPopoverPosition(vditor, footnotesRefElement);
        }

        // block popover: math-inline, math-block, html-block, html-inline, code-block, html-entity
        let blockRenderElement = hasClosestByClassName(typeElement, "vditor-wysiwyg__block") as HTMLElement;
        const isBlock = blockRenderElement ? blockRenderElement.getAttribute("data-type").indexOf("block") > -1 : false;
        vditor.wysiwyg.element
            .querySelectorAll(".vditor-wysiwyg__preview")
            .forEach((itemElement) => {
                // 隐藏未聚焦的编辑块
                if (!blockRenderElement || (blockRenderElement && isBlock && !blockRenderElement.contains(itemElement))) {
                    const previousElement = itemElement.previousElementSibling as HTMLElement;
                    previousElement.style.display = "none";
                    itemElement.classList.remove('math-block-preview')
                }
            });
        if (blockRenderElement && isBlock) {
            vditor.wysiwyg.popover.innerHTML = "";
            // genUp(range, blockRenderElement, vditor);
            // genDown(range, blockRenderElement, vditor);
            // genClose(blockRenderElement, vditor);

            if (blockRenderElement.getAttribute("data-type") === "code-block") {
                const languageWrap = document.createElement("span");
                languageWrap.setAttribute("aria-label", window.VditorI18n.language + "<" + updateHotkeyTip("⌥Enter") + ">");
                languageWrap.className = "vditor-tooltipped vditor-tooltipped__n";
                const language = document.createElement("input");
                languageWrap.appendChild(language);

                const codeElement =
                    blockRenderElement.firstElementChild.firstElementChild;

                language.className = "vditor-input";
                language.setAttribute("placeholder",
                    window.VditorI18n.language + "<" + updateHotkeyTip("⌥Enter") + ">");
                language.value =
                    codeElement.className.indexOf("language-") > -1
                        ? codeElement.className.split("-")[1].split(" ")[0]
                        : "";
                language.oninput = (e: InputEvent) => {
                    // 根据输入的语言，设置code-block的class
                    if (language.value.trim() !== "") {
                        codeElement.className = `language-${language.value}`;
                    } else {
                        codeElement.className = "";
                        vditor.hint.recentLanguage = "";
                    }
                    // 将编辑区的内容同步到预览区
                    if (blockRenderElement.lastElementChild.classList.contains("vditor-wysiwyg__preview")) {
                        blockRenderElement.lastElementChild.innerHTML =
                            blockRenderElement.firstElementChild.innerHTML;
                        processCodeRender(blockRenderElement.lastElementChild as HTMLElement, vditor);
                    }
                    afterRenderEvent(vditor);
                    // 当鼠标点选语言时，触发自定义input事件
                    if (e.detail === 1) {
                        // 选择语言后，输入焦点切换到代码输入框
                        range.setStart(codeElement.firstChild, 0);
                        range.collapse(true);
                        setSelectionFocus(range);
                    }
                };
                language.onkeydown = (event: KeyboardEvent) => {
                    if (event.isComposing) {
                        return;
                    }
                    if (removeBlockElement(vditor, event)) {
                        return;
                    }
                    if (
                        event.key === "Escape" &&
                        vditor.hint.element.style.display === "block"
                    ) {
                        vditor.hint.element.style.display = "none";
                        event.preventDefault();
                        return;
                    }
                    vditor.hint.select(event, vditor);
                    focusToElement(event, range);
                };
                language.onkeyup = (event: KeyboardEvent) => {
                    if (
                        event.isComposing ||
                        event.key === "Enter" ||
                        event.key === "ArrowUp" ||
                        event.key === "Escape" ||
                        event.key === "ArrowDown"
                    ) {
                        return;
                    }
                    // 找到匹配的语言，显示在下拉框中
                    const matchLangData: IHintData[] = [];
                    const key = language.value.substring(0, language.selectionStart);
                    Constants.CODE_LANGUAGES.forEach((keyName) => {
                        if (keyName.indexOf(key.toLowerCase()) > -1) {
                            matchLangData.push({
                                html: keyName,
                                value: keyName,
                            });
                        }
                    });
                    vditor.hint.genHTML(matchLangData, key, vditor);
                    event.preventDefault();
                };
                vditor.wysiwyg.popover.insertAdjacentElement("beforeend", languageWrap);
            }
            if (vditor.wysiwyg.popover.innerHTML !== "") {
                setPopoverPosition(vditor, blockRenderElement);
                if (vditor.wysiwyg.newCodeBlock) {
                    (vditor.wysiwyg.popover.firstElementChild.firstElementChild as HTMLInputElement).focus();
                    vditor.wysiwyg.newCodeBlock = false;
                }
            } else {
                hidePanel(vditor, ["popover"]);
            }
        } else {
            blockRenderElement = undefined;
        }

        // heading popover
        if (headingElement) {
            vditor.wysiwyg.popover.innerHTML = "";

            // 标题级别增大
            const plusElement = document.createElement("button");
            plusElement.setAttribute("type", "button");
            plusElement.setAttribute("data-type", "heading-plus");
            plusElement.setAttribute("aria-label", "标题增大");
            plusElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="24" height="24" viewBox="0 0 24 24"><defs><clipPath id="master_svg0_181_00427"><rect x="0" y="0" width="24" height="24" rx="0"/></clipPath></defs><g clip-path="url(#master_svg0_181_00427)"><g><g><path d="M12.796877775878906,11.985941801757813L19.171857775878905,18.360971801757813C19.61245777587891,18.801571801757813,19.61245777587891,19.51407180175781,19.171857775878905,19.949971801757812L18.11245777587891,21.009371801757812C17.671857775878905,21.449971801757812,16.959357775878907,21.449971801757812,16.523457775878907,21.009371801757812L11.999997775878906,16.495271801757813L7.481247775878906,21.01407180175781C7.040627775878907,21.45467180175781,6.328127775878906,21.45467180175781,5.892187775878906,21.01407180175781L4.828126775878906,19.95467180175781C4.387501775878906,19.51407180175781,4.387501775878906,18.801571801757813,4.828126775878906,18.365671801757813L11.203127775878906,11.990631801757813C11.643747775878907,11.545311801757812,12.356247775878906,11.545311801757812,12.796877775878906,11.985941801757813ZM11.203127775878906,2.9859398017578123L4.828126775878906,9.360941801757813C4.387501775878906,9.801561801757813,4.387501775878906,10.514061801757812,4.828126775878906,10.950001801757812L5.887497775878906,12.009381801757813C6.328127775878906,12.450001801757812,7.040627775878907,12.450001801757812,7.476567775878906,12.009381801757813L11.995317775878906,7.490631801757813L16.514057775878907,12.009381801757813C16.954657775878907,12.450001801757812,17.667157775878906,12.450001801757812,18.103157775878906,12.009381801757813L19.162457775878906,10.950001801757812C19.603157775878906,10.509381801757812,19.603157775878906,9.796881801757813,19.162457775878906,9.360941801757813L12.787497775878906,2.9859408017578124C12.356247775878906,2.5453158017578126,11.643747775878907,2.5453158017578126,11.203127775878906,2.9859398017578123Z"/></g></g></g></svg>`;
            plusElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            plusElement.onclick = () => {
                const range = getEditorRange(vditor);
                let curHeading = hasClosestByHeadings(range.startContainer) as HTMLElement;
                if (curHeading) {
                    const index = parseInt(curHeading.tagName.substr(1), 10) - 1;
                    if (index > 0) {
                        setHeading(vditor, `h${index}`); // 在这个函数中已经保存了光标位置
                        afterRenderEvent(vditor);
                    }
                }
            };

            // 标题级别减小
            const minusElement = document.createElement("button");
            minusElement.setAttribute("type", "button");
            minusElement.setAttribute("data-type", "heading-minus");
            minusElement.setAttribute("aria-label", "标题减小");
            minusElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="24" height="24" viewBox="0 0 24 24"><defs><clipPath id="master_svg0_181_00878"><rect x="0" y="0" width="24" height="24" rx="0"/></clipPath></defs><g clip-path="url(#master_svg0_181_00878)"><g><g><path d="M11.203127775878906,12.01406625L4.828126775878906,5.63906625C4.387501775878906,5.19843625,4.387501775878906,4.48593625,4.828126775878906,4.0499962499999995L5.887497775878906,2.99062525C6.328127775878906,2.55000025,7.040627775878907,2.55000025,7.476567775878906,2.99062525L11.995317775878906,7.50937625L16.514057775878907,2.99062525C16.954657775878907,2.55000025,17.667157775878906,2.55000025,18.103157775878906,2.99062525L19.171857775878905,4.04531625C19.61245777587891,4.48593625,19.61245777587891,5.19843625,19.171857775878905,5.63437625L12.796877775878906,12.00937625C12.356247775878906,12.45468625,11.643747775878907,12.45468625,11.203127775878906,12.01406625ZM12.796877775878906,21.01405625L19.171857775878905,14.63905625C19.61245777587891,14.19845625,19.61245777587891,13.48595625,19.171857775878905,13.04995625L18.11245777587891,11.99062625C17.671857775878905,11.54999625,16.959357775878907,11.54999625,16.523457775878907,11.99062625L11.999997775878906,16.50465625L7.481247775878906,11.98593625C7.040627775878907,11.54531625,6.328127775878906,11.54531625,5.892187775878906,11.98593625L4.828126775878906,13.04535625C4.387501775878906,13.48595625,4.387501775878906,14.19845625,4.828126775878906,14.63435625L11.203127775878906,21.00935625C11.643747775878907,21.45465625,12.356247775878906,21.45465625,12.796877775878906,21.01405625Z"/></g></g></g></svg>`;
            minusElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            minusElement.onclick = () => {
                const range = getEditorRange(vditor);
                let curHeading = hasClosestByHeadings(range.startContainer) as HTMLElement;
                if (curHeading) {
                    const index = parseInt(curHeading.tagName.substr(1), 10) + 1;
                    if (index < 7) {
                        setHeading(vditor, `h${index}`);
                        afterRenderEvent(vditor);
                    }
                }
            }

            // 选择标题级别
            const selectElement = document.createElement("span");
            const selectButton = document.createElement("button");
            const selectPannel = document.createElement("div");
            selectButton.setAttribute("type", "button");
            selectButton.setAttribute("data-type", "heading-select");
            selectButton.setAttribute("aria-label", "标题级别选择");
            selectButton.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            selectButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="24" height="24" viewBox="0 0 24 24"><defs><clipPath id="master_svg0_181_00354"><rect x="0" y="0" width="24" height="24" rx="0"/></clipPath></defs><g clip-path="url(#master_svg0_181_00354)"><g><path d="M6.667,10.6665L17.3335,10.6665L17.3335,1.3335C17.3335,0.597,17.930500000000002,0,18.667,0C19.4035,0,20.0005,0.597,20.0005,1.3335L20.0005,22.6665C20.0005,23.403,19.4035,24,18.667,24C17.930500000000002,24,17.3335,23.403,17.3335,22.6665L17.3335,13.3335L6.667,13.3335L6.667,22.6665C6.667,23.403,6.07,24,5.3335,24C4.5969999999999995,24,4,23.403,4,22.6665L4,1.3335C4,0.597,4.5969999999999995,0,5.3335,0C6.07,0,6.667,0.597,6.667,1.3335L6.667,10.6665Z"/></g></g></svg>`;
            selectButton.onclick = () => {
                range.insertNode(document.createElement("wbr"));
                selectPannel.style.display = "block";
                setRangeByWbr(vditor.wysiwyg.element, range);
            }
            selectPannel.className = "vditor-hint vditor-panel--arrow";
            selectPannel.style.left = "50px";
            selectPannel.innerHTML = `<button data-tag="h1" data-value="# ">${window.VditorI18n.heading1} </button>
                                    <button data-tag="h2" data-value="## ">${window.VditorI18n.heading2} </button>
                                    <button data-tag="h3" data-value="### ">${window.VditorI18n.heading3} </button>
                                    <button data-tag="h4" data-value="#### ">${window.VditorI18n.heading4} </button>
                                    <button data-tag="h5" data-value="##### ">${window.VditorI18n.heading5} </button>
                                    <button data-tag="h6" data-value="###### ">${window.VditorI18n.heading6} </button>`;
            for (let i = 0; i < 6; i++) {
                const button = selectPannel.children[i] as HTMLElement;
                button.onclick = () => {
                    setHeading(vditor, button.getAttribute("data-tag"));
                    afterRenderEvent(vditor);
                    selectPannel.style.display = "none";
                }
            }
            selectElement.appendChild(selectButton);
            selectElement.appendChild(selectPannel);

            // 清除标题
            const clearElement = document.createElement("button");
            clearElement.setAttribute("type", "button");
            clearElement.setAttribute("data-type", "heading-clear");
            clearElement.setAttribute("aria-label", "清除标题样式");
            clearElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="24" height="24" viewBox="0 0 24 24"><defs><clipPath id="master_svg0_181_00885"><rect x="0" y="0" width="24" height="24" rx="0"/></clipPath></defs><g clip-path="url(#master_svg0_181_00885)"><g><path d="M7.540055541534423,2.7810147036743165L8.820055541534423,4.901014703674317C8.970055541534425,5.131014703674317,8.890055541534423,5.441014703674316,8.650055541534424,5.5910147036743165L6.040055541534423,7.181014703674316C5.810055541534424,7.321014703674316,5.500055541534424,7.241014703674316,5.350055541534424,7.0110147036743165L4.030054541534424,4.8410147036743165C3.360055541534424,3.731014703674316,3.880055541534424,2.2210127036743166,5.220055541534424,1.8210123036743164C6.1100555415344235,1.5610127036743164,7.060055541534424,2.0010127036743164,7.540055541534423,2.7810147036743165ZM16.930385541534424,10.409804703674316L19.740385541534422,14.209794703674316C20.620385541534425,15.389794703674317,20.360385541534423,16.949794703674314,19.200385541534423,17.779794703674316C19.110385541534423,17.839794703674315,18.990385541534422,17.809794703674317,18.930385541534424,17.719794703674317L17.350385541534422,15.149794703674317C17.130385541534423,14.799794703674316,16.670385541534422,14.689794703674316,16.300385541534425,14.899794703674317C15.950385541534423,15.129794703674316,15.840385541534424,15.589794703674317,16.050385541534425,15.949794703674316L17.620385541534425,18.529794703674316C17.670385541534422,18.619794703674316,17.640385541534425,18.739794703674317,17.550385541534425,18.799794703674316L16.590385541534424,19.379794703674317C16.500385541534424,19.429794703674318,16.380385541534423,19.399794703674317,16.320385541534424,19.309794703674317L14.750385541534424,16.729794703674315C14.530385541534423,16.379794703674314,14.070385541534424,16.269794703674314,13.700405541534424,16.479794703674315C13.350405541534425,16.709794703674316,13.240405541534424,17.169794703674317,13.450405541534424,17.529794703674316L15.020385541534424,20.109794703674318C15.070385541534424,20.199794703674318,15.040385541534423,20.319794703674315,14.950385541534423,20.379794703674317L13.990385541534424,20.959794703674316C13.900385541534424,21.009794703674316,13.780385541534423,20.979794703674315,13.720405541534424,20.889794703674315L12.150405541534424,18.309794703674317C11.920405541534423,17.959794703674316,11.460405541534424,17.849794703674316,11.100405541534425,18.059794703674317C10.740405541534424,18.289794703674318,10.630405541534424,18.749794703674315,10.850405541534425,19.109794703674318L12.410405541534423,21.689794703674316C12.470405541534424,21.789794703674318,12.440405541534425,21.909794703674315,12.340405541534423,21.959794703674316C11.060405541534424,22.619794703674316,9.550375541534425,22.119794703674316,8.910375541534425,20.809794703674317L6.830375541534424,16.56979470367432C6.090375541534424,15.079794703674317,6.330375541534424,13.289794703674316,7.440375541534424,12.059794703674317Q7.430375541534424,12.059794703674317,7.430375541534424,12.049794703674316L5.780375541534424,9.319844703674317C5.490375541534424,8.839844703674316,5.640375541534424,8.209844703674317,6.120375541534424,7.929844703674316L9.590375541534424,5.819844703674317C10.060405541534424,5.529844703674316,10.680405541534423,5.679844703674316,10.980405541534424,6.149844703674316L12.640405541534424,8.879844703674316C12.640405541534424,8.889844703674317,12.650405541534424,8.889844703674317,12.650405541534424,8.899844703674315C14.250385541534424,8.469844703674315,15.950385541534423,9.089844703674316,16.930385541534424,10.409804703674316Z"/></g></g></svg>`;
            clearElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
            clearElement.onclick = () => {
                removeHeading(vditor);
            }

            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", plusElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", minusElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", selectElement);
            vditor.wysiwyg.popover.insertAdjacentElement("beforeend", clearElement);
            setPopoverPosition(vditor, headingElement);
        }

        // a popover
        if (aElement) {
            genAPopover(vditor, aElement, range);
        }

        // img popover
        const imgElement = hasClosestByMatchTag(typeElement, "IMG") as HTMLElement;
        if (imgElement) {
            setCurrentToolbar(vditor.toolbar.elements, ["img-link"]);
            genImagePopover(null, vditor, imgElement);
        }

        if (
            // !blockquoteElement &&
            // !liElement &&
            !codeElement && // 代码块中不弹出工具框
            !tableElement &&
            !blockRenderElement &&
            !aElement &&
            !linkRefElement &&
            !footnotesRefElement &&
            !headingElement &&
            !tocElement &&
            !imgElement
        ) {
            const blockElement = hasClosestByAttribute(typeElement, "data-block", "0");
            if (
                blockElement && range.toString() !== "" 
                // (blockElement.parentElement.isEqualNode(vditor.wysiwyg.element) || blockElement.tagName === "UL" || blockElement.tagName === "OL")
            ) {
                vditor.wysiwyg.popover.innerHTML = "";
                // 加粗
                const boldElement = document.createElement("button");
                boldElement.setAttribute("data-type", "bold");
                boldElement.setAttribute("aria-label", "加粗");
                boldElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
                boldElement.innerHTML = '<svg><use xlink:href="#vditor-icon-bold"></use></svg>';
                boldElement.onclick = () => {
                    const button =  vditor.toolbar.elements["bold"].children[0] as HTMLElement;
                    button.click();
                }

                // 斜体
                const italicElement = document.createElement("button");
                italicElement.setAttribute("data-type", "italic");
                italicElement.setAttribute("aria-label", "斜体");
                italicElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
                italicElement.innerHTML = '<svg><use xlink:href="#vditor-icon-italic"></use></svg>';
                italicElement.onclick = () => {
                    const button =  vditor.toolbar.elements["italic"].children[0] as HTMLElement;
                    button.click();
                }

                // 删除线
                const strikeElement = document.createElement("button");
                strikeElement.setAttribute("data-type", "strike");
                strikeElement.setAttribute("aria-label", "删除线");
                strikeElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
                strikeElement.innerHTML = '<svg><use xlink:href="#vditor-icon-strike"></use></svg>';
                strikeElement.onclick = () => {
                    const button =  vditor.toolbar.elements["strike"].children[0] as HTMLElement;
                    button.click();
                }

                // 行内代码
                const inlineCodeElement = document.createElement("button");
                inlineCodeElement.setAttribute("data-type", "inline-code");
                inlineCodeElement.setAttribute("aria-label", "行内代码");
                inlineCodeElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
                inlineCodeElement.innerHTML = '<svg><use xlink:href="#vditor-icon-code"></use></svg>';
                inlineCodeElement.onclick = () => {
                    const button =  vditor.toolbar.elements["inline-code"].children[0] as HTMLElement;
                    button.click();
                }

                // 行内数学公式
                const inlineMathElement = document.createElement("button");
                inlineMathElement.setAttribute("data-type", "inline-math");
                inlineMathElement.setAttribute("aria-label", "行内数学公式");
                inlineMathElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
                inlineMathElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="24" height="24" viewBox="0 0 24 24"><defs><clipPath id="master_svg0_181_9496"><rect x="0" y="0" width="24" height="24" rx="0"/></clipPath></defs><g clip-path="url(#master_svg0_181_9496)"><g><path d="M21.5,13.25L16.5,13.25Q16.4386,13.25,16.377499999999998,13.244Q16.3164,13.238,16.2561,13.226Q16.1959,13.214,16.1371,13.1962Q16.078400000000002,13.1783,16.0216,13.1548Q15.9649,13.1313,15.9108,13.1024Q15.8566,13.0735,15.8055,13.0393Q15.7545,13.0052,15.707,12.96626Q15.6595,12.92731,15.6161,12.88388Q15.5727,12.84046,15.5337,12.79299Q15.4948,12.74552,15.4607,12.69446Q15.4265,12.6434,15.3976,12.58924Q15.3686,12.53509,15.3451,12.47835Q15.3216,12.42162,15.3038,12.36285Q15.286,12.30409,15.274,12.24386Q15.262,12.18363,15.256,12.12252Q15.25,12.06141,15.25,12Q15.25,11.93859,15.256,11.87748Q15.262,11.81637,15.274,11.75614Q15.286,11.69591,15.3038,11.63714Q15.3217,11.57838,15.3451,11.52164Q15.3687,11.46491,15.3976,11.41075Q15.4265,11.3566,15.4607,11.30554Q15.4948,11.25448,15.5337,11.20701Q15.5727,11.15954,15.6161,11.11612Q15.6595,11.07269,15.707,11.03374Q15.7545,10.99478,15.8055,10.96066Q15.8566,10.926549999999999,15.9108,10.8976Q15.9649,10.868649999999999,16.0216,10.84515Q16.078400000000002,10.82165,16.1371,10.80382Q16.1959,10.786,16.2561,10.77402Q16.3164,10.762039999999999,16.377499999999998,10.75602Q16.4386,10.75,16.5,10.75L21.5,10.75Q21.5614,10.75,21.6225,10.75602Q21.6836,10.762039999999999,21.7439,10.77402Q21.8041,10.786,21.8629,10.80382Q21.9216,10.82165,21.9784,10.84515Q22.0351,10.868649999999999,22.0892,10.8976Q22.1434,10.926549999999999,22.1945,10.96066Q22.2455,10.99478,22.293,11.03374Q22.3405,11.07269,22.3839,11.11612Q22.4273,11.15954,22.4663,11.20701Q22.5052,11.25448,22.5393,11.30554Q22.5735,11.3566,22.6024,11.41075Q22.6313,11.46491,22.6548,11.52164Q22.6783,11.57838,22.6962,11.63714Q22.714,11.69591,22.726,11.75614Q22.738,11.81637,22.744,11.87748Q22.75,11.93859,22.75,12Q22.75,12.06141,22.744,12.12252Q22.738,12.18363,22.726,12.24386Q22.714,12.30409,22.6962,12.36285Q22.6783,12.42162,22.6548,12.47835Q22.6313,12.53509,22.6024,12.58925Q22.5735,12.6434,22.5393,12.69446Q22.5052,12.74552,22.4663,12.79299Q22.4273,12.84046,22.3839,12.88388Q22.3405,12.92731,22.293,12.96626Q22.2455,13.0052,22.1945,13.0393Q22.1434,13.0735,22.0892,13.1024Q22.0351,13.1313,21.9784,13.1548Q21.9216,13.1783,21.8629,13.1962Q21.8041,13.214,21.7439,13.226Q21.6836,13.238,21.6225,13.244Q21.5614,13.25,21.5,13.25ZM7.5,13.25L2.5,13.25Q2.4385914,13.25,2.377479,13.244Q2.316366,13.238,2.256137,13.226Q2.195909,13.214,2.137144,13.1962Q2.07838,13.1783,2.021646,13.1548Q1.964912,13.1313,1.9107539999999998,13.1024Q1.856597,13.0735,1.805537,13.0393Q1.754478,13.0052,1.707008,12.96626Q1.659539,12.92731,1.616117,12.88388Q1.572694,12.84046,1.533737,12.79299Q1.49478,12.74552,1.46066,12.69446Q1.42655,12.6434,1.3976,12.58924Q1.36865,12.53509,1.34515,12.47835Q1.32165,12.42162,1.30382,12.36285Q1.286,12.30409,1.27402,12.24386Q1.26204,12.18363,1.25602,12.12252Q1.25,12.06141,1.25,12Q1.25,11.93859,1.25602,11.87748Q1.26204,11.81637,1.27402,11.75614Q1.286,11.69591,1.30382,11.63714Q1.32165,11.57838,1.34515,11.52164Q1.36865,11.46491,1.3976,11.41075Q1.42655,11.3566,1.46066,11.30554Q1.49478,11.25448,1.533737,11.20701Q1.572694,11.15954,1.616117,11.11612Q1.659539,11.07269,1.707008,11.03374Q1.754478,10.99478,1.805537,10.96066Q1.856597,10.926549999999999,1.9107539999999998,10.8976Q1.964912,10.868649999999999,2.021646,10.84515Q2.07838,10.82165,2.137144,10.80382Q2.195909,10.786,2.256137,10.77402Q2.316366,10.762039999999999,2.377479,10.75602Q2.4385914,10.75,2.5,10.75L7.5,10.75Q7.56141,10.75,7.62252,10.75602Q7.68363,10.762039999999999,7.74386,10.77402Q7.80409,10.786,7.86286,10.80382Q7.92162,10.82165,7.97835,10.84515Q8.03509,10.868649999999999,8.08925,10.8976Q8.1434,10.926549999999999,8.19446,10.96066Q8.245519999999999,10.99478,8.29299,11.03374Q8.34046,11.07269,8.383880000000001,11.11612Q8.42731,11.15954,8.46626,11.20701Q8.50522,11.25448,8.53934,11.30554Q8.573450000000001,11.3566,8.6024,11.41075Q8.631350000000001,11.46491,8.65485,11.52164Q8.67835,11.57838,8.69617,11.63714Q8.714,11.69591,8.72598,11.75614Q8.737960000000001,11.81637,8.74398,11.87748Q8.75,11.93859,8.75,12Q8.75,12.06141,8.74398,12.12252Q8.737960000000001,12.18363,8.72598,12.24386Q8.714,12.30409,8.69617,12.36285Q8.67835,12.42162,8.65485,12.47835Q8.631350000000001,12.53509,8.6024,12.58925Q8.573450000000001,12.6434,8.53934,12.69446Q8.50522,12.74552,8.46626,12.79299Q8.42731,12.84046,8.383880000000001,12.88388Q8.34046,12.92731,8.29299,12.96626Q8.245519999999999,13.0052,8.19446,13.0393Q8.1434,13.0735,8.08925,13.1024Q8.03509,13.1313,7.97835,13.1548Q7.92162,13.1783,7.86286,13.1962Q7.80409,13.214,7.74386,13.226Q7.68363,13.238,7.62252,13.244Q7.56141,13.25,7.5,13.25ZM19.3839,20.3839L17.8839,21.8839Q17.796799999999998,21.9709,17.694499999999998,22.0393Q17.592100000000002,22.1077,17.4784,22.1548Q17.3646,22.202,17.2439,22.226Q17.1231,22.25,17,22.25L4,22.25Q3.93859,22.25,3.8774800000000003,22.244Q3.81637,22.238,3.7561400000000003,22.226Q3.69591,22.214,3.63714,22.1962Q3.57838,22.1783,3.52165,22.1548Q3.464912,22.1313,3.410754,22.1024Q3.356597,22.0735,3.305537,22.0393Q3.2544779999999998,22.0052,3.207008,21.9663Q3.159539,21.9273,3.116116,21.8839Q3.0726940000000003,21.8405,3.033737,21.793Q2.99478,21.7455,2.960663,21.6945Q2.926546,21.6434,2.897598,21.5892Q2.868651,21.5351,2.845151,21.4784Q2.821651,21.4216,2.803825,21.3629Q2.785999,21.3041,2.774018,21.2439Q2.762038,21.1836,2.756019,21.1225Q2.75,21.0614,2.75,21Q2.75,20.7606,2.838437,20.5382Q2.9268739999999998,20.3157,3.091234,20.1417L11.59123,11.14172L12.5,12L11.59123,12.85828L3.091234,3.858279Q3.0490690000000003,3.813635,3.011483,3.765072Q2.973898,3.716509,2.941253,3.6644959999999998Q2.908609,3.612483,2.8812189999999998,3.557521Q2.85383,3.5025589999999998,2.83196,3.445177Q2.8100899999999998,3.387795,2.793949,3.328545Q2.777809,3.2692959999999998,2.767554,3.20875Q2.757299,3.148203,2.753027,3.0869436Q2.748756,3.0256838,2.7505100000000002,2.9643003Q2.752264,2.9029168,2.760026,2.8420009999999998Q2.767788,2.781085,2.781483,2.721223Q2.795179,2.661361,2.814676,2.60313Q2.834173,2.544898,2.859283,2.488859Q2.884394,2.432819,2.914877,2.37951Q2.94536,2.326201,2.980921,2.276137Q3.016482,2.226073,3.056779,2.179736Q3.097076,2.133398,3.141721,2.091234Q3.315749,1.92687,3.53819,1.83844Q3.76063,1.75,4,1.75L17,1.75Q17.1231,1.75,17.2439,1.77402Q17.3646,1.79804,17.4784,1.84515Q17.592100000000002,1.89226,17.694499999999998,1.96066Q17.796799999999998,2.029062,17.8839,2.116117L19.3839,3.616117Q19.4273,3.659539,19.4663,3.707008Q19.5052,3.7544779999999998,19.5393,3.805537Q19.5735,3.856597,19.6024,3.910754Q19.6313,3.964912,19.6548,4.02165Q19.6784,4.07838,19.6962,4.1371400000000005Q19.714,4.19591,19.726,4.25614Q19.738,4.31637,19.744,4.37748Q19.75,4.43859,19.75,4.5Q19.75,4.56141,19.744,4.62252Q19.738,4.68363,19.726,4.74386Q19.714,4.80409,19.6962,4.8628599999999995Q19.6784,4.92162,19.6548,4.97835Q19.6313,5.03509,19.6024,5.08925Q19.5735,5.1434,19.5393,5.194459999999999Q19.5052,5.24552,19.4663,5.29299Q19.4273,5.34046,19.3839,5.3838799999999996Q19.3405,5.42731,19.293,5.46626Q19.2455,5.50522,19.1945,5.53934Q19.1434,5.573449999999999,19.0892,5.602399999999999Q19.0351,5.631349999999999,18.9784,5.65485Q18.9216,5.67835,18.8629,5.69618Q18.8041,5.714,18.7439,5.72598Q18.6836,5.73796,18.6225,5.7439800000000005Q18.5614,5.75,18.5,5.75Q18.4386,5.75,18.377499999999998,5.7439800000000005Q18.3164,5.73796,18.2561,5.72598Q18.1959,5.714,18.1371,5.69618Q18.078400000000002,5.67835,18.0216,5.65485Q17.9649,5.631349999999999,17.910800000000002,5.602399999999999Q17.8566,5.573449999999999,17.805500000000002,5.53934Q17.7545,5.50522,17.707,5.46626Q17.6595,5.42731,17.6161,5.3838799999999996L16.1161,3.883883L17,3L17,4.25L4,4.25L4,3L4.9087700000000005,2.141721L13.4088,11.14172Q13.4494,11.18474,13.4858,11.2314Q13.5222,11.27807,13.554,11.32796Q13.5858,11.37785,13.6127,11.43053Q13.6397,11.4832,13.6616,11.53819Q13.6834,11.59317,13.7,11.64998Q13.7166,11.70678,13.7277,11.7649Q13.7388,11.82302,13.7444,11.88192Q13.75,11.94083,13.75,12Q13.75,12.05917,13.7444,12.11808Q13.7388,12.17699,13.7277,12.2351Q13.7166,12.29322,13.7,12.35002Q13.6834,12.40683,13.6616,12.46181Q13.6397,12.5168,13.6127,12.56947Q13.5858,12.62215,13.554,12.67204Q13.5222,12.72193,13.4858,12.7686Q13.4494,12.81526,13.4088,12.85828L4.9087700000000005,21.8583L4,21L4,19.75L17,19.75L17,21L16.1161,20.1161L17.6161,18.6161Q17.6595,18.572699999999998,17.707,18.5337Q17.7545,18.494799999999998,17.805500000000002,18.4607Q17.8566,18.4265,17.910800000000002,18.3976Q17.9649,18.3687,18.0216,18.345100000000002Q18.078400000000002,18.3216,18.1371,18.303800000000003Q18.1959,18.286,18.2561,18.274Q18.3164,18.262,18.377499999999998,18.256Q18.4386,18.25,18.5,18.25Q18.5614,18.25,18.6225,18.256Q18.6836,18.262,18.7439,18.274Q18.8041,18.286,18.8629,18.303800000000003Q18.9216,18.3216,18.9784,18.345100000000002Q19.0351,18.3687,19.0892,18.3976Q19.1434,18.4265,19.1945,18.4607Q19.2455,18.494799999999998,19.293,18.5337Q19.3405,18.572699999999998,19.3839,18.6161Q19.4273,18.6595,19.4663,18.707Q19.5052,18.7545,19.5393,18.805500000000002Q19.5735,18.8566,19.6024,18.910800000000002Q19.6313,18.9649,19.6548,19.0216Q19.6784,19.0784,19.6962,19.1371Q19.714,19.1959,19.726,19.2561Q19.738,19.3164,19.744,19.3775Q19.75,19.4386,19.75,19.5Q19.75,19.5614,19.744,19.6225Q19.738,19.6836,19.726,19.7439Q19.714,19.8041,19.6962,19.8629Q19.6784,19.9216,19.6548,19.9784Q19.6313,20.0351,19.6024,20.0892Q19.5735,20.1434,19.5393,20.1945Q19.5052,20.2455,19.4663,20.293Q19.4273,20.3405,19.3839,20.3839ZM22.75,12Q22.75,12.06141,22.744,12.12252Q22.738,12.18363,22.726,12.24386Q22.714,12.30409,22.6962,12.36285Q22.6783,12.42162,22.6548,12.47835Q22.6313,12.53509,22.6024,12.58925Q22.5735,12.6434,22.5393,12.69446Q22.5052,12.74552,22.4663,12.79299Q22.4273,12.84046,22.3839,12.88388Q22.3405,12.92731,22.293,12.96626Q22.2455,13.0052,22.1945,13.0393Q22.1434,13.0735,22.0892,13.1024Q22.0351,13.1313,21.9784,13.1548Q21.9216,13.1783,21.8629,13.1962Q21.8041,13.214,21.7439,13.226Q21.6836,13.238,21.6225,13.244Q21.5614,13.25,21.5,13.25Q21.4386,13.25,21.3775,13.244Q21.3164,13.238,21.2561,13.226Q21.1959,13.214,21.1371,13.1962Q21.0784,13.1783,21.0216,13.1548Q20.9649,13.1313,20.9108,13.1024Q20.8566,13.0735,20.8055,13.0393Q20.7545,13.0052,20.707,12.96626Q20.6595,12.92731,20.6161,12.88388Q20.5727,12.84046,20.5337,12.79299Q20.4948,12.74552,20.4607,12.69446Q20.4265,12.6434,20.3976,12.58924Q20.3686,12.53509,20.3451,12.47835Q20.3216,12.42162,20.3038,12.36285Q20.286,12.30409,20.274,12.24386Q20.262,12.18363,20.256,12.12252Q20.25,12.06141,20.25,12Q20.25,11.93859,20.256,11.87748Q20.262,11.81637,20.274,11.75614Q20.286,11.69591,20.3038,11.63714Q20.3216,11.57838,20.3451,11.52164Q20.3686,11.46491,20.3976,11.41075Q20.4265,11.3566,20.4607,11.30554Q20.4948,11.25448,20.5337,11.20701Q20.5727,11.15954,20.6161,11.11612Q20.6595,11.07269,20.707,11.03374Q20.7545,10.99478,20.8055,10.96066Q20.8566,10.926549999999999,20.9108,10.8976Q20.9649,10.868649999999999,21.0216,10.84515Q21.0784,10.82165,21.1371,10.80382Q21.1959,10.786,21.2561,10.77402Q21.3164,10.762039999999999,21.3775,10.75602Q21.4386,10.75,21.5,10.75Q21.5614,10.75,21.6225,10.75602Q21.6836,10.762039999999999,21.7439,10.77402Q21.8041,10.786,21.8629,10.80382Q21.9216,10.82165,21.9784,10.84515Q22.0351,10.868649999999999,22.0892,10.8976Q22.1434,10.926549999999999,22.1945,10.96066Q22.2455,10.99478,22.293,11.03374Q22.3405,11.07269,22.3839,11.11612Q22.4273,11.15954,22.4663,11.20701Q22.5052,11.25448,22.5393,11.30554Q22.5735,11.3566,22.6024,11.41075Q22.6313,11.46491,22.6548,11.52164Q22.6783,11.57838,22.6962,11.63714Q22.714,11.69591,22.726,11.75614Q22.738,11.81637,22.744,11.87748Q22.75,11.93859,22.75,12ZM17.75,12Q17.75,12.06141,17.744,12.12252Q17.738,12.18363,17.726,12.24386Q17.714,12.30409,17.696199999999997,12.36285Q17.6783,12.42162,17.6548,12.47835Q17.6313,12.53509,17.6024,12.58925Q17.5735,12.6434,17.5393,12.69446Q17.505200000000002,12.74552,17.4663,12.79299Q17.427300000000002,12.84046,17.3839,12.88388Q17.3405,12.92731,17.293,12.96626Q17.2455,13.0052,17.194499999999998,13.0393Q17.1434,13.0735,17.089199999999998,13.1024Q17.0351,13.1313,16.9784,13.1548Q16.921599999999998,13.1783,16.8629,13.1962Q16.8041,13.214,16.7439,13.226Q16.6836,13.238,16.622500000000002,13.244Q16.5614,13.25,16.5,13.25Q16.4386,13.25,16.377499999999998,13.244Q16.3164,13.238,16.2561,13.226Q16.1959,13.214,16.1371,13.1962Q16.078400000000002,13.1783,16.0216,13.1548Q15.9649,13.1313,15.9108,13.1024Q15.8566,13.0735,15.8055,13.0393Q15.7545,13.0052,15.707,12.96626Q15.6595,12.92731,15.6161,12.88388Q15.5727,12.84046,15.5337,12.79299Q15.4948,12.74552,15.4607,12.69446Q15.4265,12.6434,15.3976,12.58924Q15.3686,12.53509,15.3451,12.47835Q15.3216,12.42162,15.3038,12.36285Q15.286,12.30409,15.274,12.24386Q15.262,12.18363,15.256,12.12252Q15.25,12.06141,15.25,12Q15.25,11.93859,15.256,11.87748Q15.262,11.81637,15.274,11.75614Q15.286,11.69591,15.3038,11.63714Q15.3217,11.57838,15.3451,11.52164Q15.3687,11.46491,15.3976,11.41075Q15.4265,11.3566,15.4607,11.30554Q15.4948,11.25448,15.5337,11.20701Q15.5727,11.15954,15.6161,11.11612Q15.6595,11.07269,15.707,11.03374Q15.7545,10.99478,15.8055,10.96066Q15.8566,10.926549999999999,15.9108,10.8976Q15.9649,10.868649999999999,16.0216,10.84515Q16.078400000000002,10.82165,16.1371,10.80382Q16.1959,10.786,16.2561,10.77402Q16.3164,10.762039999999999,16.377499999999998,10.75602Q16.4386,10.75,16.5,10.75Q16.5614,10.75,16.622500000000002,10.75602Q16.6836,10.762039999999999,16.7439,10.77402Q16.8041,10.786,16.8629,10.80382Q16.921599999999998,10.82165,16.9784,10.84515Q17.0351,10.868649999999999,17.089199999999998,10.8976Q17.1434,10.926549999999999,17.194499999999998,10.96066Q17.2455,10.99478,17.293,11.03374Q17.3405,11.07269,17.3839,11.11612Q17.427300000000002,11.15954,17.4663,11.20701Q17.505200000000002,11.25448,17.5393,11.30554Q17.5735,11.3566,17.6024,11.41075Q17.6313,11.46491,17.6548,11.52164Q17.6783,11.57838,17.696199999999997,11.63714Q17.714,11.69591,17.726,11.75614Q17.738,11.81637,17.744,11.87748Q17.75,11.93859,17.75,12ZM8.75,12Q8.75,12.06141,8.74398,12.12252Q8.737960000000001,12.18363,8.72598,12.24386Q8.714,12.30409,8.69617,12.36285Q8.67835,12.42162,8.65485,12.47835Q8.631350000000001,12.53509,8.6024,12.58925Q8.573450000000001,12.6434,8.53934,12.69446Q8.50522,12.74552,8.46626,12.79299Q8.42731,12.84046,8.383880000000001,12.88388Q8.34046,12.92731,8.29299,12.96626Q8.245519999999999,13.0052,8.19446,13.0393Q8.1434,13.0735,8.08925,13.1024Q8.03509,13.1313,7.97835,13.1548Q7.92162,13.1783,7.86286,13.1962Q7.80409,13.214,7.74386,13.226Q7.68363,13.238,7.62252,13.244Q7.56141,13.25,7.5,13.25Q7.43859,13.25,7.37748,13.244Q7.31637,13.238,7.25614,13.226Q7.19591,13.214,7.13714,13.1962Q7.07838,13.1783,7.02165,13.1548Q6.96491,13.1313,6.91075,13.1024Q6.8566,13.0735,6.80554,13.0393Q6.75448,13.0052,6.70701,12.96626Q6.65954,12.92731,6.61612,12.88388Q6.57269,12.84046,6.53374,12.79299Q6.49478,12.74552,6.46066,12.69446Q6.426550000000001,12.6434,6.397600000000001,12.58924Q6.368650000000001,12.53509,6.34515,12.47835Q6.32165,12.42162,6.30382,12.36285Q6.286,12.30409,6.27402,12.24386Q6.26204,12.18363,6.2560199999999995,12.12252Q6.25,12.06141,6.25,12Q6.25,11.93859,6.2560199999999995,11.87748Q6.26204,11.81637,6.27402,11.75614Q6.286,11.69591,6.30382,11.63714Q6.32165,11.57838,6.34515,11.52164Q6.368650000000001,11.46491,6.397600000000001,11.41075Q6.426550000000001,11.3566,6.46066,11.30554Q6.49478,11.25448,6.53374,11.20701Q6.57269,11.15954,6.61612,11.11612Q6.65954,11.07269,6.70701,11.03374Q6.75448,10.99478,6.80554,10.96066Q6.8566,10.926549999999999,6.91075,10.8976Q6.96491,10.868649999999999,7.02165,10.84515Q7.07838,10.82165,7.13714,10.80382Q7.19591,10.786,7.25614,10.77402Q7.31637,10.762039999999999,7.37748,10.75602Q7.43859,10.75,7.5,10.75Q7.56141,10.75,7.62252,10.75602Q7.68363,10.762039999999999,7.74386,10.77402Q7.80409,10.786,7.86286,10.80382Q7.92162,10.82165,7.97835,10.84515Q8.03509,10.868649999999999,8.08925,10.8976Q8.1434,10.926549999999999,8.19446,10.96066Q8.245519999999999,10.99478,8.29299,11.03374Q8.34046,11.07269,8.383880000000001,11.11612Q8.42731,11.15954,8.46626,11.20701Q8.50522,11.25448,8.53934,11.30554Q8.573450000000001,11.3566,8.6024,11.41075Q8.631350000000001,11.46491,8.65485,11.52164Q8.67835,11.57838,8.69617,11.63714Q8.714,11.69591,8.72598,11.75614Q8.737960000000001,11.81637,8.74398,11.87748Q8.75,11.93859,8.75,12ZM3.75,12Q3.75,12.06141,3.74398,12.12252Q3.73796,12.18363,3.72598,12.24386Q3.714,12.30409,3.69618,12.36285Q3.67835,12.42162,3.6548499999999997,12.47835Q3.6313500000000003,12.53509,3.6024000000000003,12.58925Q3.5734500000000002,12.6434,3.53934,12.69446Q3.50522,12.74552,3.466263,12.79299Q3.4273059999999997,12.84046,3.383883,12.88388Q3.340461,12.92731,3.292992,12.96626Q3.2455220000000002,13.0052,3.194463,13.0393Q3.143403,13.0735,3.089246,13.1024Q3.035088,13.1313,2.978354,13.1548Q2.92162,13.1783,2.862856,13.1962Q2.804091,13.214,2.743863,13.226Q2.683634,13.238,2.622521,13.244Q2.5614086,13.25,2.5,13.25Q2.4385914,13.25,2.377479,13.244Q2.316366,13.238,2.256137,13.226Q2.195909,13.214,2.137144,13.1962Q2.07838,13.1783,2.021646,13.1548Q1.964912,13.1313,1.9107539999999998,13.1024Q1.856597,13.0735,1.805537,13.0393Q1.754478,13.0052,1.707008,12.96626Q1.659539,12.92731,1.616117,12.88388Q1.572694,12.84046,1.533737,12.79299Q1.49478,12.74552,1.46066,12.69446Q1.42655,12.6434,1.3976,12.58924Q1.36865,12.53509,1.34515,12.47835Q1.32165,12.42162,1.30382,12.36285Q1.286,12.30409,1.27402,12.24386Q1.26204,12.18363,1.25602,12.12252Q1.25,12.06141,1.25,12Q1.25,11.93859,1.25602,11.87748Q1.26204,11.81637,1.27402,11.75614Q1.286,11.69591,1.30382,11.63714Q1.32165,11.57838,1.34515,11.52164Q1.36865,11.46491,1.3976,11.41075Q1.42655,11.3566,1.46066,11.30554Q1.49478,11.25448,1.533737,11.20701Q1.572694,11.15954,1.616117,11.11612Q1.659539,11.07269,1.707008,11.03374Q1.754478,10.99478,1.805537,10.96066Q1.856597,10.926549999999999,1.9107539999999998,10.8976Q1.964912,10.868649999999999,2.021646,10.84515Q2.07838,10.82165,2.137144,10.80382Q2.195909,10.786,2.256137,10.77402Q2.316366,10.762039999999999,2.377479,10.75602Q2.4385914,10.75,2.5,10.75Q2.5614086,10.75,2.622521,10.75602Q2.683634,10.762039999999999,2.743863,10.77402Q2.804091,10.786,2.862856,10.80382Q2.92162,10.82165,2.978354,10.84515Q3.035088,10.868649999999999,3.089246,10.8976Q3.143403,10.926549999999999,3.194463,10.96066Q3.2455220000000002,10.99478,3.292992,11.03374Q3.340461,11.07269,3.383883,11.11612Q3.4273059999999997,11.15954,3.466263,11.20701Q3.50522,11.25448,3.53934,11.30554Q3.5734500000000002,11.3566,3.6024000000000003,11.41075Q3.6313500000000003,11.46491,3.6548499999999997,11.52164Q3.67835,11.57838,3.69618,11.63714Q3.714,11.69591,3.72598,11.75614Q3.73796,11.81637,3.74398,11.87748Q3.75,11.93859,3.75,12Z"/></g></g></svg>`;
                inlineMathElement.onclick = () => {
                    const button =  vditor.toolbar.elements["inline-math"].children[0] as HTMLElement;
                    button.click();
                }

                // 清除样式
                const clearElement = document.createElement("button");
                clearElement.setAttribute("data-type", "clear");
                clearElement.setAttribute("aria-label", "清除样式");
                clearElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
                clearElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" version="1.1" width="24" height="24" viewBox="0 0 24 24"><defs><clipPath id="master_svg0_181_00339"><rect x="0" y="0" width="24" height="24" rx="0"/></clipPath></defs><g clip-path="url(#master_svg0_181_00339)"><g><path d="M12.383874517822266,14.383863073730469L6.383884517822265,20.38386307373047Q6.340464517822266,20.42726307373047,6.292994517822265,20.46626307373047Q6.245524517822266,20.50516307373047,6.194464517822266,20.53936307373047Q6.143404517822265,20.57346307373047,6.0892545178222655,20.60236307373047Q6.035094517822266,20.63136307373047,5.9783545178222655,20.654863073730468Q5.9216245178222655,20.67836307373047,5.862864517822265,20.696163073730467Q5.804094517822266,20.71396307373047,5.743864517822265,20.72596307373047Q5.683634517822266,20.73796307373047,5.622524517822265,20.74396307373047Q5.561414517822266,20.74996307373047,5.500004517822266,20.74996307373047Q5.438594517822265,20.74996307373047,5.377484517822266,20.74396307373047Q5.316364517822265,20.73796307373047,5.256144517822266,20.72596307373047Q5.195914517822265,20.71396307373047,5.137144517822266,20.696163073730467Q5.078384517822266,20.67836307373047,5.021644517822265,20.654863073730468Q4.964914517822265,20.63136307373047,4.910754517822266,20.60236307373047Q4.856604517822266,20.57346307373047,4.805544517822266,20.53936307373047Q4.754484517822266,20.50516307373047,4.707014517822266,20.46626307373047Q4.659544517822265,20.42726307373047,4.616124517822266,20.38386307373047Q4.572694517822265,20.34046307373047,4.5337445178222655,20.29296307373047Q4.494784517822266,20.24556307373047,4.4606645178222655,20.194463073730468Q4.426554517822266,20.14336307373047,4.397604517822266,20.089263073730468Q4.368654517822266,20.03506307373047,4.345154517822266,19.97836307373047Q4.321654517822266,19.921563073730468,4.303824517822266,19.86286307373047Q4.286004517822265,19.804063073730468,4.274024517822266,19.74386307373047Q4.2620445178222655,19.683663073730468,4.256024517822265,19.62246307373047Q4.250004517822266,19.56136307373047,4.250004517822266,19.49996307373047Q4.250004517822266,19.438563073730467,4.256024517822265,19.377463073730468Q4.2620445178222655,19.316363073730468,4.274024517822266,19.25616307373047Q4.286004517822265,19.195863073730468,4.303824517822266,19.13716307373047Q4.321654517822266,19.07836307373047,4.345154517822266,19.02166307373047Q4.368654517822266,18.96486307373047,4.397604517822266,18.910763073730468Q4.426554517822266,18.85656307373047,4.4606645178222655,18.805563073730468Q4.494784517822266,18.75446307373047,4.5337445178222655,18.706963073730467Q4.572694517822265,18.659563073730467,4.616124517822266,18.61606307373047L10.616124517822266,12.61606307373047Q10.659544517822265,12.57266307373047,10.707014517822266,12.53376307373047Q10.754484517822265,12.49476307373047,10.805544517822266,12.460663073730469Q10.856604517822266,12.426563073730469,10.910754517822266,12.397563073730469Q10.964914517822265,12.368663073730469,11.021644517822265,12.345163073730468Q11.078384517822265,12.321663073730468,11.137144517822266,12.303863073730469Q11.195914517822265,12.28596307373047,11.256144517822266,12.273963073730469Q11.316364517822265,12.262063073730468,11.377484517822266,12.255963073730468Q11.438594517822265,12.249963073730468,11.500004517822266,12.249963073730468Q11.561414517822266,12.249963073730468,11.622524517822265,12.255963073730468Q11.683634517822266,12.262063073730468,11.743864517822265,12.273963073730469Q11.804094517822266,12.28596307373047,11.862854517822266,12.303863073730469Q11.921624517822266,12.321663073730468,11.978354517822266,12.345163073730468Q12.035074517822265,12.368663073730469,12.089274517822266,12.397563073730469Q12.143374517822267,12.426563073730469,12.194474517822266,12.460663073730469Q12.245474517822265,12.49476307373047,12.292974517822266,12.53376307373047Q12.340474517822265,12.57266307373047,12.383874517822266,12.61606307373047Q12.427274517822266,12.65956307373047,12.466274517822265,12.706963073730469Q12.505174517822265,12.754463073730468,12.539374517822266,12.805563073730468Q12.573474517822266,12.856563073730468,12.602374517822266,12.910763073730468Q12.631374517822266,12.964863073730468,12.654874517822266,13.021663073730469Q12.678374517822265,13.078363073730468,12.696174517822266,13.137163073730468Q12.713974517822265,13.195863073730468,12.725974517822266,13.256163073730468Q12.737974517822266,13.316363073730468,12.743974517822265,13.37746307373047Q12.749974517822265,13.438563073730469,12.749974517822265,13.499963073730468Q12.749974517822265,13.561363073730469,12.743974517822265,13.622563073730468Q12.737974517822266,13.683663073730468,12.725974517822266,13.743863073730468Q12.713974517822265,13.804063073730468,12.696174517822266,13.862863073730468Q12.678374517822265,13.921563073730468,12.654874517822266,13.978363073730469Q12.631374517822266,14.035063073730468,12.602374517822266,14.08926307373047Q12.573474517822266,14.14336307373047,12.539374517822266,14.19446307373047Q12.505174517822265,14.24556307373047,12.466274517822265,14.29296307373047Q12.427274517822266,14.340463073730469,12.383874517822266,14.383863073730469ZM13.986074517822265,17.763763073730466L6.236114517822266,10.01375307373047Q6.192694517822265,9.970333073730469,6.153734517822266,9.922863073730468Q6.114774517822266,9.875393073730468,6.080664517822266,9.824333073730468Q6.046544517822266,9.773273073730468,6.017594517822266,9.719123073730469Q5.988644517822266,9.664963073730469,5.9651445178222655,9.608223073730468Q5.941644517822265,9.55149307373047,5.923824517822266,9.49273307373047Q5.905994517822266,9.43396307373047,5.894014517822265,9.373733073730468Q5.882034517822266,9.31350307373047,5.876014517822266,9.252393073730468Q5.869994517822265,9.19128307373047,5.869994517822265,9.129873073730469Q5.869994517822265,9.068463073730468,5.876014517822266,9.007353073730469Q5.882034517822266,8.946243073730468,5.894014517822265,8.886013073730469Q5.905994517822266,8.825783073730468,5.923824517822266,8.767013073730467Q5.941654517822266,8.708253073730468,5.965154517822265,8.65152307373047Q5.988654517822265,8.594783073730468,6.017594517822266,8.540623073730469Q6.046544517822266,8.486473073730469,6.080664517822266,8.43541307373047Q6.114774517822266,8.38435307373047,6.153734517822266,8.336883073730469Q6.192694517822265,8.289413073730469,6.236114517822266,8.24599307373047Q6.279534517822266,8.20257307373047,6.327004517822266,8.163613073730469Q6.374474517822265,8.12465307373047,6.425534517822266,8.09053307373047Q6.4765945178222655,8.056423073730468,6.530754517822266,8.02747307373047Q6.5849145178222654,7.9985230737304684,6.641644517822265,7.975023073730469Q6.698374517822265,7.951523073730469,6.757144517822265,7.933703073730468Q6.815904517822266,7.915873073730468,6.8761345178222655,7.903893073730469Q6.936364517822265,7.891913073730469,6.9974745178222655,7.885893073730469Q7.058594517822265,7.879873073730469,7.120004517822266,7.879873073730469Q7.181404517822266,7.879873073730469,7.2425245178222655,7.885893073730469Q7.303634517822266,7.891913073730469,7.3638645178222655,7.903893073730469Q7.424094517822265,7.915873073730468,7.482854517822266,7.933703073730468Q7.541624517822266,7.951523073730469,7.598354517822266,7.975023073730469Q7.6550845178222655,7.9985230737304684,7.709244517822266,8.02747307373047Q7.7634045178222655,8.056423073730468,7.814464517822266,8.090543073730469Q7.865524517822266,8.12465307373047,7.912994517822265,8.163613073730469Q7.960464517822266,8.20257307373047,8.003884517822264,8.24599307373047L15.753874517822265,15.995963073730469Q15.797274517822265,16.039463073730467,15.836274517822266,16.08686307373047Q15.875174517822266,16.13436307373047,15.909374517822265,16.185463073730467Q15.943474517822265,16.23646307373047,15.972374517822265,16.29066307373047Q16.001374517822263,16.34476307373047,16.024874517822266,16.40156307373047Q16.048374517822268,16.45826307373047,16.066174517822265,16.51706307373047Q16.083974517822266,16.57576307373047,16.095974517822263,16.63606307373047Q16.107974517822264,16.69626307373047,16.113974517822264,16.757363073730467Q16.119974517822264,16.81846307373047,16.119974517822264,16.87986307373047Q16.119974517822264,16.941263073730468,16.113974517822264,17.00236307373047Q16.107974517822264,17.06356307373047,16.095974517822263,17.12376307373047Q16.083974517822266,17.183963073730467,16.066174517822265,17.24276307373047Q16.048374517822268,17.301463073730467,16.024874517822266,17.35826307373047Q16.001374517822263,17.41496307373047,15.972374517822265,17.46916307373047Q15.943474517822265,17.52326307373047,15.909374517822265,17.574363073730467Q15.875174517822266,17.62546307373047,15.836274517822266,17.67286307373047Q15.797274517822265,17.720363073730468,15.753874517822265,17.763763073730466Q15.710474517822266,17.807163073730468,15.662974517822265,17.84616307373047Q15.615474517822266,17.88506307373047,15.564474517822266,17.91926307373047Q15.513374517822266,17.95336307373047,15.459274517822266,17.98226307373047Q15.405074517822266,18.01126307373047,15.348374517822265,18.03476307373047Q15.291574517822266,18.05826307373047,15.232874517822266,18.07606307373047Q15.174074517822266,18.093863073730468,15.113874517822266,18.105863073730468Q15.053674517822266,18.11786307373047,14.992474517822266,18.12386307373047Q14.931374517822265,18.12986307373047,14.869974517822266,18.12986307373047Q14.808574517822265,18.12986307373047,14.747474517822265,18.12386307373047Q14.686374517822266,18.11786307373047,14.626174517822266,18.105863073730468Q14.565874517822266,18.093863073730468,14.507174517822266,18.07606307373047Q14.448374517822266,18.05826307373047,14.391674517822265,18.03476307373047Q14.334874517822266,18.01126307373047,14.280774517822266,17.98226307373047Q14.226574517822266,17.95336307373047,14.175574517822266,17.91926307373047Q14.124474517822266,17.88506307373047,14.076974517822265,17.84616307373047Q14.029574517822265,17.807163073730468,13.986074517822265,17.763763073730466ZM20.999974517822267,23.24996307373047L9.000004517822266,23.24996307373047Q8.938594517822265,23.24996307373047,8.877484517822266,23.24396307373047Q8.816374517822265,23.23796307373047,8.756144517822266,23.22596307373047Q8.695914517822265,23.21396307373047,8.637144517822264,23.196163073730467Q8.578384517822265,23.17836307373047,8.521644517822265,23.154863073730468Q8.464914517822265,23.13136307373047,8.410754517822266,23.10236307373047Q8.356604517822266,23.07346307373047,8.305544517822266,23.03936307373047Q8.254484517822267,23.00516307373047,8.207014517822266,22.96626307373047Q8.159544517822265,22.92726307373047,8.116124517822264,22.88386307373047Q8.072694517822265,22.84046307373047,8.033744517822266,22.79296307373047Q7.994784517822266,22.74556307373047,7.9606645178222655,22.694463073730468Q7.926544517822266,22.64336307373047,7.897604517822265,22.589263073730468Q7.868654517822265,22.53506307373047,7.845154517822266,22.47836307373047Q7.821654517822266,22.421663073730468,7.803824517822266,22.36286307373047Q7.786004517822265,22.304063073730468,7.774024517822266,22.24386307373047Q7.7620445178222655,22.183663073730468,7.756024517822266,22.12246307373047Q7.750004517822266,22.06136307373047,7.750004517822266,21.99996307373047Q7.750004517822266,21.938563073730467,7.756024517822266,21.877463073730468Q7.7620445178222655,21.816363073730468,7.774024517822266,21.75616307373047Q7.786004517822265,21.695863073730468,7.803824517822266,21.63716307373047Q7.821654517822266,21.57836307373047,7.845154517822266,21.52166307373047Q7.868654517822265,21.46486307373047,7.897604517822265,21.410763073730468Q7.926544517822266,21.35656307373047,7.9606645178222655,21.305563073730468Q7.994784517822266,21.25446307373047,8.033744517822266,21.206963073730467Q8.072694517822265,21.159563073730467,8.116124517822264,21.11606307373047Q8.159544517822265,21.072663073730467,8.207014517822266,21.03376307373047Q8.254484517822267,20.994763073730468,8.305544517822266,20.96066307373047Q8.356604517822266,20.92656307373047,8.410754517822266,20.89756307373047Q8.464914517822265,20.86866307373047,8.521644517822265,20.84516307373047Q8.578384517822265,20.82166307373047,8.637144517822264,20.80386307373047Q8.695914517822265,20.785963073730468,8.756144517822266,20.773963073730467Q8.816374517822265,20.76206307373047,8.877484517822266,20.75596307373047Q8.938594517822265,20.74996307373047,9.000004517822266,20.74996307373047L20.999974517822267,20.74996307373047Q21.061374517822266,20.74996307373047,21.122574517822265,20.75596307373047Q21.183674517822265,20.76206307373047,21.243874517822267,20.773963073730467Q21.304074517822265,20.785963073730468,21.362874517822267,20.80386307373047Q21.421574517822265,20.82166307373047,21.478374517822267,20.84516307373047Q21.535074517822267,20.86866307373047,21.589274517822265,20.89756307373047Q21.643374517822267,20.92656307373047,21.694474517822265,20.96066307373047Q21.745474517822267,20.994763073730468,21.792974517822266,21.03376307373047Q21.840474517822265,21.072663073730467,21.883874517822267,21.11606307373047Q21.927274517822266,21.159563073730467,21.966274517822267,21.206963073730467Q22.005174517822265,21.25446307373047,22.039374517822267,21.305563073730468Q22.073474517822266,21.35656307373047,22.102374517822266,21.410763073730468Q22.131374517822266,21.46486307373047,22.154874517822265,21.52166307373047Q22.178374517822267,21.57836307373047,22.196174517822264,21.63716307373047Q22.213974517822265,21.695863073730468,22.225974517822266,21.75616307373047Q22.237974517822266,21.816363073730468,22.243974517822267,21.877463073730468Q22.249974517822267,21.938563073730467,22.249974517822267,21.99996307373047Q22.249974517822267,22.06136307373047,22.243974517822267,22.12246307373047Q22.237974517822266,22.183663073730468,22.225974517822266,22.24386307373047Q22.213974517822265,22.304063073730468,22.196174517822264,22.36286307373047Q22.178374517822267,22.421663073730468,22.154874517822265,22.47836307373047Q22.131374517822266,22.53506307373047,22.102374517822266,22.589263073730468Q22.073474517822266,22.64336307373047,22.039374517822267,22.694463073730468Q22.005174517822265,22.74556307373047,21.966274517822267,22.79296307373047Q21.927274517822266,22.84046307373047,21.883874517822267,22.88386307373047Q21.840474517822265,22.92726307373047,21.792974517822266,22.96626307373047Q21.745574517822266,23.00516307373047,21.694474517822265,23.03936307373047Q21.643374517822267,23.07346307373047,21.589274517822265,23.10236307373047Q21.535074517822267,23.13136307373047,21.478374517822267,23.154863073730468Q21.421574517822265,23.17836307373047,21.362874517822267,23.196163073730467Q21.304074517822265,23.21396307373047,21.243874517822267,23.22596307373047Q21.183674517822265,23.23796307373047,21.122574517822265,23.24396307373047Q21.061374517822266,23.24996307373047,20.999974517822267,23.24996307373047ZM3.7900545178222655,14.227663073730469Q3.2824745178222656,14.730863073730468,3.2824745178222656,15.456263073730469Q3.2824745178222656,16.18476307373047,3.7938545178222656,16.69606307373047L7.303864517822266,20.20606307373047Q7.815254517822265,20.717463073730467,8.543734517822266,20.717463073730467Q9.269074517822265,20.717463073730467,9.772344517822265,20.209863073730467L20.206074517822266,9.776113073730468Q20.717474517822264,9.26471307373047,20.717474517822264,8.536213073730469Q20.717474517822264,7.810873073730469,20.209874517822264,7.307633073730469L16.696074517822268,3.7938430737304687Q16.184774517822266,3.2824630737304688,15.456274517822266,3.2824630737304688Q14.730874517822265,3.2824630737304688,14.227674517822265,3.7900430737304687L3.7938545178222656,14.223863073730469L3.7900545178222655,14.227663073730469ZM2.0260910978222655,12.45606307373047L12.452374517822266,2.0298821937304687Q13.689074517822265,0.7824630737304688,15.456274517822266,0.7824630737304688Q17.220274517822265,0.7824630737304688,18.463874517822266,2.026080133730469L21.970074517822265,5.532293073730469Q23.217474517822264,6.769053073730468,23.217474517822264,8.536213073730469Q23.217474517822264,10.30023307373047,21.973874517822267,11.543873073730468L11.547664517822266,21.97006307373047Q10.310884517822265,23.217463073730467,8.543734517822266,23.217463073730467Q6.779714517822265,23.217463073730467,5.536104517822265,21.97386307373047L2.0260910978222655,18.46386307373047Q0.7824745178222656,17.220263073730468,0.7824745178222656,15.456263073730469Q0.7824745178222656,13.689063073730468,2.029892797822266,12.452363073730469L2.0260910978222655,12.45606307373047ZM12.749974517822265,13.499963073730468Q12.749974517822265,13.561363073730469,12.743974517822265,13.622563073730468Q12.737974517822266,13.683663073730468,12.725974517822266,13.743863073730468Q12.713974517822265,13.804063073730468,12.696174517822266,13.862863073730468Q12.678374517822265,13.921563073730468,12.654874517822266,13.978363073730469Q12.631374517822266,14.035063073730468,12.602374517822266,14.08926307373047Q12.573474517822266,14.14336307373047,12.539374517822266,14.19446307373047Q12.505174517822265,14.245463073730468,12.466274517822265,14.29296307373047Q12.427274517822266,14.340463073730469,12.383874517822266,14.383863073730469Q12.340474517822265,14.427263073730469,12.292974517822266,14.466263073730468Q12.245474517822265,14.505163073730468,12.194474517822266,14.539363073730469Q12.143374517822267,14.57346307373047,12.089274517822266,14.60236307373047Q12.035074517822265,14.63136307373047,11.978354517822266,14.65486307373047Q11.921624517822266,14.678363073730468,11.862854517822266,14.69616307373047Q11.804094517822266,14.713963073730469,11.743864517822265,14.725963073730469Q11.683634517822266,14.73796307373047,11.622524517822265,14.743963073730468Q11.561414517822266,14.749963073730468,11.500004517822266,14.749963073730468Q11.438594517822265,14.749963073730468,11.377484517822266,14.743963073730468Q11.316364517822265,14.73796307373047,11.256144517822266,14.725963073730469Q11.195914517822265,14.713963073730469,11.137144517822266,14.69616307373047Q11.078384517822265,14.678363073730468,11.021644517822265,14.65486307373047Q10.964914517822265,14.63136307373047,10.910754517822266,14.60236307373047Q10.856604517822266,14.57346307373047,10.805544517822266,14.539363073730469Q10.754484517822265,14.505163073730468,10.707014517822266,14.466263073730468Q10.659544517822265,14.427263073730469,10.616124517822266,14.383863073730469Q10.572694517822265,14.340463073730469,10.533744517822266,14.29296307373047Q10.494784517822266,14.24556307373047,10.460664517822266,14.19446307373047Q10.426554517822266,14.14336307373047,10.397604517822266,14.08926307373047Q10.368654517822266,14.035063073730468,10.345154517822266,13.978363073730469Q10.321654517822266,13.921563073730468,10.303824517822266,13.862863073730468Q10.286004517822265,13.804063073730468,10.274024517822266,13.743863073730468Q10.262044517822266,13.683663073730468,10.256024517822265,13.622563073730468Q10.250004517822266,13.561363073730469,10.250004517822266,13.499963073730468Q10.250004517822266,13.438563073730469,10.256024517822265,13.37746307373047Q10.262044517822266,13.316363073730468,10.274024517822266,13.256163073730468Q10.286004517822265,13.195863073730468,10.303824517822266,13.137163073730468Q10.321654517822266,13.078363073730468,10.345154517822266,13.021663073730469Q10.368654517822266,12.964863073730468,10.397604517822266,12.910763073730468Q10.426554517822266,12.856563073730468,10.460664517822266,12.805563073730468Q10.494784517822266,12.754463073730468,10.533744517822266,12.706963073730469Q10.572694517822265,12.65956307373047,10.616124517822266,12.61606307373047Q10.659544517822265,12.57266307373047,10.707014517822266,12.53376307373047Q10.754484517822265,12.49476307373047,10.805544517822266,12.460663073730469Q10.856604517822266,12.426563073730469,10.910754517822266,12.397563073730469Q10.964914517822265,12.368663073730469,11.021644517822265,12.345163073730468Q11.078384517822265,12.321663073730468,11.137144517822266,12.303863073730469Q11.195914517822265,12.28596307373047,11.256144517822266,12.273963073730469Q11.316364517822265,12.262063073730468,11.377484517822266,12.255963073730468Q11.438594517822265,12.249963073730468,11.500004517822266,12.249963073730468Q11.561414517822266,12.249963073730468,11.622524517822265,12.255963073730468Q11.683634517822266,12.262063073730468,11.743864517822265,12.273963073730469Q11.804094517822266,12.28596307373047,11.862854517822266,12.303863073730469Q11.921624517822266,12.321663073730468,11.978354517822266,12.345163073730468Q12.035074517822265,12.368663073730469,12.089274517822266,12.397563073730469Q12.143374517822267,12.426563073730469,12.194474517822266,12.460663073730469Q12.245474517822265,12.49476307373047,12.292974517822266,12.53376307373047Q12.340474517822265,12.57266307373047,12.383874517822266,12.61606307373047Q12.427274517822266,12.65956307373047,12.466274517822265,12.706963073730469Q12.505174517822265,12.754463073730468,12.539374517822266,12.805563073730468Q12.573474517822266,12.856563073730468,12.602374517822266,12.910763073730468Q12.631374517822266,12.964863073730468,12.654874517822266,13.021663073730469Q12.678374517822265,13.078363073730468,12.696174517822266,13.137163073730468Q12.713974517822265,13.195863073730468,12.725974517822266,13.256163073730468Q12.737974517822266,13.316363073730468,12.743974517822265,13.37746307373047Q12.749974517822265,13.438563073730469,12.749974517822265,13.499963073730468ZM6.750004517822266,19.49996307373047Q6.750004517822266,19.56136307373047,6.743984517822265,19.62246307373047Q6.737964517822266,19.683663073730468,6.7259845178222655,19.74386307373047Q6.714004517822266,19.804063073730468,6.696184517822266,19.86286307373047Q6.678354517822266,19.921563073730468,6.654854517822265,19.97836307373047Q6.631354517822266,20.03506307373047,6.602404517822266,20.089263073730468Q6.573454517822266,20.14336307373047,6.539344517822266,20.194463073730468Q6.505224517822265,20.24546307373047,6.466264517822266,20.29296307373047Q6.427304517822265,20.34046307373047,6.383884517822265,20.38386307373047Q6.340464517822266,20.42726307373047,6.292994517822265,20.46626307373047Q6.245524517822266,20.50516307373047,6.194464517822266,20.53936307373047Q6.143404517822265,20.57346307373047,6.0892545178222655,20.60236307373047Q6.035094517822266,20.63136307373047,5.9783545178222655,20.654863073730468Q5.9216245178222655,20.67836307373047,5.862864517822265,20.696163073730467Q5.804094517822266,20.71396307373047,5.743864517822265,20.72596307373047Q5.683634517822266,20.73796307373047,5.622524517822265,20.74396307373047Q5.561414517822266,20.74996307373047,5.500004517822266,20.74996307373047Q5.438594517822265,20.74996307373047,5.377484517822266,20.74396307373047Q5.316374517822266,20.73796307373047,5.256144517822266,20.72596307373047Q5.195914517822265,20.71396307373047,5.137144517822266,20.696163073730467Q5.078384517822266,20.67836307373047,5.021644517822265,20.654863073730468Q4.964914517822265,20.63136307373047,4.910754517822266,20.60236307373047Q4.856604517822266,20.57346307373047,4.805544517822266,20.53936307373047Q4.754484517822266,20.50516307373047,4.707014517822266,20.46626307373047Q4.659544517822265,20.42726307373047,4.616124517822266,20.38386307373047Q4.572694517822265,20.34046307373047,4.5337445178222655,20.29296307373047Q4.494784517822266,20.24546307373047,4.4606645178222655,20.194463073730468Q4.426554517822266,20.14336307373047,4.397604517822266,20.089263073730468Q4.368654517822266,20.03506307373047,4.345154517822266,19.97836307373047Q4.321654517822266,19.921563073730468,4.303824517822266,19.86286307373047Q4.286004517822265,19.804063073730468,4.274024517822266,19.74386307373047Q4.2620445178222655,19.683663073730468,4.256024517822265,19.62246307373047Q4.250004517822266,19.56136307373047,4.250004517822266,19.49996307373047Q4.250004517822266,19.438563073730467,4.256024517822265,19.377463073730468Q4.2620445178222655,19.316363073730468,4.274024517822266,19.25616307373047Q4.286004517822265,19.195863073730468,4.303824517822266,19.13716307373047Q4.321654517822266,19.07836307373047,4.345154517822266,19.02166307373047Q4.368654517822266,18.96486307373047,4.397604517822266,18.910763073730468Q4.426554517822266,18.85656307373047,4.4606645178222655,18.805563073730468Q4.494784517822266,18.75446307373047,4.5337445178222655,18.706963073730467Q4.572694517822265,18.659563073730467,4.616124517822266,18.61606307373047Q4.659544517822265,18.572663073730467,4.707014517822266,18.53376307373047Q4.754484517822266,18.494763073730468,4.805544517822266,18.46066307373047Q4.856604517822266,18.42656307373047,4.910754517822266,18.39756307373047Q4.964914517822265,18.36866307373047,5.021644517822265,18.34516307373047Q5.078384517822266,18.32166307373047,5.137144517822266,18.30386307373047Q5.195914517822265,18.285963073730468,5.256144517822266,18.273963073730467Q5.316374517822266,18.26206307373047,5.377484517822266,18.25596307373047Q5.438594517822265,18.24996307373047,5.500004517822266,18.24996307373047Q5.561414517822266,18.24996307373047,5.622524517822265,18.25596307373047Q5.683634517822266,18.26206307373047,5.743864517822265,18.273963073730467Q5.804094517822266,18.285963073730468,5.8628545178222655,18.30386307373047Q5.9216245178222655,18.32166307373047,5.9783545178222655,18.34516307373047Q6.035094517822266,18.36866307373047,6.089244517822266,18.39756307373047Q6.143404517822265,18.42656307373047,6.194464517822266,18.46066307373047Q6.245524517822266,18.494763073730468,6.292994517822265,18.53376307373047Q6.340464517822266,18.572663073730467,6.383884517822265,18.61606307373047Q6.427304517822265,18.659563073730467,6.466264517822266,18.706963073730467Q6.505224517822265,18.75446307373047,6.539344517822266,18.805563073730468Q6.573454517822266,18.85656307373047,6.602404517822266,18.910763073730468Q6.631354517822266,18.96486307373047,6.654854517822265,19.02166307373047Q6.678354517822266,19.07836307373047,6.696174517822266,19.13716307373047Q6.714004517822266,19.195863073730468,6.7259845178222655,19.25616307373047Q6.737964517822266,19.316363073730468,6.743984517822265,19.377463073730468Q6.750004517822266,19.438563073730467,6.750004517822266,19.49996307373047ZM22.249974517822267,21.99996307373047Q22.249974517822267,22.06136307373047,22.243974517822267,22.12246307373047Q22.237974517822266,22.183663073730468,22.225974517822266,22.24386307373047Q22.213974517822265,22.304063073730468,22.196174517822264,22.36286307373047Q22.178374517822267,22.421663073730468,22.154874517822265,22.47836307373047Q22.131374517822266,22.53506307373047,22.102374517822266,22.589263073730468Q22.073474517822266,22.64336307373047,22.039374517822267,22.694463073730468Q22.005174517822265,22.74556307373047,21.966274517822267,22.79296307373047Q21.927274517822266,22.84046307373047,21.883874517822267,22.88386307373047Q21.840474517822265,22.92726307373047,21.792974517822266,22.96626307373047Q21.745574517822266,23.00516307373047,21.694474517822265,23.03936307373047Q21.643374517822267,23.07346307373047,21.589274517822265,23.10236307373047Q21.535074517822267,23.13136307373047,21.478374517822267,23.154863073730468Q21.421574517822265,23.17836307373047,21.362874517822267,23.196163073730467Q21.304074517822265,23.21396307373047,21.243874517822267,23.22596307373047Q21.183674517822265,23.23796307373047,21.122574517822265,23.24396307373047Q21.061374517822266,23.24996307373047,20.999974517822267,23.24996307373047Q20.938574517822264,23.24996307373047,20.877474517822264,23.24396307373047Q20.816374517822265,23.23796307373047,20.756174517822267,23.22596307373047Q20.695874517822265,23.21396307373047,20.637174517822267,23.196163073730467Q20.578374517822265,23.17836307373047,20.521674517822266,23.154863073730468Q20.464874517822267,23.13136307373047,20.410774517822265,23.10236307373047Q20.356574517822267,23.07346307373047,20.305574517822265,23.03936307373047Q20.254474517822267,23.00516307373047,20.206974517822264,22.96626307373047Q20.159574517822264,22.92726307373047,20.116074517822266,22.88386307373047Q20.072674517822264,22.84046307373047,20.033774517822266,22.79296307373047Q19.994774517822265,22.74556307373047,19.960674517822266,22.694463073730468Q19.926574517822267,22.64336307373047,19.897574517822267,22.589263073730468Q19.868674517822267,22.53506307373047,19.845174517822265,22.47836307373047Q19.821674517822267,22.421663073730468,19.803874517822265,22.36286307373047Q19.785974517822265,22.304063073730468,19.773974517822264,22.24386307373047Q19.762074517822267,22.183663073730468,19.755974517822267,22.12246307373047Q19.749974517822267,22.06136307373047,19.749974517822267,21.99996307373047Q19.749974517822267,21.938563073730467,19.755974517822267,21.877463073730468Q19.762074517822267,21.816363073730468,19.773974517822264,21.75616307373047Q19.785974517822265,21.695863073730468,19.803874517822265,21.63716307373047Q19.821674517822267,21.57836307373047,19.845174517822265,21.52166307373047Q19.868674517822267,21.46486307373047,19.897574517822267,21.410763073730468Q19.926574517822267,21.35656307373047,19.960674517822266,21.305563073730468Q19.994774517822265,21.25446307373047,20.033774517822266,21.206963073730467Q20.072674517822264,21.159563073730467,20.116074517822266,21.11606307373047Q20.159574517822264,21.072663073730467,20.206974517822264,21.03376307373047Q20.254474517822267,20.994763073730468,20.305574517822265,20.96066307373047Q20.356574517822267,20.92656307373047,20.410774517822265,20.89756307373047Q20.464874517822267,20.86866307373047,20.521674517822266,20.84516307373047Q20.578374517822265,20.82166307373047,20.637174517822267,20.80386307373047Q20.695874517822265,20.785963073730468,20.756174517822267,20.773963073730467Q20.816374517822265,20.76206307373047,20.877474517822264,20.75596307373047Q20.938574517822264,20.74996307373047,20.999974517822267,20.74996307373047Q21.061374517822266,20.74996307373047,21.122574517822265,20.75596307373047Q21.183674517822265,20.76206307373047,21.243874517822267,20.773963073730467Q21.304074517822265,20.785963073730468,21.362874517822267,20.80386307373047Q21.421574517822265,20.82166307373047,21.478374517822267,20.84516307373047Q21.535074517822267,20.86866307373047,21.589274517822265,20.89756307373047Q21.643374517822267,20.92656307373047,21.694474517822265,20.96066307373047Q21.745474517822267,20.994763073730468,21.792974517822266,21.03376307373047Q21.840474517822265,21.072663073730467,21.883874517822267,21.11606307373047Q21.927274517822266,21.159563073730467,21.966274517822267,21.206963073730467Q22.005174517822265,21.25446307373047,22.039374517822267,21.305563073730468Q22.073474517822266,21.35656307373047,22.102374517822266,21.410763073730468Q22.131374517822266,21.46486307373047,22.154874517822265,21.52166307373047Q22.178374517822267,21.57836307373047,22.196174517822264,21.63716307373047Q22.213974517822265,21.695863073730468,22.225974517822266,21.75616307373047Q22.237974517822266,21.816363073730468,22.243974517822267,21.877463073730468Q22.249974517822267,21.938563073730467,22.249974517822267,21.99996307373047ZM16.119974517822264,16.87986307373047Q16.119974517822264,16.941263073730468,16.113974517822264,17.00236307373047Q16.107974517822264,17.06356307373047,16.095974517822263,17.12376307373047Q16.083974517822266,17.183963073730467,16.066174517822265,17.24276307373047Q16.048374517822268,17.301463073730467,16.024874517822266,17.35826307373047Q16.001374517822263,17.41496307373047,15.972374517822265,17.46916307373047Q15.943474517822265,17.52326307373047,15.909374517822265,17.574363073730467Q15.875174517822266,17.62536307373047,15.836274517822266,17.67286307373047Q15.797274517822265,17.720363073730468,15.753874517822265,17.763763073730466Q15.710474517822266,17.807163073730468,15.662974517822265,17.84616307373047Q15.615474517822266,17.88506307373047,15.564474517822266,17.91926307373047Q15.513374517822266,17.95336307373047,15.459274517822266,17.98226307373047Q15.405074517822266,18.01126307373047,15.348374517822265,18.03476307373047Q15.291574517822266,18.05826307373047,15.232874517822266,18.07606307373047Q15.174074517822266,18.093863073730468,15.113874517822266,18.105863073730468Q15.053674517822266,18.11786307373047,14.992474517822266,18.12386307373047Q14.931374517822265,18.12986307373047,14.869974517822266,18.12986307373047Q14.808574517822265,18.12986307373047,14.747474517822265,18.12386307373047Q14.686374517822266,18.11786307373047,14.626174517822266,18.105863073730468Q14.565874517822266,18.093863073730468,14.507174517822266,18.07606307373047Q14.448374517822266,18.05826307373047,14.391674517822265,18.03476307373047Q14.334874517822266,18.01126307373047,14.280774517822266,17.98226307373047Q14.226574517822266,17.95336307373047,14.175574517822266,17.91926307373047Q14.124474517822266,17.88506307373047,14.076974517822265,17.84616307373047Q14.029574517822265,17.807163073730468,13.986074517822265,17.763763073730466Q13.942674517822265,17.720363073730468,13.903774517822265,17.67286307373047Q13.864774517822266,17.62536307373047,13.830674517822265,17.574363073730467Q13.796574517822265,17.52326307373047,13.767574517822265,17.46916307373047Q13.738674517822266,17.41496307373047,13.715174517822266,17.35826307373047Q13.691674517822266,17.301463073730467,13.673774517822265,17.24276307373047Q13.655974517822266,17.183963073730467,13.643974517822265,17.12376307373047Q13.632074517822266,17.06356307373047,13.625974517822266,17.00236307373047Q13.619974517822266,16.941263073730468,13.619974517822266,16.87986307373047Q13.619974517822266,16.81846307373047,13.625974517822266,16.757363073730467Q13.632074517822266,16.69626307373047,13.643974517822265,16.63606307373047Q13.655974517822266,16.57576307373047,13.673774517822265,16.51706307373047Q13.691674517822266,16.45826307373047,13.715174517822266,16.40156307373047Q13.738674517822266,16.34476307373047,13.767574517822265,16.29066307373047Q13.796574517822265,16.23646307373047,13.830674517822265,16.185463073730467Q13.864774517822266,16.13436307373047,13.903774517822265,16.08686307373047Q13.942674517822265,16.039463073730467,13.986074517822265,15.995963073730469Q14.029574517822265,15.952563073730468,14.076974517822265,15.913663073730469Q14.124474517822266,15.874663073730469,14.175574517822266,15.840563073730468Q14.226574517822266,15.806463073730468,14.280774517822266,15.777463073730468Q14.334874517822266,15.74856307373047,14.391674517822265,15.72506307373047Q14.448374517822266,15.701563073730469,14.507174517822266,15.68376307373047Q14.565874517822266,15.665863073730469,14.626174517822266,15.653863073730468Q14.686374517822266,15.64196307373047,14.747474517822265,15.63586307373047Q14.808574517822265,15.62986307373047,14.869974517822266,15.62986307373047Q14.931374517822265,15.62986307373047,14.992474517822266,15.63586307373047Q15.053674517822266,15.64196307373047,15.113874517822266,15.653863073730468Q15.174074517822266,15.665863073730469,15.232874517822266,15.68376307373047Q15.291574517822266,15.701563073730469,15.348374517822265,15.72506307373047Q15.405074517822266,15.74856307373047,15.459274517822266,15.777463073730468Q15.513374517822266,15.806463073730468,15.564474517822266,15.840563073730468Q15.615474517822266,15.874663073730469,15.662974517822265,15.913663073730469Q15.710474517822266,15.952563073730468,15.753874517822265,15.995963073730469Q15.797274517822265,16.039463073730467,15.836274517822266,16.08686307373047Q15.875174517822266,16.13436307373047,15.909374517822265,16.185463073730467Q15.943474517822265,16.23646307373047,15.972374517822265,16.29066307373047Q16.001374517822263,16.34476307373047,16.024874517822266,16.40156307373047Q16.048374517822268,16.45826307373047,16.066174517822265,16.51706307373047Q16.083974517822266,16.57576307373047,16.095974517822263,16.63606307373047Q16.107974517822264,16.69626307373047,16.113974517822264,16.757363073730467Q16.119974517822264,16.81846307373047,16.119974517822264,16.87986307373047ZM10.250004517822266,21.99996307373047Q10.250004517822266,22.06136307373047,10.243984517822266,22.12246307373047Q10.237964517822265,22.183663073730468,10.225984517822265,22.24386307373047Q10.214004517822266,22.304063073730468,10.196174517822266,22.36286307373047Q10.178354517822266,22.421663073730468,10.154854517822265,22.47836307373047Q10.131354517822265,22.53506307373047,10.102404517822265,22.589263073730468Q10.073454517822265,22.64336307373047,10.039344517822265,22.694463073730468Q10.005224517822265,22.74556307373047,9.966264517822266,22.79296307373047Q9.927304517822265,22.84046307373047,9.883884517822265,22.88386307373047Q9.840464517822266,22.92726307373047,9.792994517822265,22.96626307373047Q9.745524517822265,23.00516307373047,9.694464517822265,23.03936307373047Q9.643404517822265,23.07346307373047,9.589254517822265,23.10236307373047Q9.535094517822266,23.13136307373047,9.478354517822265,23.154863073730468Q9.421624517822266,23.17836307373047,9.362854517822266,23.196163073730467Q9.304094517822266,23.21396307373047,9.243864517822265,23.22596307373047Q9.183634517822266,23.23796307373047,9.122524517822265,23.24396307373047Q9.061414517822266,23.24996307373047,9.000004517822266,23.24996307373047Q8.938594517822265,23.24996307373047,8.877484517822266,23.24396307373047Q8.816374517822265,23.23796307373047,8.756144517822266,23.22596307373047Q8.695914517822265,23.21396307373047,8.637144517822264,23.196163073730467Q8.578384517822265,23.17836307373047,8.521644517822265,23.154863073730468Q8.464914517822265,23.13136307373047,8.410754517822266,23.10236307373047Q8.356604517822266,23.07346307373047,8.305544517822266,23.03936307373047Q8.254484517822267,23.00516307373047,8.207014517822266,22.96626307373047Q8.159544517822265,22.92726307373047,8.116124517822264,22.88386307373047Q8.072694517822265,22.84046307373047,8.033744517822266,22.79296307373047Q7.994784517822266,22.74556307373047,7.9606645178222655,22.694463073730468Q7.926544517822266,22.64336307373047,7.897604517822265,22.589263073730468Q7.868654517822265,22.53506307373047,7.845154517822266,22.47836307373047Q7.821654517822266,22.421663073730468,7.803824517822266,22.36286307373047Q7.786004517822265,22.304063073730468,7.774024517822266,22.24386307373047Q7.7620445178222655,22.183663073730468,7.756024517822266,22.12246307373047Q7.750004517822266,22.06136307373047,7.750004517822266,21.99996307373047Q7.750004517822266,21.938563073730467,7.756024517822266,21.877463073730468Q7.7620445178222655,21.816363073730468,7.774024517822266,21.75616307373047Q7.786004517822265,21.695863073730468,7.803824517822266,21.63716307373047Q7.821654517822266,21.57836307373047,7.845154517822266,21.52166307373047Q7.868654517822265,21.46486307373047,7.897604517822265,21.410763073730468Q7.926544517822266,21.35656307373047,7.9606645178222655,21.305563073730468Q7.994784517822266,21.25446307373047,8.033744517822266,21.206963073730467Q8.072694517822265,21.159563073730467,8.116124517822264,21.11606307373047Q8.159544517822265,21.072663073730467,8.207014517822266,21.03376307373047Q8.254484517822267,20.994763073730468,8.305544517822266,20.96066307373047Q8.356604517822266,20.92656307373047,8.410754517822266,20.89756307373047Q8.464914517822265,20.86866307373047,8.521644517822265,20.84516307373047Q8.578384517822265,20.82166307373047,8.637144517822264,20.80386307373047Q8.695914517822265,20.785963073730468,8.756144517822266,20.773963073730467Q8.816374517822265,20.76206307373047,8.877484517822266,20.75596307373047Q8.938594517822265,20.74996307373047,9.000004517822266,20.74996307373047Q9.061414517822266,20.74996307373047,9.122524517822265,20.75596307373047Q9.183634517822266,20.76206307373047,9.243864517822265,20.773963073730467Q9.304094517822266,20.785963073730468,9.362854517822266,20.80386307373047Q9.421624517822266,20.82166307373047,9.478354517822265,20.84516307373047Q9.535094517822266,20.86866307373047,9.589254517822265,20.89756307373047Q9.643404517822265,20.92656307373047,9.694464517822265,20.96066307373047Q9.745524517822265,20.994763073730468,9.792994517822265,21.03376307373047Q9.840464517822266,21.072663073730467,9.883884517822265,21.11606307373047Q9.927304517822265,21.159563073730467,9.966264517822266,21.206963073730467Q10.005224517822265,21.25446307373047,10.039344517822265,21.305563073730468Q10.073454517822265,21.35656307373047,10.102404517822265,21.410763073730468Q10.131354517822265,21.46486307373047,10.154854517822265,21.52166307373047Q10.178354517822266,21.57836307373047,10.196184517822266,21.63716307373047Q10.214004517822266,21.695863073730468,10.225984517822265,21.75616307373047Q10.237964517822265,21.816363073730468,10.243984517822266,21.877463073730468Q10.250004517822266,21.938563073730467,10.250004517822266,21.99996307373047ZM8.369994517822265,9.129873073730469Q8.369994517822265,9.19128307373047,8.363984517822265,9.252393073730468Q8.357964517822266,9.31351307373047,8.345984517822266,9.373733073730468Q8.334004517822265,9.43396307373047,8.316174517822265,9.49273307373047Q8.298344517822265,9.55149307373047,8.274844517822267,9.608233073730469Q8.251344517822265,9.664963073730469,8.222404517822266,9.719123073730469Q8.193454517822266,9.773273073730468,8.159334517822266,9.824333073730468Q8.125214517822265,9.875393073730468,8.086264517822265,9.922863073730468Q8.047304517822266,9.970333073730469,8.003884517822264,10.01376307373047Q7.960464517822266,10.057183073730469,7.912994517822265,10.096133073730469Q7.865524517822266,10.135093073730468,7.814464517822266,10.169213073730468Q7.7634045178222655,10.20333307373047,7.709244517822266,10.232273073730468Q7.6550845178222655,10.261223073730468,7.598354517822266,10.284723073730468Q7.541614517822266,10.308223073730469,7.482854517822266,10.326053073730469Q7.424094517822265,10.34387307373047,7.3638645178222655,10.355853073730469Q7.303634517822266,10.367833073730468,7.2425245178222655,10.37385307373047Q7.181404517822266,10.379873073730469,7.119994517822265,10.379873073730469Q7.058594517822265,10.379873073730469,6.9974745178222655,10.37385307373047Q6.936364517822265,10.367833073730468,6.8761345178222655,10.355853073730469Q6.815904517822266,10.34387307373047,6.757144517822265,10.326053073730469Q6.698374517822265,10.308223073730469,6.641644517822265,10.284723073730468Q6.5849145178222654,10.261223073730468,6.530754517822266,10.232273073730468Q6.4765945178222655,10.20333307373047,6.425534517822266,10.169213073730468Q6.374474517822265,10.135093073730468,6.327004517822266,10.096133073730469Q6.279534517822266,10.057183073730469,6.236114517822266,10.01376307373047Q6.192694517822265,9.970333073730469,6.153734517822266,9.922863073730468Q6.114774517822266,9.875393073730468,6.080664517822266,9.824333073730468Q6.046544517822266,9.773283073730468,6.017594517822266,9.719123073730469Q5.988644517822266,9.664963073730469,5.9651445178222655,9.608233073730469Q5.941644517822265,9.55149307373047,5.923824517822266,9.49273307373047Q5.905994517822266,9.43396307373047,5.894014517822265,9.373733073730468Q5.882034517822266,9.31351307373047,5.876014517822266,9.252393073730468Q5.869994517822265,9.19128307373047,5.869994517822265,9.129873073730469Q5.869994517822265,9.068463073730468,5.876014517822266,9.007353073730469Q5.882034517822266,8.946243073730468,5.894014517822265,8.886013073730469Q5.905994517822266,8.825783073730468,5.923824517822266,8.767023073730469Q5.941644517822265,8.708253073730468,5.9651445178222655,8.65152307373047Q5.988644517822266,8.594783073730468,6.017594517822266,8.540633073730469Q6.046544517822266,8.486473073730469,6.080664517822266,8.43541307373047Q6.114774517822266,8.38435307373047,6.153734517822266,8.336883073730469Q6.192694517822265,8.289413073730469,6.236114517822266,8.24599307373047Q6.279534517822266,8.20257307373047,6.327004517822266,8.163613073730469Q6.374474517822265,8.12465307373047,6.425534517822266,8.09053307373047Q6.4765945178222655,8.056423073730468,6.530754517822266,8.02747307373047Q6.5849145178222654,7.9985230737304684,6.641644517822265,7.975023073730469Q6.698374517822265,7.951523073730469,6.757144517822265,7.933703073730468Q6.815904517822266,7.915873073730468,6.8761345178222655,7.903893073730469Q6.936364517822265,7.891913073730469,6.9974745178222655,7.885893073730469Q7.058594517822265,7.879873073730469,7.119994517822265,7.879873073730469Q7.181404517822266,7.879873073730469,7.2425245178222655,7.885893073730469Q7.303634517822266,7.891913073730469,7.3638645178222655,7.903893073730469Q7.424094517822265,7.915873073730468,7.482854517822266,7.933703073730468Q7.541614517822266,7.951523073730469,7.598354517822266,7.975023073730469Q7.6550845178222655,7.9985230737304684,7.709244517822266,8.02747307373047Q7.7634045178222655,8.056423073730468,7.814464517822266,8.09053307373047Q7.865524517822266,8.12465307373047,7.912994517822265,8.163613073730469Q7.960464517822266,8.20257307373047,8.003884517822264,8.24599307373047Q8.047304517822266,8.289413073730469,8.086264517822265,8.336883073730469Q8.125214517822265,8.38435307373047,8.159334517822266,8.43541307373047Q8.193454517822266,8.486473073730469,8.222404517822266,8.540633073730469Q8.251344517822265,8.594783073730468,8.274844517822267,8.65152307373047Q8.298344517822265,8.708253073730468,8.316174517822265,8.767023073730469Q8.334004517822265,8.825783073730468,8.345984517822266,8.886013073730469Q8.357964517822266,8.946243073730468,8.363984517822265,9.007353073730469Q8.369994517822265,9.068463073730468,8.369994517822265,9.129873073730469Z"/></g></g></svg>`;
                clearElement.onclick = () => {
                    document.execCommand("removeFormat");
                }

                if (vditor.options.popoverToolbar.bold)         vditor.wysiwyg.popover.insertAdjacentElement("beforeend", boldElement);
                if (vditor.options.popoverToolbar.italic)       vditor.wysiwyg.popover.insertAdjacentElement("beforeend", italicElement);
                if (vditor.options.popoverToolbar.strike)       vditor.wysiwyg.popover.insertAdjacentElement("beforeend", strikeElement);
                if (vditor.options.popoverToolbar.inlineCode)   vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inlineCodeElement);
                if (vditor.options.popoverToolbar.inlineMath)   vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inlineMathElement);
                if (vditor.options.popoverToolbar.clear)        vditor.wysiwyg.popover.insertAdjacentElement("beforeend", clearElement);
                setPopoverPositionByCursorPos(vditor);
            } else {
                vditor.wysiwyg.popover.style.display = "none";
            }
        }

        // 反斜杠特殊处理
        vditor.wysiwyg.element
            .querySelectorAll('span[data-type="backslash"] > span')
            .forEach((item: HTMLElement) => {
                item.style.display = "none";
            });
        const backslashElement = hasClosestByAttribute(range.startContainer, "data-type", "backslash");
        if (backslashElement) {
            backslashElement.querySelector("span").style.display = "inline";
        }


    }, 200);
};

const setPopoverPosition = (vditor: IVditor, element: HTMLElement) => {
    let targetElement = element;
    const tableElement = hasClosestByMatchTag(element, "TABLE");
    if (tableElement) {
        targetElement = tableElement;
    }
    vditor.wysiwyg.popover.style.left = "0";
    vditor.wysiwyg.popover.style.display = "block";
    vditor.wysiwyg.popover.style.top =
        Math.max(-32, targetElement.offsetTop - 32 - vditor.wysiwyg.element.scrollTop) + "px";
    vditor.wysiwyg.popover.style.left =
        Math.min(targetElement.offsetLeft, vditor.wysiwyg.element.clientWidth - vditor.wysiwyg.popover.clientWidth) + "px";
    vditor.wysiwyg.popover.setAttribute("data-top", (targetElement.offsetTop - 32).toString());
};


const setPopoverPositionByCursorPos = (vditor: IVditor) => {
    const position = getCursorPosition(vditor[vditor.currentMode].element)
    vditor.wysiwyg.popover.style.left = "0";
    vditor.wysiwyg.popover.style.display = "block";
    vditor.wysiwyg.popover.style.top =
        Math.max(-32, position.top + vditor.wysiwyg.element.scrollTop - 32 - vditor.wysiwyg.element.scrollTop) + "px";
    vditor.wysiwyg.popover.style.left =
        Math.min(position.left - 10, vditor.wysiwyg.element.clientWidth - vditor.wysiwyg.popover.clientWidth) + "px";
    vditor.wysiwyg.popover.setAttribute("data-top", (position.top + vditor.wysiwyg.element.scrollTop - 32).toString());

}

export const genLinkRefPopover = (vditor: IVditor, linkRefElement: HTMLElement, range = getSelection().getRangeAt(0)) => {
    vditor.wysiwyg.popover.innerHTML = "";
    const updateLinkRef = () => {
        if (input.value.trim() !== "") {
            if (linkRefElement.tagName === "IMG") {
                linkRefElement.setAttribute("alt", input.value);
            } else {
                linkRefElement.textContent = input.value;
            }
        }
        // data-link-label
        if (input1.value.trim() !== "") {
            linkRefElement.setAttribute("data-link-label", input1.value);
        }
    };

    const inputWrap = document.createElement("span");
    inputWrap.setAttribute("aria-label", window.VditorI18n.textIsNotEmpty);
    inputWrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const input = document.createElement("input");
    inputWrap.appendChild(input);
    input.className = "vditor-input";
    input.setAttribute("placeholder", window.VditorI18n.textIsNotEmpty);
    input.style.width = "120px";
    input.value =
        linkRefElement.getAttribute("alt") || linkRefElement.textContent;
    input.oninput = () => {
        updateLinkRef();
    };
    input.onkeydown = (event) => {
        if (removeBlockElement(vditor, event)) {
            return;
        }
        if (focusToElement(event, range)) {
            return;
        }
        linkHotkey(vditor, linkRefElement, event, input1);
    };

    const input1Wrap = document.createElement("span");
    input1Wrap.setAttribute("aria-label", window.VditorI18n.linkRef);
    input1Wrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const input1 = document.createElement("input");
    input1Wrap.appendChild(input1);
    input1.className = "vditor-input";
    input1.setAttribute("placeholder", window.VditorI18n.linkRef);
    input1.value = linkRefElement.getAttribute("data-link-label");
    input1.oninput = () => {
        updateLinkRef();
    };
    input1.onkeydown = (event) => {
        if (removeBlockElement(vditor, event)) {
            return;
        }
        if (focusToElement(event, range)) {
            return;
        }
        linkHotkey(vditor, linkRefElement, event, input);
    };

    genClose(linkRefElement, vditor);
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inputWrap);
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", input1Wrap);
    setPopoverPosition(vditor, linkRefElement);
};

const genUp = (range: Range, element: HTMLElement, vditor: IVditor) => {
    const previousElement = element.previousElementSibling;
    if (
        !previousElement ||
        (!element.parentElement.isEqualNode(vditor.wysiwyg.element) &&
            element.tagName !== "LI")
    ) {
        return;
    }
    const upElement = document.createElement("button");
    upElement.setAttribute("type", "button");
    upElement.setAttribute("data-type", "up");
    upElement.setAttribute("aria-label", window.VditorI18n.up + "<" + updateHotkeyTip("⇧⌘U") + ">");
    upElement.innerHTML = '<svg><use xlink:href="#vditor-icon-up"></use></svg>';
    upElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    upElement.onclick = () => {
        range.insertNode(document.createElement("wbr"));
        previousElement.insertAdjacentElement("beforebegin", element);
        setRangeByWbr(vditor.wysiwyg.element, range);
        afterRenderEvent(vditor);
        highlightToolbarWYSIWYG(vditor);
        scrollCenter(vditor);
    };
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", upElement);
};

const genDown = (range: Range, element: HTMLElement, vditor: IVditor) => {
    const nextElement = element.nextElementSibling;
    if (
        !nextElement ||
        (!element.parentElement.isEqualNode(vditor.wysiwyg.element) &&
            element.tagName !== "LI")
    ) {
        return;
    }
    const downElement = document.createElement("button");
    downElement.setAttribute("type", "button");
    downElement.setAttribute("data-type", "down");
    downElement.setAttribute("aria-label", window.VditorI18n.down + "<" + updateHotkeyTip("⇧⌘D") + ">");
    downElement.innerHTML =
        '<svg><use xlink:href="#vditor-icon-down"></use></svg>';
    downElement.className =
        "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    downElement.onclick = () => {
        range.insertNode(document.createElement("wbr"));
        nextElement.insertAdjacentElement("afterend", element);
        setRangeByWbr(vditor.wysiwyg.element, range);
        afterRenderEvent(vditor);
        highlightToolbarWYSIWYG(vditor);
        scrollCenter(vditor);
    };
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", downElement);
};

const genClose = (element: HTMLElement, vditor: IVditor) => {
    const close = document.createElement("button");
    close.setAttribute("type", "button");
    close.setAttribute("data-type", "remove");
    close.setAttribute("aria-label", window.VditorI18n.remove + "<" + updateHotkeyTip("⇧⌘X") + ">");
    close.innerHTML =
        '<svg><use xlink:href="#vditor-icon-trashcan"></use></svg>';
    close.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    close.onclick = () => {
        const range = getEditorRange(vditor);
        range.setStartAfter(element);
        setSelectionFocus(range);
        element.remove();
        afterRenderEvent(vditor);
        highlightToolbarWYSIWYG(vditor);
        if (["H1", "H2", "H3", "H4", "H5", "H6"].includes(element.tagName)) {
            renderToc(vditor);
        }
    };
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", close);
};

const linkHotkey = (
    vditor: IVditor,
    element: HTMLElement,
    event: KeyboardEvent,
    nextInputElement: HTMLInputElement,
) => {
    if (event.isComposing) {
        return;
    }
    if (event.key === "Tab") {
        nextInputElement.focus();
        nextInputElement.select();
        event.preventDefault();
        return;
    }
    if (
        !isCtrl(event) &&
        !event.shiftKey &&
        event.altKey &&
        event.key === "Enter"
    ) {
        const range = getEditorRange(vditor);
        // firefox 不会打断 link https://github.com/Vanessa219/vditor/issues/193
        element.insertAdjacentHTML("afterend", Constants.ZWSP);
        range.setStartAfter(element.nextSibling);
        range.collapse(true);
        setSelectionFocus(range);
        event.preventDefault();
    }
};

export const genAPopover = (vditor: IVditor, aElement: HTMLElement, range: Range) => {
    vditor.wysiwyg.popover.innerHTML = "";

    const updateA = () => {
        if (input.value.trim() !== "") {
            aElement.innerHTML = input.value;
        }
        if (input1.value.search(/https?\:\/\//) === 0) {
            aElement.setAttribute("href", input1.value);
        } else {
            aElement.setAttribute("href", "ficus://" + input1.value);
        }
        aElement.setAttribute("title", input2.value);
        afterRenderEvent(vditor);
    };

    aElement.querySelectorAll("[data-marker]").forEach((item: HTMLElement) => {
        item.removeAttribute("data-marker");
    });
    const inputWrap = document.createElement("span");
    inputWrap.setAttribute("aria-label", window.VditorI18n.textIsNotEmpty);
    inputWrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const input = document.createElement("input");
    inputWrap.appendChild(input);
    input.className = "vditor-input";
    input.setAttribute("placeholder", window.VditorI18n.textIsNotEmpty);
    input.style.width = "120px";
    input.value = aElement.innerHTML || "";
    input.oninput = () => {
        updateA();
    };
    input.onkeydown = (event) => {
        if (removeBlockElement(vditor, event)) {
            return;
        }
        if (focusToElement(event, range)) {
            return;
        }
        linkHotkey(vditor, aElement, event, input1);
    };

    const input1Wrap = document.createElement("span");
    input1Wrap.setAttribute("aria-label", window.VditorI18n.link);
    input1Wrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const input1 = document.createElement("input");
    input1Wrap.appendChild(input1);
    input1.className = "vditor-input";
    input1.setAttribute("placeholder", window.VditorI18n.link);
    if (aElement.getAttribute("href").indexOf("ficus://") === 0) {
        input1.value = aElement.getAttribute("href").slice('ficus://'.length) || "";
    } else {
        input1.value = aElement.getAttribute("href") || "";
    }
    input1.oninput = () => {
        updateA();
    };
    input1.onkeydown = (event) => {
        if (removeBlockElement(vditor, event)) {
            return;
        }
        // if (focusToElement(event, range)) {
        //     return;
        // }
        // linkHotkey(vditor, aElement, event, input2);
        if (event.isComposing) {
            return;
        }
        if (
            event.key === "Escape" &&
            vditor.hint.element.style.display === "block"
            ) {
                vditor.hint.element.style.display = "none";
                event.preventDefault();
                return;
            }
        vditor.hint.select(event, vditor);
        // focusToElement(event, range);
    };
    input1.onkeyup = async (event) => {
        if (
            event.isComposing ||
            event.key === "Enter" ||
            event.key === "ArrowUp" ||
            event.key === "Escape" ||
            event.key === "ArrowDown"
        ) {
            return;
        }
        const matchingData: IHintData[] = [];
        const key = input1.value.substring(0, input1.selectionStart);
        const hints = await vditor.options.hint.genLinkHint(key);
        for (let i in hints) {
            matchingData.push({
                html: hints[i].trim(),
                value: hints[i].trim(),
            });
        }
        vditor.hint.genHTML(matchingData, key, vditor);
        event.preventDefault();
    };


    const input2Wrap = document.createElement("span");
    input2Wrap.setAttribute("aria-label", window.VditorI18n.tooltipText);
    input2Wrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const input2 = document.createElement("input");
    input2Wrap.appendChild(input2);
    input2.className = "vditor-input";
    input2.setAttribute("placeholder", window.VditorI18n.tooltipText);
    input2.value = aElement.getAttribute("title") || "";
    input2.oninput = () => {
        updateA();
    };
    input2.onkeydown = (event) => {
        if (removeBlockElement(vditor, event)) {
            return;
        }
        if (focusToElement(event, range)) {
            return;
        }
        linkHotkey(vditor, aElement, event, input);
    };

    genClose(aElement, vditor);
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inputWrap);
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", input1Wrap);
    // vditor.wysiwyg.popover.insertAdjacentElement("beforeend", input2Wrap);
    setPopoverPosition(vditor, aElement);
};

export const genImagePopover = (event: Event, vditor: IVditor, img?: HTMLElement) => {
    let imgElement : HTMLImageElement;
    if (img) {
        imgElement = img as HTMLImageElement;
    } else {
        imgElement = event.target as HTMLImageElement;
    }
    
    if (imgElement.getAttribute("src").indexOf("ficus://") !== 0 &&
        imgElement.getAttribute("src").search(/https?\:\/\//) !== 0) {
        imgElement.setAttribute("src", "ficus://" + imgElement.getAttribute("src"));
    }

    vditor.wysiwyg.popover.innerHTML = "";
    const updateImg = () => {
        if (inputElement.value.search(/https?\:\/\//) === 0) {
            imgElement.setAttribute("src", inputElement.value);
        } else {
            imgElement.setAttribute("src", "ficus://" + inputElement.value);
        }
        imgElement.setAttribute("alt", alt.value);
        imgElement.setAttribute("title", title.value);
    };

    const inputWrap = document.createElement("span");
    inputWrap.setAttribute("aria-label", window.VditorI18n.imageURL);
    inputWrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const inputElement = document.createElement("input");
    inputWrap.appendChild(inputElement);
    inputElement.className = "vditor-input";
    inputElement.setAttribute("placeholder", window.VditorI18n.imageURL);
    if (imgElement.getAttribute("src").indexOf("ficus://") === 0) {
        inputElement.value = imgElement.getAttribute("src").slice('ficus://'.length) || "";
    } else {
        inputElement.value = imgElement.getAttribute("src") || "";
    }
    inputElement.oninput = () => {
        updateImg();
    };
    inputElement.onkeydown = (event) => {
        removeBlockElement(vditor, event);
        if (event.isComposing) {
            return;
        }
        if (
            event.key === "Escape" &&
            vditor.hint.element.style.display === "block"
        ) {
            vditor.hint.element.style.display = "none";
            event.preventDefault();
            return;
        }
        vditor.hint.select(event, vditor);
        // focusToElement(event, getEditorRange(vditor));
    };
    inputElement.onkeyup = async (event) => {
        if (
            event.isComposing ||
            event.key === "Enter" ||
            event.key === "ArrowUp" ||
            event.key === "Escape" ||
            event.key === "ArrowDown"
        ) {
            return;
        }
        const matchingData: IHintData[] = [];
        const key = inputElement.value.substring(0, inputElement.selectionStart);
        const hints = await vditor.options.hint.genLinkHint(key);
        for (let i in hints) {
            matchingData.push({
                html: hints[i].trim(),
                value: hints[i].trim(),
            });
        }
        vditor.hint.genHTML(matchingData, key, vditor);
        event.preventDefault();
    };

    const altWrap = document.createElement("span");
    altWrap.setAttribute("aria-label", window.VditorI18n.alternateText);
    altWrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const alt = document.createElement("input");
    altWrap.appendChild(alt);
    alt.className = "vditor-input";
    alt.setAttribute("placeholder", window.VditorI18n.alternateText);
    alt.value = imgElement.getAttribute("alt") || "";
    alt.oninput = () => {
        updateImg();
    };
    alt.onkeydown = (elementEvent) => {
        removeBlockElement(vditor, elementEvent);
    };

    const titleWrap = document.createElement("span");
    titleWrap.setAttribute("aria-label", window.VditorI18n.title);
    titleWrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const title = document.createElement("input");
    titleWrap.appendChild(title);
    title.className = "vditor-input";
    title.setAttribute("placeholder", window.VditorI18n.title);
    title.value = imgElement.getAttribute("title") || "";
    title.oninput = () => {
        updateImg();
    };
    title.onkeydown = (elementEvent) => {
        removeBlockElement(vditor, elementEvent);
    };
    genClose(imgElement, vditor);
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", inputWrap);
    vditor.wysiwyg.popover.insertAdjacentElement("beforeend", altWrap);
    // vditor.wysiwyg.popover.insertAdjacentElement("beforeend", titleWrap);

    setPopoverPosition(vditor, imgElement);
};


const focusToElement = (event: KeyboardEvent, range: Range) => {
    if ((!isCtrl(event) && !event.shiftKey && event.key === "Enter") || event.key === "Escape") {
        if (range) {
            setSelectionFocus(range);
        }
        event.preventDefault();
        event.stopPropagation();
        return true;
    }
};
