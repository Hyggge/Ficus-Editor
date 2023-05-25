import "./assets/less/index.less";
import VditorMethod from "./method";
import {Constants, VDITOR_VERSION} from "./ts/constants";
import {DevTools} from "./ts/devtools/index";
import {Hint} from "./ts/hint/index";
import {IR} from "./ts/ir/index";
import {input as irInput} from "./ts/ir/input";
import {processAfterRender} from "./ts/ir/process";
import {getHTML} from "./ts/markdown/getHTML";
import {getMarkdown} from "./ts/markdown/getMarkdown";
import {setLute} from "./ts/markdown/setLute";
import {Outline} from "./ts/outline/index";
import {Preview} from "./ts/preview/index";
import {Resize} from "./ts/resize/index";
import {Editor} from "./ts/sv/index";
import {inputEvent} from "./ts/sv/inputEvent";
import {processAfterRender as processSVAfterRender} from "./ts/sv/process";
import {Tip} from "./ts/tip/index";
import {Toolbar} from "./ts/toolbar/index";
import {disableToolbar, hidePanel} from "./ts/toolbar/setToolbar";
import {enableToolbar} from "./ts/toolbar/setToolbar";
import {initUI, UIUnbindListener} from "./ts/ui/initUI";
import {setCodeTheme} from "./ts/ui/setCodeTheme";
import {setContentTheme} from "./ts/ui/setContentTheme";
import {setPreviewMode} from "./ts/ui/setPreviewMode";
import {setTheme} from "./ts/ui/setTheme";
import {Undo} from "./ts/undo/index";
import {Upload} from "./ts/upload/index";
import {addScript, addScriptSync} from "./ts/util/addScript";
import {getSelectText, getSelectMD, getSelectHTML} from "./ts/util/getSelectText";
import {Options} from "./ts/util/Options";
import {processCodeRender} from "./ts/util/processCode";
import {getCursorPosition, getEditorRange, selectIsEditor, setSelectionFocus} from "./ts/util/selection";
import {afterRenderEvent} from "./ts/wysiwyg/afterRenderEvent";
import {WYSIWYG} from "./ts/wysiwyg/index";
import {input} from "./ts/wysiwyg/input";
import {renderDomByMd} from "./ts/wysiwyg/renderDomByMd";
import {setEditMode} from "./ts/toolbar/EditMode"
import {exportHTML, exportPDF} from "./ts/export/index"
import { Search } from "./ts/search/index";

class Vditor extends VditorMethod {
    public readonly version: string;
    public vditor: IVditor;

    /**
     * @param id 要挂载 Vditor 的元素或者元素 ID。
     * @param options Vditor 参数
     */
    constructor(id: string | HTMLElement, options?: IOptions) {
        super();
        this.version = VDITOR_VERSION;

        if (typeof id === "string") {
            if (!options) {
                options = {
                    cache: {
                        id: `vditor${id}`,
                    },
                };
            } else if (!options.cache) {
                options.cache = {id: `vditor${id}`};
            } else if (!options.cache.id) {
                options.cache.id = `vditor${id}`;
            }
            id = document.getElementById(id);
        }

        const getOptions = new Options(options);
        const mergedOptions = getOptions.merge();

        // 支持自定义国际化
        if (!mergedOptions.i18n) {
            if (!["en_US", "fr_FR", "ja_JP", "ko_KR", "ru_RU", "sv_SE", "zh_CN", "zh_TW"].includes(mergedOptions.lang)) {
                throw new Error(
                    "options.lang error, see https://ld246.com/article/1549638745630#options",
                );
            } else {
                const i18nScriptPrefix = "vditorI18nScript";
                const i18nScriptID = i18nScriptPrefix + mergedOptions.lang;
                document.querySelectorAll(`head script[id^="${i18nScriptPrefix}"]`).forEach((el) => {
                    if (el.id !== i18nScriptID) {
                        document.head.removeChild(el);
                    }
                });
                addScript(`${mergedOptions.cdn}/dist/js/i18n/${mergedOptions.lang}.js`, i18nScriptID).then(() => {
                    this.init(id as HTMLElement, mergedOptions);
                });
            }
        } else {
            window.VditorI18n = mergedOptions.i18n;
            this.init(id, mergedOptions);
        }
    }

