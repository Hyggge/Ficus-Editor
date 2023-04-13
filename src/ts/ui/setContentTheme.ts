import {addStyle} from "../util/addStyle";

export const setContentTheme = (contentTheme: string, path: string) => {
    if (!contentTheme || !path) {
        return;
    }
    const vditorContentTheme = document.getElementById("vditorContentTheme") as HTMLLinkElement;
    const cssPath = `${path}/${contentTheme}.css`;
    if (!vditorContentTheme || vditorContentTheme.getAttribute("href") !== cssPath) {
        addStyle(cssPath, "vditorContentTheme");
    }
};
