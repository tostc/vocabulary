if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initWindows);
else
    initWindows();

function initWindows() {
    const windows = Array.from(document.getElementsByClassName("window"));
    for (const window of windows) {
        window.querySelector(".close")?.addEventListener("click", (ev) => {
            window.style.display = "none";

            ev.stopPropagation();
            ev.preventDefault();
        });


        // window.querySelector(".titlebar")?.addEventListener("mousedown", ev => {
        //     console.log(ev);
        // });
    }
}