    /** 设置主题 */
    public setTheme(
        theme: "dark" | "classic",
        contentTheme?: string,
        codeTheme?: string,
        contentThemePath?: string,
    ) {
        this.vditor.options.theme = theme;
        setTheme(this.vditor);
        if (contentTheme) {
            this.vditor.options.preview.theme.current = contentTheme;
            setContentTheme(contentTheme, contentThemePath || this.vditor.options.preview.theme.path);
        }
        if (codeTheme) {
            this.vditor.options.preview.hljs.style = codeTheme;
            setCodeTheme(codeTheme, this.vditor.options.cdn);
        }
    }

    /** 获取 Markdown 内容 */
    public getValue() {
        return getMarkdown(this.vditor);
    }

    /** 设置编辑器主题 */
    public setContentTheme(contentTheme: string, contentThemePath?: string) {
        this.vditor.options.preview.theme.current = contentTheme;
        setContentTheme(contentTheme, contentThemePath || this.vditor.options.preview.theme.path);
    }

    /** 设置代码主题 */
    public setCodeTheme(codeTheme: string) {
        this.vditor.options.preview.hljs.style = codeTheme;
        setCodeTheme(codeTheme, this.vditor.options.cdn);
    }


    /** 获取编辑器当前编辑模式 */
    public getCurrentMode() {
        return this.vditor.currentMode;
    }

    /** 聚焦到编辑器 */
    public focus() {
        if (this.vditor.currentMode === "sv") {
            this.vditor.sv.element.focus();
        } else if (this.vditor.currentMode === "wysiwyg") {
            this.vditor.wysiwyg.element.focus();
        } else if (this.vditor.currentMode === "ir") {
            this.vditor.ir.element.focus();
        }
    }

    /** 让编辑器失焦 */
    public blur() {
        if (this.vditor.currentMode === "sv") {
            this.vditor.sv.element.blur();
        } else if (this.vditor.currentMode === "wysiwyg") {
            this.vditor.wysiwyg.element.blur();
        } else if (this.vditor.currentMode === "ir") {
            this.vditor.ir.element.blur();
        }
    }

    /** 禁用编辑器 */
    public disabled() {
        hidePanel(this.vditor, ["subToolbar", "hint", "popover"]);
        disableToolbar(
            this.vditor.toolbar.elements,
            Constants.EDIT_TOOLBARS.concat(["undo", "redo", "fullscreen", "edit-mode"]),
        );
        this.vditor[this.vditor.currentMode].element.setAttribute(
            "contenteditable",
            "false",
        );
    }

    /** 解除编辑器禁用 */
    public enable() {
        enableToolbar(
            this.vditor.toolbar.elements,
            Constants.EDIT_TOOLBARS.concat(["undo", "redo", "fullscreen", "edit-mode"]),
        );
        this.vditor.undo.resetIcon(this.vditor);
        this.vditor[this.vditor.currentMode].element.setAttribute("contenteditable", "true");
    }

    /** 返回选中的内容，
     * 默认情况下返回纯文本
     * 之后wysiwyg模式才可以返回md或者html */
    public getSelection(type: string = 'text') {
        if (this.vditor.currentMode === "wysiwyg") {
            switch(type) {
                case 'text': return getSelectText(this.vditor.wysiwyg.element);
                case 'md':   return getSelectMD(this.vditor);
                case 'html': return getSelectHTML(this.vditor);
                default: console.log('type error');
            }
        } else if (this.vditor.currentMode === "sv") {
            return getSelectText(this.vditor.sv.element);
        } else if (this.vditor.currentMode === "ir") {
            return getSelectText(this.vditor.ir.element);
        }
    }

