import {hasClosestByMatchTag} from "./hasClosest";
import {selectIsEditor} from "./selection";

export const getSelectText = (editor: HTMLElement, range?: Range) => {
    if (selectIsEditor(editor, range)) {
        return getSelection().toString();
    }
    return "";
};

/** 只有wysiwyg才会生效 **/
export const getSelectMD = (vditor: IVditor) => {
    if (vditor.currentMode != 'wysiwyg') {
        return '';
    }

    const range = getSelection().getRangeAt(0);
    if (range.toString() === "") {
        return '';
    }

    if (! selectIsEditor(vditor.wysiwyg.element, range)) {
        return '';
    }

    // 如果选中的是代码块中的内容, 直接返回
    const codeElement = hasClosestByMatchTag(range.startContainer, "CODE");
    const codeEndElement = hasClosestByMatchTag(range.endContainer, "CODE");
    if (codeElement && codeEndElement && codeEndElement.isSameNode(codeElement)) {
        let codeText = "";
        if (codeElement.parentElement.tagName === "PRE") {
            codeText = range.toString();
        } else {
            codeText = "`" + range.toString() + "`";
        }
        return codeText;
    }
    // 如果选中的是链接中的内容, 直接返回
    const aElement = hasClosestByMatchTag(range.startContainer, "A");
    const aEndElement = hasClosestByMatchTag(range.endContainer, "A");
    if (aElement && aEndElement && aEndElement.isSameNode(aElement)) {
        let aTitle = aElement.getAttribute("title") || "";
        if (aTitle) {
            aTitle = ` "${aTitle}"`;
        }
        return `[${range.toString()}](${aElement.getAttribute("href")}${aTitle})`
    }
    // 其他情况, 先获得html, 再转化为markdown
    const tempElement = document.createElement("div");
    tempElement.appendChild(range.cloneContents());
    return vditor.lute.VditorDOM2Md(tempElement.innerHTML).trim()
}

/** 只有wysiwyg才会生效 **/
export const getSelectHTML = (vditor: IVditor) => {
    if (vditor.currentMode != 'wysiwyg') {
        return '';
    }

    const range = getSelection().getRangeAt(0);
    if (range.toString() === "") {
        return '';
    }

    if (! selectIsEditor(vditor.wysiwyg.element, range)) {
        return '';
    }

    // 先转化为markdown, 再转化为html
    const md = getSelectMD(vditor);
    return vditor.lute.Md2HTML(md);
}