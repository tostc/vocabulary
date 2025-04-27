function Tab(container) {
    this._changeTab = (tab, tabContent) => {
        // Hide all Tabs
        for (const tabContent of tabContents) {
            tabContent.style.display = "none";
            tabContent.classList.remove("active");
        }

        // Reset the active states
        for (const tab of this.tabs)
            tab.classList.remove("active");

        // Make the selected tab visible
        tabContent.style.display = "block";
        tabContent.classList.add("active");

        // Highlight the selected tab
        tab.classList.add("active");
    }

    const tabBar = container.querySelector(".tab-bar");
    const tabContents = Array.from(container.querySelectorAll(".tab-content"))
    if(tabBar) {
        this.tabs = Array.from(tabBar.querySelectorAll(".tab"));
        if(this.tabs.length != tabContents.length)
            return;

        var idx = 0;
        for (const tab of this.tabs)
            tab.onclick = this._changeTab.bind(this, tab, tabContents[idx++]);
    }
}