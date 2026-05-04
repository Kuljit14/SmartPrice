const drawer = document.getElementById("site-drawer");
const drawerToggle = document.querySelector(".all-menu-btn");
const mobileDrawerToggles = document.querySelectorAll("[data-mobile-menu-open]");
const drawerCloseButtons = document.querySelectorAll("[data-drawer-close]");
const locationPickers = document.querySelectorAll(".location-picker");
const savedLocation = localStorage.getItem("smartpriceLocation");
const savedUserName = localStorage.getItem("smartpriceUserName");

if (drawer && drawerToggle) {
    drawerToggle.addEventListener("click", openDrawer);

    mobileDrawerToggles.forEach((button) => {
        button.addEventListener("click", openDrawer);
    });

    drawerCloseButtons.forEach((button) => {
        button.addEventListener("click", closeDrawer);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeDrawer();
        }
    });
}

if (savedLocation) {
    updateLocationLabels(savedLocation);
}

updateGreeting(savedUserName);

locationPickers.forEach((picker) => {
    const button = picker.querySelector(".location-btn");
    const input = picker.querySelector(".location-input");
    const saveButton = picker.querySelector(".location-save-btn");

    button?.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = picker.classList.toggle("open");
        button.setAttribute("aria-expanded", String(isOpen));
        input?.focus();
    });

    saveButton?.addEventListener("click", () => {
        const value = input.value.trim();

        if (!value) {
            input.focus();
            return;
        }

        localStorage.setItem("smartpriceLocation", value);
        updateLocationLabels(value);
        closeLocationPickers();
    });
});

document.addEventListener("click", (event) => {
    if (!event.target.closest(".location-picker")) {
        closeLocationPickers();
    }
});

function openDrawer() {
    document.body.classList.add("drawer-open");
    drawer.setAttribute("aria-hidden", "false");
    drawerToggle.setAttribute("aria-expanded", "true");
}

function closeDrawer() {
    document.body.classList.remove("drawer-open");
    drawer?.setAttribute("aria-hidden", "true");
    drawerToggle?.setAttribute("aria-expanded", "false");
}

function updateLocationLabels(location) {
    document.querySelectorAll(".location-value").forEach((label) => {
        label.textContent = location;
    });

    document.querySelectorAll(".location-input").forEach((input) => {
        input.value = location;
    });
}

function closeLocationPickers() {
    locationPickers.forEach((picker) => {
        picker.classList.remove("open");
        picker.querySelector(".location-btn")?.setAttribute("aria-expanded", "false");
    });
}

function updateGreeting(userName) {
    document.querySelectorAll("[data-user-greeting]").forEach((greeting) => {
        greeting.textContent = userName ? `Hello, ${userName}` : "Welcome";
    });
}