    /** 设置预览区域内容 */
    public renderPreview(value?: string) {
        this.vditor.preview.render(this.vditor, value);
    }

    /** 获取焦点位置 */
    public getCursorPosition() {
        return getCursorPosition(this.vditor[this.vditor.currentMode].element);
    }

    /** 上传是否还在进行中 */
    public isUploading() {
        return this.vditor.upload.isUploading;
    }

    /** 清除缓存 */
    public clearCache() {
        localStorage.removeItem(this.vditor.options.cache.id);
    }

    /** 禁用缓存 */
    public disabledCache() {
        this.vditor.options.cache.enable = false;
    }

    /** 启用缓存 */
    public enableCache() {
        if (!this.vditor.options.cache.id) {
            throw new Error(
                "need options.cache.id, see https://ld246.com/article/1549638745630#options",
            );
        }
        this.vditor.options.cache.enable = true;
    }

    /** HTML 转 md */
    public html2md(value: string) {
        return this.vditor.lute.HTML2Md(value);
    }

    /** markdown 转 JSON 输出 */
    public exportJSON(value: string) {
        return this.vditor.lute.RenderJSON(value);
    }

    /** 获取 HTML */
    public getHTML() {
        return getHTML(this.vditor);
    }

    /** 消息提示。time 为 0 将一直显示 */
    public tip(text: string, time?: number) {
        this.vditor.tip.show(text, time);
    }

    /** 设置预览模式 */
    public setPreviewMode(mode: "both" | "editor") {
        setPreviewMode(mode, this.vditor);
    }

    /** 删除选中内容 */
    public deleteValue() {
        if (window.getSelection().isCollapsed) {
            return;
        }
        document.execCommand("delete", false);
    }

    /** 更新选中内容 */
    public updateValue(value: string) {
        document.execCommand("insertHTML", false, value);
    }

    /** 在焦点处插入内容，并默认进行 Markdown 渲染 */
    public insertValue(value: string, render = true) {
        const range = getEditorRange(this.vditor);
        range.collapse(true);
        const tmpElement = document.createElement("template");
        tmpElement.innerHTML = value;
        range.insertNode(tmpElement.content.cloneNode(true));
        if (this.vditor.currentMode === "sv") {
            this.vditor.sv.preventInput = true;
            if (render) {
                inputEvent(this.vditor);
            }
        } else if (this.vditor.currentMode === "wysiwyg") {
            this.vditor.wysiwyg.preventInput = true;
            if (render) {
                input(this.vditor, getSelection().getRangeAt(0));
            }
        } else if (this.vditor.currentMode === "ir") {
            this.vditor.ir.preventInput = true;
            if (render) {
                irInput(this.vditor, getSelection().getRangeAt(0), true);
            }
        }
    }

