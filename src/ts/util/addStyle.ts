export const addStyle = (url: string, id: string) => {
    const oldStyleElement = document.getElementById(id);
    const newStyleElement = document.createElement("link");

    newStyleElement.id = id;
    newStyleElement.rel = "stylesheet";
    newStyleElement.type = "text/css";
    newStyleElement.href = url;

    if (! oldStyleElement) {
        document.getElementsByTagName("head")[0].appendChild(newStyleElement);
    }
    else {
        oldStyleElement.parentNode.insertBefore(newStyleElement, oldStyleElement)
        newStyleElement.onload = () => {
            oldStyleElement.parentNode.removeChild(oldStyleElement);
        }
    }
};
