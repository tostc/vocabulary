var g_SelectedWindow = null;

if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initWindows);
else
    initWindows();

function initWindows() {
    const windows = Array.from(document.getElementsByClassName("window"));
    window.addEventListener("mousemove", ev => {
        if(g_SelectedWindow) {
            const style = getComputedStyle(g_SelectedWindow);
            g_SelectedWindow.style.left = ((parseInt(style["left"]) || 0) + ev.movementX) + "px";
            g_SelectedWindow.style.top = ((parseInt(style["top"]) || 0) + ev.movementY) + "px";
            g_SelectedWindow.style.bottom = "unset";

            ev.preventDefault();
            ev.stopPropagation();
        }
    });

    window.addEventListener("mouseup", ev => {
        if(ev.button == 0)
            g_SelectedWindow = null;

        ev.preventDefault();
        ev.stopPropagation();
    });

    for (const window of windows) {
        window.querySelector(".close")?.addEventListener("click", (ev) => {
            window.style.display = "none";

            ev.stopPropagation();
            ev.preventDefault();
        });

        const titlebar =  window.querySelector(".titlebar");
        titlebar?.addEventListener("mousedown", ev => {
            if(ev.button == 0)
                g_SelectedWindow = titlebar.parentElement;

            ev.preventDefault();
            ev.stopPropagation();
        });
    }
}