export const scrollToHeading = (info: number[], vditor: IVditor) => {
    let cnt = [...info];
    if (vditor.currentMode === "wysiwyg") {
        // 找到对应元素
        let element: Element = document.querySelector('.vditor-wysiwyg > .vditor-reset').firstElementChild;
        for (let i = 0; i < 6; i++) {
            // 如果cnt[i]为-1，说明该级标题不存在, 跳过
            if (cnt[i] === -1) continue;
            // 应找到element后的第cnt[i]+1个i+1级标题
            while(element && element != element.parentElement.lastElementChild) {
                if (element.tagName === `H${i+1}`) cnt[i]--;
                if (cnt[i] === -1) break;
                element = element.nextElementSibling;
            }
        }
        // 滚动到对应位置
        vditor.wysiwyg.element.scrollTop = (element as HTMLElement).offsetTop;
    }
    else if (vditor.currentMode === "sv") {
        // 在左侧编辑栏中找到对应元素
        let svElement: Element = document.querySelector('.vditor-sv').firstElementChild;
        for (let i = 0; i < 6; i++) {
            // 如果cnt[i]为-1，说明该级标题不存在, 跳过
            if (cnt[i] === -1) continue;
            // 应找到svElement后的第cnt[i]+1个i+1级标题
            while(svElement && svElement != svElement.parentElement.lastElementChild) {
                if (svElement.querySelector(`span.h${i+1}`)) cnt[i]--;
                if (cnt[i] === -1) break;
                svElement = svElement.nextElementSibling;
            }
        }
        // 在右侧预览栏中找到对应元素
        cnt = [...info]
        let previewElement: Element = document.querySelector('.vditor-preview > .vditor-reset').firstElementChild;
        for (let i = 0; i < 6; i++) {
            // 如果cnt[i]为-1，说明该级标题不存在, 跳过
            if (cnt[i] === -1) continue;
            // 应找到previewElement后的第cnt[i]+1个i+1级标题
            while(previewElement && previewElement != previewElement.parentElement.lastElementChild) {
                if (previewElement.tagName === `H${i+1}`) cnt[i]--;
                if (cnt[i] === -1) break;
                previewElement = previewElement.nextElementSibling;
            }
        }
        // 滚动到对应位置
        vditor.sv.element.scrollTop = (svElement as HTMLElement).offsetTop;
        vditor.preview.element.scrollTop = (previewElement as HTMLElement).offsetTop;
    }
}

export const scrollToHeading2 = (info: number[], vditor: IVditor) => {
    let cnt = [...info];
    if (vditor.currentMode === "wysiwyg") {
        // 找到对应元素
        let element: Element = document.querySelector('.vditor-wysiwyg > .vditor-reset').firstElementChild;
        for (let i = 0; i < cnt.length; i++) {
            // 寻找第cnt[i+1]个i+1级标题
            let curLevel = 7;
            while (element && element !== element.parentElement.lastElementChild) {
                if (element.tagName.match(/H\d/) 
                        && Number.parseInt(element.tagName[1]) <= curLevel) {
                    curLevel = Number.parseInt(element.tagName[1]);
                    cnt[i]--;
                } 
                if (cnt[i] === -1) {
                    if (i !== cnt.length - 1) element = element.nextElementSibling;
                    break;
                }
                element = element.nextElementSibling;
            }
        }
        // 滚动到对应位置
        vditor.wysiwyg.element.scrollTop = (element as HTMLElement).offsetTop;
    }

    else if (vditor.currentMode === "sv") {
        // 在左侧编辑栏中找到对应元素
        let svElement: Element = document.querySelector('.vditor-sv').firstElementChild;
        for (let i = 0; i < cnt.length; i++) {
            // 应找到svElement后的第cnt[i]+1个i+1级标题
            let curLevel = 7;
            while(svElement && svElement != svElement.parentElement.lastElementChild) {
                if (svElement && svElement.querySelector('.vditor-sv__marker--heading') 
                        && svElement.children[1].className.match(/h\d/) 
                        && Number.parseInt(svElement.children[1].className[1]) <= curLevel) {
                    curLevel = Number.parseInt(svElement.children[1].className[1]);
                    cnt[i]--;
                }
                if (cnt[i] === -1) {
                    if (i !== cnt.length - 1) svElement = svElement.nextElementSibling;
                    break;
                }
                svElement = svElement.nextElementSibling;
            }
        }
        // 在右侧预览栏中找到对应元素
        cnt = [...info]
        let previewElement: Element = document.querySelector('.vditor-preview > .vditor-reset').firstElementChild;
        for (let i = 0; i < cnt.length; i++) {
            // 应找到previewElement后的第cnt[i]+1个i+1级标题
            let curLevel = 7;
            while(previewElement && previewElement != previewElement.parentElement.lastElementChild) {
                console.log(previewElement)
                if (previewElement.tagName.match(/H\d/) 
                        && Number.parseInt(previewElement.tagName[1]) <= curLevel) {
                    curLevel = Number.parseInt(previewElement.tagName[1]);
                    cnt[i]--;
                }
                if (cnt[i] === -1) {
                    if (i !== cnt.length - 1) previewElement = previewElement.nextElementSibling;
                    break;
                }
                previewElement = previewElement.nextElementSibling;
            }
        }
        // 滚动到对应位置
        vditor.sv.element.scrollTop = (svElement as HTMLElement).offsetTop;
        vditor.preview.element.scrollTop = (previewElement as HTMLElement).offsetTop;
    }
}


export const getHeadingInfoFromTOC = (targetElement: HTMLElement, TOCElement: HTMLElement): number[] => {
    let info: number[] = [];
    let liElement: HTMLElement = targetElement;
    let ulElement: HTMLElement = liElement.parentElement;

    while (ulElement && TOCElement.contains(ulElement)) {
        let index = 0;
        for (index = 0; index < ulElement.childElementCount; index++) {
            if (ulElement.children[index] == liElement) {
                break;
            }
        }
        info.unshift(index);
        liElement = ulElement?.parentElement;
        ulElement = liElement?.parentElement;
    }

    return info;
}