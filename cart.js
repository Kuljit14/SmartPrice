const cartList = document.getElementById("cart-list");
const clearCartButton = document.querySelector("[data-clear-cart]");
const CART_PAGE_STORAGE_KEY = "smartpriceCart";
const CART_COMPARE_STORAGE_KEY = "smartpriceCompare";

renderCart();

clearCartButton?.addEventListener("click", () => {
    localStorage.removeItem(CART_PAGE_STORAGE_KEY);
    renderCart();

    if (typeof updateCartCount === "function") {
        updateCartCount();
    }
});

function renderCart() {
    const cart = getSavedCart();

    if (!cart.length) {
        cartList.innerHTML = `
            <div class="empty-cart">
                <h2>No saved products yet</h2>
                <p>Add products from the details page to compare or buy them later.</p>
                <a href="index.html">Browse products</a>
            </div>
        `;
        return;
    }

    cartList.innerHTML = cart.map(renderCartItem).join("");

    cartList.querySelectorAll("[data-remove-cart]").forEach((button) => {
        button.addEventListener("click", () => {
            removeCartItem(button.dataset.removeCart);
        });
    });

    cartList.querySelectorAll("[data-compare-cart]").forEach((button) => {
        button.addEventListener("click", () => {
            const product = cart.find((item) => `${item.source}-${item.id}` === button.dataset.compareCart);
            saveProductToCompare(product, button);
        });
    });
}

function renderCartItem(item) {
    const itemKey = `${item.source}-${item.id}`;

    return `
        <article class="cart-item-card">
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}">
            <div class="cart-item-info">
                <span class="source-badge">${escapeHtml(item.sourceName)}</span>
                <h2>${escapeHtml(item.title)}</h2>
                <p>${escapeHtml(item.description)}</p>
                <div class="cart-detail-grid">
                    <span><strong>Listed price</strong>${escapeHtml(item.price)}</span>
                    <span><strong>Category</strong>${escapeHtml(item.category)}</span>
                    <span><strong>Rating</strong>${item.rating ? `${escapeHtml(item.rating)} / 5` : "Not available"}</span>
                    <span><strong>SmartPrice pick</strong>${escapeHtml(item.bestPlatform)} at ${escapeHtml(item.bestPrice)}</span>
                </div>
                <div class="cart-item-actions">
                    <a href="${escapeHtml(item.buyUrl)}" target="_blank" rel="noopener">Buy on ${escapeHtml(item.bestPlatform)}</a>
                    <a href="details.html?source=${encodeURIComponent(item.source)}&id=${encodeURIComponent(item.id)}">View details</a>
                    <button type="button" data-compare-cart="${escapeHtml(itemKey)}">Add to Compare</button>
                    <button type="button" data-remove-cart="${escapeHtml(itemKey)}">Remove</button>
                </div>
            </div>
        </article>
    `;
}

function removeCartItem(itemKey) {
    const nextCart = getSavedCart().filter((item) => `${item.source}-${item.id}` !== itemKey);
    localStorage.setItem(CART_PAGE_STORAGE_KEY, JSON.stringify(nextCart));
    renderCart();

    if (typeof updateCartCount === "function") {
        updateCartCount();
    }
}

function saveProductToCompare(product, button) {
    if (!product) return;

    const compareItems = getSavedCompare();
    const productKey = `${product.source}-${product.id}`;
    const alreadySaved = compareItems.some((item) => `${item.source}-${item.id}` === productKey);

    if (!alreadySaved) {
        compareItems.push({ ...product, comparedAt: new Date().toISOString() });
        localStorage.setItem(CART_COMPARE_STORAGE_KEY, JSON.stringify(compareItems));
    }

    button.textContent = alreadySaved ? "Already Added" : "Added to Compare";
    button.classList.add("saved");

    if (typeof updateCompareDock === "function") {
        updateCompareDock();
    }
}

function getSavedCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_PAGE_STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function getSavedCompare() {
    try {
        return JSON.parse(localStorage.getItem(CART_COMPARE_STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
