import {removeCurrentToolbar} from "../toolbar/setToolbar";
import {setCurrentToolbar} from "../toolbar/setToolbar";

export const setPreviewMode = (mode: "both" | "editor", vditor: IVditor) => {
    if (vditor.options.preview.mode === mode) {
        return;
    }
    vditor.options.preview.mode = mode;

    if (vditor.currentMode === "sv") {
        switch (mode) {
            case "both":
                vditor.preview.element.setAttribute("style", "display:block");
                vditor.sv.element.setAttribute("style", "display:block");
                vditor.preview.render(vditor);

                setCurrentToolbar(vditor.toolbar.elements, ["both"]);
                break;
            case "editor":
                vditor.preview.element.setAttribute("style", "display:none");
                vditor.sv.element.setAttribute("style", "display:block; padding-right: 88px;");
                vditor.preview.element.style.display = "none";

                removeCurrentToolbar(vditor.toolbar.elements, ["both"]);
                break;
            default:
                break;
        }
    }

    if (vditor.devtools) {
        vditor.devtools.renderEchart(vditor);
    }
};
