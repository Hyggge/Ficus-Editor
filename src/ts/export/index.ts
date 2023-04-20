import {getHTML} from "../markdown/getHTML";
import {getMarkdown} from "../markdown/getMarkdown";

export const download = (vditor: IVditor, content: string, filename: string) => {
    const aElement = document.createElement("a");
    if ("download" in aElement) {
        aElement.download = filename;
        aElement.style.display = "none";
        aElement.href = URL.createObjectURL(new Blob([content]));

        document.body.appendChild(aElement);
        aElement.click();
        aElement.remove();
    } else {
        vditor.tip.show(window.VditorI18n.downloadTip, 0);
    }
};

export const exportMarkdown = (vditor: IVditor) => {
    const content = getMarkdown(vditor);
    download(vditor, content, content.substr(0, 10) + ".md");
};

export const exportPDF = (vditor: IVditor, autoDownload: boolean = true) => {
    vditor.tip.show(window.VditorI18n.generate, 3800);
    const iframe = document.querySelector("#vditorExportIframe") as HTMLIFrameElement;
    iframe.contentDocument.open();
    iframe.contentDocument.write(`<link rel="stylesheet" href="${vditor.options.cdn}/dist/index.css"/>
<script src="${vditor.options.cdn}/dist/method.min.js"></script>
<div id="preview" style="width: 800px"></div>
<script>
window.addEventListener("message", (e) => {
  if(!e.data) {
    return;
  }
  Vditor.preview(document.getElementById('preview'), e.data, {
    theme: {
        current: "${vditor.options.preview.theme.current}",
        path: "${vditor.options.preview.theme.path}",
    },
    hljs: {
      style: "${vditor.options.preview.hljs.style}"
    }
  });
  setTimeout(() => {
        window.print();
    }, 3600);
}, false);
</script>`);
    iframe.contentDocument.close();
    if (autoDownload) {
        setTimeout(() => {
            iframe.contentWindow.postMessage(getMarkdown(vditor), "*");
        }, 200);
    }
    return iframe.contentDocument;
};

export const exportHTML = (vditor: IVditor, autoDownload: boolean = true) => {
    const content = getHTML(vditor);
    const html = `<html><head><link rel="stylesheet" type="text/css" href="${vditor.options.cdn}/dist/index.css"/>
<script src="${vditor.options.cdn}/dist/js/i18n/${vditor.options.lang}.js"></script>
<script src="${vditor.options.cdn}/dist/method.min.js"></script></head>
<body><div class="vditor-reset" id="preview" style="padding: 0px 30px 0px">${content}</div>
<script>
    const previewElement = document.getElementById('preview')
    Vditor.setContentTheme('${vditor.options.preview.theme.current}', '${vditor.options.preview.theme.path}');
    Vditor.codeRender(previewElement);
    Vditor.highlightRender(${JSON.stringify(vditor.options.preview.hljs)}, previewElement, '${vditor.options.cdn}');
    Vditor.mathRender(previewElement, {
        cdn: '${vditor.options.cdn}',
        math: ${JSON.stringify(vditor.options.preview.math)},
    });
    Vditor.mermaidRender(previewElement, '${vditor.options.cdn}', '${vditor.options.theme}');
    Vditor.markmapRender(previewElement, '${vditor.options.cdn}', '${vditor.options.theme}');
    Vditor.flowchartRender(previewElement, '${vditor.options.cdn}');
    Vditor.graphvizRender(previewElement, '${vditor.options.cdn}');
    Vditor.chartRender(previewElement, '${vditor.options.cdn}', '${vditor.options.theme}');
    Vditor.mindmapRender(previewElement, '${vditor.options.cdn}', '${vditor.options.theme}');
    Vditor.abcRender(previewElement, '${vditor.options.cdn}');
    Vditor.mediaRender(previewElement);
    Vditor.speechRender(previewElement);
</script>
<script src="${vditor.options.cdn}/dist/js/icons/${vditor.options.icon}.js"></script></body></html>`;
    if(autoDownload) download(vditor, html, "demo.html");
    return html;
};
