const drawer = document.getElementById("site-drawer");
const drawerToggle = document.querySelector(".all-menu-btn");
const mobileDrawerToggles = document.querySelectorAll("[data-mobile-menu-open]");
const drawerCloseButtons = document.querySelectorAll("[data-drawer-close]");
const locationPickers = document.querySelectorAll(".location-picker");
const savedLocation = localStorage.getItem("smartpriceLocation");
const savedUserName = localStorage.getItem("smartpriceUserName");
const searchBoxes = document.querySelectorAll(".search-box");
const cartActions = document.querySelectorAll(".cart-action, .bottom-nav-cart");
const loginButtons = document.querySelectorAll(".login-btn, .bottom-login");
const MENU_CART_STORAGE_KEY = "smartpriceCart";
const MENU_COMPARE_STORAGE_KEY = "smartpriceCompare";
const MENU_USER_STORAGE_KEY = "smartpriceUserName";

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
updateCartCount();
renderCompareDock();

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

cartActions.forEach((cartAction) => {
    cartAction.addEventListener("click", () => {
        window.location.href = "cart.html";
    });
});

searchBoxes.forEach((searchBox) => {
    const input = searchBox.querySelector("input");
    const button = searchBox.querySelector(".search-btn");
    const category = searchBox.querySelector(".category");

    button?.addEventListener("click", () => submitSmartPriceSearch(input, category));
    input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            submitSmartPriceSearch(input, category);
        }
    });

    category?.addEventListener("change", () => {
        const query = input?.value.trim();

        if (!query) {
            goToSelectedCategory(category);
        }
    });
});

loginButtons.forEach((button) => {
    button.addEventListener("click", openLoginPanel);
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
    document.querySelectorAll("[data-user-greeting], .signin-text").forEach((greeting) => {
        greeting.textContent = userName ? `Hello, ${userName}` : "Hello, Sign in here";
    });
}

function openLoginPanel() {
    renderLoginPanel();
    document.body.classList.add("login-open");
    document.querySelector(".login-input")?.focus();
}

function closeLoginPanel() {
    document.body.classList.remove("login-open");
}

function renderLoginPanel() {
    if (document.querySelector(".login-overlay")) return;

    const panel = document.createElement("div");
    panel.className = "login-overlay";
    panel.innerHTML = `
        <form class="login-panel">
            <button class="login-close" type="button" aria-label="Close login">&times;</button>
            <span class="details-section-tag">SmartPrice account</span>
            <h2>Login to SmartPrice</h2>
            <p>Use email or phone with your password to save cart and compare products.</p>
            <label>
                Email or phone
                <input class="login-input" type="text" name="identity" placeholder="Email or phone number" required>
            </label>
            <label>
                Password
                <input type="password" name="password" placeholder="Password" required>
            </label>
            <button class="login-submit" type="submit">Login</button>
        </form>
    `;

    document.body.appendChild(panel);

    panel.addEventListener("click", (event) => {
        if (event.target === panel) {
            closeLoginPanel();
        }
    });

    panel.querySelector(".login-close").addEventListener("click", closeLoginPanel);
    panel.querySelector(".login-panel").addEventListener("submit", (event) => {
        event.preventDefault();
        const identity = new FormData(event.currentTarget).get("identity").trim();
        const displayName = identity.includes("@") ? identity.split("@")[0] : identity;

        localStorage.setItem(MENU_USER_STORAGE_KEY, displayName);
        updateGreeting(displayName);
        closeLoginPanel();
    });
}

function submitSmartPriceSearch(input, category) {
    const query = input?.value.trim();
    const categoryKey = getSelectedCategoryKey(category);

    if (!query) {
        goToSelectedCategory(category);
        return;
    }

    window.location.href = `search.html?q=${encodeURIComponent(query)}&category=${encodeURIComponent(categoryKey)}`;
}

function goToSelectedCategory(category) {
    const categoryKey = getSelectedCategoryKey(category);

    if (categoryKey === "all") {
        window.location.href = "index.html#top-deals";
        return;
    }

    window.location.href = `index.html?category=${encodeURIComponent(categoryKey)}#top-deals`;
}

function getSelectedCategoryKey(category) {
    const selected = category?.value || category?.selectedOptions?.[0]?.textContent || "All";
    const normalized = selected.toLowerCase();
    const categoryMap = {
        all: "all",
        mobiles: "mobiles",
        laptops: "electronics",
        headphones: "electronics",
        tv: "electronics",
    };

    return categoryMap[normalized] || "all";
}

function getSmartPriceCart() {
    try {
        return JSON.parse(localStorage.getItem(MENU_CART_STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function updateCartCount() {
    const cartCount = getSmartPriceCart().length;
    const itemText = cartCount === 1 ? "1 item" : `${cartCount} items`;

    document.querySelectorAll(".cart-subtext").forEach((label) => {
        label.textContent = itemText;
    });
}

function getSmartPriceCompare() {
    try {
        return JSON.parse(localStorage.getItem(MENU_COMPARE_STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function updateCompareDock() {
    renderCompareDock();
}

function renderCompareDock() {
    const compareItems = getSmartPriceCompare();
    const existingDock = document.querySelector(".compare-dock");

    if (compareItems.length < 2) {
        existingDock?.remove();
        return;
    }

    const dock = existingDock || document.createElement("a");
    dock.className = "compare-dock";
    dock.href = "compare.html";
    dock.innerHTML = `
        <span>Compare</span>
        <strong>${compareItems.length}</strong>
    `;

    if (!existingDock) {
        document.body.appendChild(dock);
    }
}