    /** 设置编辑器内容 */
    public setValue(markdown: string, clearStack = false) {
        if (this.vditor.currentMode === "sv") {
            this.vditor.sv.element.innerHTML = `<div data-block='0'>${this.vditor.lute.SpinVditorSVDOM(markdown)}</div>`;
            processSVAfterRender(this.vditor, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        } else if (this.vditor.currentMode === "wysiwyg") {
            renderDomByMd(this.vditor, markdown, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        } else {
            this.vditor.ir.element.innerHTML = this.vditor.lute.Md2VditorIRDOM(markdown);
            this.vditor.ir.element
                .querySelectorAll(".vditor-ir__preview[data-render='2']")
                .forEach((item: HTMLElement) => {
                    processCodeRender(item, this.vditor);
                });
            processAfterRender(this.vditor, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        }

        this.vditor.outline.render(this.vditor);

        if (!markdown) {
            hidePanel(this.vditor, ["emoji", "headings", "submenu", "hint"]);
            if (this.vditor.wysiwyg.popover) {
                this.vditor.wysiwyg.popover.style.display = "none";
            }
            this.clearCache();
        }
        if (clearStack) {
            this.clearStack();
        }
    }

    /** 清空 undo & redo 栈 */
    public clearStack() {
        this.vditor.undo.clearStack(this.vditor);
        this.vditor.undo.addToUndoStack(this.vditor);
    }

    /** 销毁编辑器 */
    public destroy() {
        this.vditor.element.innerHTML = this.vditor.originalInnerHTML;
        this.vditor.element.classList.remove("vditor");
        this.vditor.element.removeAttribute("style");
        const iconScript = document.getElementById("vditorIconScript")
        if (iconScript) {
            iconScript.remove();
        }
        this.clearCache();

        UIUnbindListener();
        this.vditor.wysiwyg.unbindListener();
    }

    /** 获取评论 ID */
    public getCommentIds() {
        if (this.vditor.currentMode !== "wysiwyg") {
            return [];
        }
        return this.vditor.wysiwyg.getComments(this.vditor, true);
    }

    /** 高亮评论 */
    public hlCommentIds(ids: string[]) {
        if (this.vditor.currentMode !== "wysiwyg") {
            return;
        }
        const hlItem = (item: Element) => {
            item.classList.remove("vditor-comment--hover");
            ids.forEach((id) => {
                if (item.getAttribute("data-cmtids").indexOf(id) > -1) {
                    item.classList.add("vditor-comment--hover");
                }
            });
        };
        this.vditor.wysiwyg.element
            .querySelectorAll(".vditor-comment")
            .forEach((item) => {
                hlItem(item);
            });
        if (this.vditor.preview.element.style.display !== "none") {
            this.vditor.preview.element
                .querySelectorAll(".vditor-comment")
                .forEach((item) => {
                    hlItem(item);
                });
        }
    }

    /** 取消评论高亮 */
    public unHlCommentIds(ids: string[]) {
        if (this.vditor.currentMode !== "wysiwyg") {
            return;
        }
        const unHlItem = (item: Element) => {
            ids.forEach((id) => {
                if (item.getAttribute("data-cmtids").indexOf(id) > -1) {
                    item.classList.remove("vditor-comment--hover");
                }
            });
        };
        this.vditor.wysiwyg.element
            .querySelectorAll(".vditor-comment")
            .forEach((item) => {
                unHlItem(item);
            });
        if (this.vditor.preview.element.style.display !== "none") {
            this.vditor.preview.element
                .querySelectorAll(".vditor-comment")
                .forEach((item) => {
                    unHlItem(item);
                });
        }
    }

    /** 删除评论 */
    public removeCommentIds(removeIds: string[]) {
        if (this.vditor.currentMode !== "wysiwyg") {
            return;
        }

        const removeItem = (item: Element, removeId: string) => {
            const ids = item.getAttribute("data-cmtids").split(" ");
            ids.find((id, index) => {
                if (id === removeId) {
                    ids.splice(index, 1);
                    return true;
                }
            });
            if (ids.length === 0) {
                item.outerHTML = item.innerHTML;
                getEditorRange(this.vditor).collapse(true);
            } else {
                item.setAttribute("data-cmtids", ids.join(" "));
            }
        };
        removeIds.forEach((removeId) => {
            this.vditor.wysiwyg.element
                .querySelectorAll(".vditor-comment")
                .forEach((item) => {
                    removeItem(item, removeId);
                });
            if (this.vditor.preview.element.style.display !== "none") {
                this.vditor.preview.element
                    .querySelectorAll(".vditor-comment")
                    .forEach((item) => {
                        removeItem(item, removeId);
                    });
            }
        });
        afterRenderEvent(this.vditor, {
            enableAddUndoStack: true,
            enableHint: false,
            enableInput: false,
        });
    }

    /** 切换模式 **/
    public changeEditMode(targetMode: string) {
        setEditMode(this.vditor, targetMode, getMarkdown(this.vditor));
    }

    /** 隐藏Toolbar **/
    public hideToorBar() {
        this.vditor.toolbar.element.style.display = "none"
    }

    /** 增加不同种类的block **/
    public addBlock(type: string) {
        let element;
        switch(type) {
            case "heading-1":
            case "heading-2":
            case "heading-3":
            case "heading-4":
            case "heading-5":
            case "heading-6":
                element = this.vditor.toolbar.elements[type];
                break;
            case "table":
            case "math-block":
            case "ordered-list":
            case "quote":
                element = this.vditor.toolbar.elements[type].children[0] as HTMLElement;
                break;
            case "unordered-list":
                element = this.vditor.toolbar.elements["list"].children[0] as HTMLElement;
                break;
            case "task-list":
                element = this.vditor.toolbar.elements["check"].children[0] as HTMLElement;
                break;
            case "horizontal-line":
                element = this.vditor.toolbar.elements["line"].children[0] as HTMLElement;
                break;
            case "code-block":
                element = this.vditor.toolbar.elements["code"].children[0] as HTMLElement;
                break;
        }
        element.click()
    }

    public addFormat(type: string) {
        let element;
        switch(type) {
            case "bold":
            case "italic":
            case "inline-code":
            case "inline-math":
            case "highlight":
            case "link":
            case "file-link":
            case "img-link":
            case "strike":
                element = this.vditor.toolbar.elements[type].children[0] as HTMLElement;
                break;
        }
        element.click()
    }

    /** 导出HTML **/
    public exportHTML(autoDownload: boolean = true) {
        return exportHTML(this.vditor, autoDownload)
    }

    /** 导出PDF **/
    public exportPDF(autoDownload: boolean = true) {
        return exportPDF(this.vditor, autoDownload)
    }

    /** 跳转到对应标题处 **/
    public scrollToHeading(info: number[]) {
        let cnt = [...info];
        if (this.vditor.currentMode === "wysiwyg") {
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
            this.vditor.wysiwyg.element.scrollTop = (element as HTMLElement).offsetTop;
        }
        else if (this.vditor.currentMode === "sv") {
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
            this.vditor.sv.element.scrollTop = (svElement as HTMLElement).offsetTop;
            this.vditor.preview.element.scrollTop = (previewElement as HTMLElement).offsetTop;
        }
    }

    /** 清除样式 **/
    public removeFormat() {
        if (window.getSelection().isCollapsed) {
            return;
        }

        if (this.vditor.currentMode === "wysiwyg") {
            if (! selectIsEditor(this.vditor.wysiwyg.element)) {
                return;
            }
            document.execCommand("removeFormat");
        }
        else if (this.vditor.currentMode === "sv") {
            if (! selectIsEditor(this.vditor.sv.element)) {
                return;
            }
            // 获得选中的md
            const md = getSelectText(this.vditor.sv.element)
            // 将选中的文本转换为HTML
            const html = this.vditor.lute.Md2HTML(md)
            // 将HTML转换为纯文本
            const div = document.createElement('div')
            div.innerHTML = html
            const newMd = div.textContent.trim()
            // 删除选中的内容，插入新的纯文本
            this.deleteValue()
            const range = getSelection().getRangeAt(0)
            range.insertNode(document.createTextNode(newMd))
            // 左侧栏渲染之后，右侧重新渲染
            processSVAfterRender(this.vditor);
        }
    }

    /** 设置打字机模式 **/
    public setTypewriterMode(enable: boolean) {
        this.vditor.options.typewriterMode = enable;
    }

    /** 获得当前焦点位置 **/
    public getEditorRange() {
        return getEditorRange(this.vditor);
    }

    /** 根据当前模式设置焦点, 并进行跳转
     *  如果不传range, 或者传的range属于当前模式的界面中，则需要跳转到开头 **/
    public setEditorRange(range?: Range) {
        const element = this.vditor[this.vditor.currentMode].element;
        if (this.vditor.currentMode === 'wysiwyg') {
            if (range && selectIsEditor(this.vditor.wysiwyg.element, range)) {
                setSelectionFocus(range);
                this.vditor.wysiwyg.element.scrollTop = (range.startContainer as HTMLElement).offsetTop + this.vditor.wysiwyg.element.clientHeight;
            } else {
                element.focus();
                let newRange = element.ownerDocument.createRange();
                newRange.setStart(element, 0);
                newRange.collapse(true);
                setSelectionFocus(newRange);
                this.vditor.wysiwyg.element.scrollTop = 0;
            }
        }
        else if (this.vditor.currentMode === 'sv') {
            if (range && selectIsEditor(this.vditor.sv.element, range)) {
                setSelectionFocus(range);
                this.vditor.sv.element.scrollTop = (range.startContainer as HTMLElement).offsetTop + this.vditor.sv.element.clientHeight;
            } else {
                element.focus();
                let newRange = element.ownerDocument.createRange();
                newRange.setStart(element, 0);
                newRange.collapse(true);
                setSelectionFocus(newRange);
                this.vditor.sv.element.scrollTop = 0;
            }
        }
    }

    /* 切换Latex引擎 */
    public setLatexEngine(engine: string) {
        if (engine === this.vditor.options.preview.math.engine) {
            return;
        }
        // 在options中切换引擎
        if (engine === "KaTex") {
            this.vditor.options.preview.math.engine = "KaTeX";
        } else {
            this.vditor.options.preview.math.engine = "MathJax";
        }
        // 重新渲染已有的数学公式
        if (this.vditor.currentMode === "wysiwyg") {
            renderDomByMd(this.vditor, getMarkdown(this.vditor), {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        } else if (this.vditor.currentMode === "sv") {
            this.vditor.sv.element.innerHTML = `<div data-block='0'>${this.vditor.lute.SpinVditorSVDOM(getMarkdown(this.vditor))}</div>`;
            processSVAfterRender(this.vditor, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        }
    }

    /* 设置代码块行号的显示和隐藏 */
    public setCodeBlockLineNumber(enable: boolean) {
        if (this.vditor.options.preview.hljs.lineNumber === enable) {
            return;
        }
        // 在options中设置
        this.vditor.options.preview.hljs.lineNumber = enable;
        // 重新渲染已有的代码块
        if (this.vditor.currentMode === "wysiwyg") {
            renderDomByMd(this.vditor, getMarkdown(this.vditor), {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        } else if (this.vditor.currentMode === "sv") {
            this.vditor.sv.element.innerHTML = `<div data-block='0'>${this.vditor.lute.SpinVditorSVDOM(getMarkdown(this.vditor))}</div>`;
            processSVAfterRender(this.vditor, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: false,
            });
        }
    }

    /* 设置sv模式下自动加空格 */
    public setAutoSpace(enable: boolean) {
        if (this.vditor.options.preview.markdown.autoSpace === enable) {
            return;
        }
        // 在options中设置
        this.vditor.options.preview.markdown.autoSpace = enable;
        this.vditor.lute.SetAutoSpace(enable);
        // 在sv模式下重新渲染
        if (this.vditor.currentMode === "sv") {
            this.vditor.preview.render(this.vditor);
        }
    }

    /** 设置自动矫正术语 */
    public setAutoFixTermTypo(enable: boolean) {
        if (this.vditor.options.preview.markdown.fixTermTypo === enable) {
            return;
        }
        // 在options中设置
        this.vditor.options.preview.markdown.fixTermTypo = enable;
        this.vditor.lute.SetFixTermTypo(enable);
        // 重新渲染
        if (this.vditor.currentMode === "wysiwyg") {
            renderDomByMd(this.vditor, getMarkdown(this.vditor), {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: true,
            });
        } else if (this.vditor.currentMode === "sv") {
            this.vditor.sv.element.innerHTML = `<div data-block='0'>${this.vditor.lute.SpinVditorSVDOM(getMarkdown(this.vditor))}</div>`;
            processSVAfterRender(this.vditor, {
                enableAddUndoStack: true,
                enableHint: false,
                enableInput: true,
            });
        }
    }

    /** 设置悬浮工具框的内容 */
    public setPopoverToolbar(options: IOptions["popoverToolbar"]) {
        this.vditor.options.popoverToolbar = options;
        this.vditor.wysiwyg.popover.innerHTML = "";
        this.vditor.wysiwyg.popover.style.display = "none";
    }

    /** 设置是否可以编辑 */
    public setEditable(enable: boolean) {
        if (enable) {
            this.vditor.wysiwyg.element.contentEditable = "true";
            this.vditor.sv.element.contentEditable = "true";
            this.vditor.ir.element.contentEditable = "true";
        } else {
            this.vditor.wysiwyg.element.contentEditable = "false";
            this.vditor.sv.element.contentEditable = "false";
            this.vditor.ir.element.contentEditable = "false";
        }
    }


    private init(id: HTMLElement, mergedOptions: IOptions) {
        this.vditor = {
            currentMode: mergedOptions.mode,
            element: id,
            hint: new Hint(mergedOptions.hint.extend),
            lute: undefined,
            options: mergedOptions,
            originalInnerHTML: id.innerHTML,
            outline: new Outline(window.VditorI18n.outline),
            tip: new Tip(),
            search: new Search(),
        };

        this.vditor.sv = new Editor(this.vditor);
        this.vditor.undo = new Undo();
        this.vditor.wysiwyg = new WYSIWYG(this.vditor);
        this.vditor.ir = new IR(this.vditor);
        this.vditor.toolbar = new Toolbar(this.vditor);

        if (mergedOptions.resize.enable) {
            this.vditor.resize = new Resize(this.vditor);
        }

        if (this.vditor.toolbar.elements.devtools) {
            this.vditor.devtools = new DevTools();
        }

        if (mergedOptions.upload.url || mergedOptions.upload.handler) {
            this.vditor.upload = new Upload();
        }

        addScript(
            mergedOptions._lutePath ||
            `${mergedOptions.cdn}/dist/js/lute/lute.min.js`,
            "vditorLuteScript",
        ).then(() => {
            this.vditor.lute = setLute({
                autoSpace: this.vditor.options.preview.markdown.autoSpace,
                codeBlockPreview: this.vditor.options.preview.markdown
                    .codeBlockPreview,
                emojiSite: this.vditor.options.hint.emojiPath,
                emojis: this.vditor.options.hint.emoji,
                fixTermTypo: this.vditor.options.preview.markdown.fixTermTypo,
                footnotes: this.vditor.options.preview.markdown.footnotes,
                headingAnchor: false,
                inlineMathDigit: this.vditor.options.preview.math.inlineDigit,
                linkBase: this.vditor.options.preview.markdown.linkBase,
                linkPrefix: this.vditor.options.preview.markdown.linkPrefix,
                listStyle: this.vditor.options.preview.markdown.listStyle,
                mark: this.vditor.options.preview.markdown.mark,
                mathBlockPreview: this.vditor.options.preview.markdown
                    .mathBlockPreview,
                paragraphBeginningSpace: this.vditor.options.preview.markdown
                    .paragraphBeginningSpace,
                sanitize: this.vditor.options.preview.markdown.sanitize,
                toc: this.vditor.options.preview.markdown.toc,
            });

            this.vditor.preview = new Preview(this.vditor);

            initUI(this.vditor);

            if (mergedOptions.after) {
                mergedOptions.after();
            }
            if (mergedOptions.icon) {
                // 防止初始化 2 个编辑器时加载 2 次
                addScriptSync(`${mergedOptions.cdn}/dist/js/icons/${mergedOptions.icon}.js`, "vditorIconScript");
            }
        });
    }
}

export default Vditor;
