import Vditor from '../src/index'
import '../src/assets/less/index.less'
import { getElement } from '../src/ts/upload/getElement'

// new VConsole()

let toolbar
if (window.innerWidth < 768) {
    toolbar = [
        'emoji',
        'headings',
        'bold',
        'italic',
        'strike',
        'link',
        '|',
        'list',
        'ordered-list',
        'check',
        'outdent',
        'indent',
        '|',
        'quote',
        'line',
        'code',
        'inline-code',
        'insert-before',
        'insert-after',
        '|',
        'upload',
        'record',
        'table',
        '|',
        'undo',
        'redo',
        '|',
        'edit-mode',
        'content-theme',
        'code-theme',
        'export',
        {
            name: 'more',
            toolbar: [
                'fullscreen',
                'both',
                'preview',
                'info',
                'help',
            ],
        }]
}
const initVditor = (language) => {
    window.vditor = new Vditor('vditor', {
        // _lutePath: `http://192.168.31.194:9090/lute.min.js?${new Date().getTime()}`,
        _lutePath: 'src/js/lute/lute.min.js',
        cdn: 'http://localhost:9000',
        toolbar,
        lang: language,
        mode: 'wysiwyg',
        height: 1000,
        outline: {
            enable: true,
            position: 'right',
        },
        debugger: true,
        typewriterMode: false,
        placeholder: 'Hello, Vditor!',
        preview: {
            markdown: {
                toc: true,
                mark: true,
                footnotes: true,
                autoSpace: true,
            },
            math: {
                engine: 'MathJax',
            },
            theme: {
                current: 'classic',
                list: {
                    'classic': 'classic',
                    'modern': 'modern'
                },
                path: '/css/content-theme',
            }
        },
        toolbarConfig: {
            pin: true,
        },
        counter: {
            enable: true,
            type: 'text',
        },
        after() {
        },
        hint: {
            emojiPath: 'https://unpkg.com/ficus-editor/dist/images/emoji',
            emojiTail: '<a href="https://ld246.com/settings/function" target="_blank">设置常用表情</a>',
            emoji: {
                'sd': '💔',
                'j': 'https://unpkg.com/vditor@1.3.1/dist/images/emoji/j.png',
            },
            parse: false,
            genLinkHint: (input) => {
                // 具体生成hint列表的逻辑
                // ...
                return [
                    input + '123',
                    input + '456'
                ]
            },
            extend: [
                {
                    key: '@',
                    hint: (key) => {
                        console.log(key)
                        if ('vanessa'.indexOf(key.toLocaleLowerCase()) > -1) {
                            return [
                                {
                                    value: '@Vanessa',
                                    html: '<img src="https://avatars0.githubusercontent.com/u/970828?s=60&v=4"/> Vanessa',
                                }]
                        }
                        return []
                    },
                },
                {
                    key: '#',
                    hint: (key) => {
                        console.log(key)
                        if ('vditor'.indexOf(key.toLocaleLowerCase()) > -1) {
                            return [
                                {
                                    value: '#Vditor',
                                    html: '<span style="color: #999;">#Vditor</span> ♏ 一款浏览器端的 Markdown 编辑器，支持所见即所得（富文本）、即时渲染（类似 Typora）和分屏预览模式。',
                                }]
                        }
                        return []
                    },
                }],
        },
        tab: '    ',
        upload: {
            accept: 'image/*,.mp3, .wav, .rar',
            token: 'test',
            url: '/api/upload/editor',
            linkToImgUrl: '/api/upload/fetch',
            filename(name) {
                return name.replace(/[^(a-zA-Z0-9\u4e00-\u9fa5\.)]/g, '').replace(/[\?\\/:|<>\*\[\]\(\)\$%\{\}@~]/g, '').replace('/\\s/g', '')
            },
        },
    })
}
initVditor('zh_CN')
window.setLang = (language) => {
    window.vditor.destroy()
    initVditor(language)
}


const searchOpenButton = document.getElementById("search-open");
const searchCloseButton = document.getElementById("search-close");
const searchPrevButton = document.getElementById("search-prev");
const searchNextButton = document.getElementById("search-next");
const replaceButton = document.getElementById("replace-button");
const replaceAllButton = document.getElementById("replace-all-button");


searchOpenButton.addEventListener("click", () => {
    const input = document.getElementById("search-box");
    const text = input.value;
    window.vditor.vditor.search.run(window.vditor.vditor, text, true);
})

searchCloseButton.addEventListener("click", () => {
    window.vditor.vditor.search.close(window.vditor.vditor)
})

searchPrevButton.addEventListener("click", () => {
    window.vditor.vditor.search.prev(window.vditor.vditor)
})

searchNextButton.addEventListener("click", () => {
    window.vditor.vditor.search.next(window.vditor.vditor)
})

replaceButton.addEventListener("click", () => {
    const input = document.getElementById("replace-box");
    const text = input.value;
    window.vditor.vditor.search.replace(window.vditor.vditor, text, true, true);
})

replaceAllButton.addEventListener("click", () => {
    const input = document.getElementById("replace-box");
    const text = input.value;
    window.vditor.vditor.search.replaceAll(window.vditor.vditor, text);
})


document.getElementById("changeKaTex").addEventListener("click", () => {
    window.vditor.setLatexEngine("KaTex")
})


document.getElementById("changeMathJax").addEventListener("click", () => {
    window.vditor.setLatexEngine("MathJax")
})

document.getElementById("displayLineNumber").addEventListener("click", () => {
    window.vditor.setCodeBlockLineNumber(true)
})

document.getElementById("hideLineNumber").addEventListener("click", () => {
    window.vditor.setCodeBlockLineNumber(false)
})

document.getElementById("autoSpace").addEventListener("click", () => {
    window.vditor.setAutoSpace(true)
})

document.getElementById("noAutoSpace").addEventListener("click", () => {
    window.vditor.setAutoSpace(false)
})

document.getElementById("autoFixTermTypo").addEventListener("click", () => {
    window.vditor.setAutoFixTermTypo(true)
})

document.getElementById("noAutoFixTermTypo").addEventListener("click", () => {
    window.vditor.setAutoFixTermTypo(false)
})

document.getElementById("changeCodeTheme").addEventListener("click", () => {
    window.vditor.setCodeTheme("base16/solarized-light")
})

document.getElementById("setPopoverToolbar").addEventListener("click", () => {
    window.vditor.setPopoverToolbar({
        bold: true,
        italic: true,
        strike: true,
        inlineCode: false,
        inlineMath: true,
        clear: true
    })
})

document.getElementById("displaySVPreview").addEventListener("click", () => {
    window.vditor.setPreviewMode("both")
})

document.getElementById("hideSVPreview").addEventListener("click", () => {
    window.vditor.setPreviewMode("editor")
})

document.getElementById("editable").addEventListener("click", () => {
    window.vditor.setEditable(true)
})

document.getElementById("unEditable").addEventListener("click", () => {
    window.vditor.setEditable(false)
})