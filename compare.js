const compareGrid = document.getElementById("compare-grid");
const compareSummary = document.getElementById("compare-summary");
const compareCountTitle = document.getElementById("compare-count-title");
const clearCompareButton = document.querySelector("[data-clear-compare]");
const COMPARE_PAGE_STORAGE_KEY = "smartpriceCompare";

renderComparePage();

clearCompareButton?.addEventListener("click", () => {
    localStorage.removeItem(COMPARE_PAGE_STORAGE_KEY);
    renderComparePage();

    if (typeof updateCompareDock === "function") {
        updateCompareDock();
    }
});

function renderComparePage() {
    const products = getCompareProducts();

    compareCountTitle.textContent = `${products.length} selected product${products.length === 1 ? "" : "s"}`;

    if (products.length < 2) {
        compareSummary.innerHTML = "";
        compareGrid.innerHTML = `
            <div class="empty-cart">
                <h2>Add at least 2 products</h2>
                <p>Select products from search, details, or cart to compare value and requirements together.</p>
                <a href="index.html">Browse products</a>
            </div>
        `;
        return;
    }

    const rankedProducts = products
        .map((product) => ({ ...product, smartScore: calculateSmartScore(product) }))
        .sort((a, b) => b.smartScore - a.smartScore);
    const bestProduct = rankedProducts[0];

    compareSummary.innerHTML = `
        <article class="best-compare-card">
            <span class="details-section-tag">SmartPrice best choice</span>
            <h2>${escapeHtml(bestProduct.title)}</h2>
            <p>${escapeHtml(buildBestReason(bestProduct))}</p>
            <strong>${escapeHtml(bestProduct.bestPrice || bestProduct.price)}</strong>
            <a href="${escapeHtml(bestProduct.buyUrl)}" target="_blank" rel="noopener">Buy on ${escapeHtml(bestProduct.bestPlatform)}</a>
        </article>
    `;

    compareGrid.innerHTML = rankedProducts.map(renderCompareCard).join("");

    compareGrid.querySelectorAll("[data-remove-compare]").forEach((button) => {
        button.addEventListener("click", () => {
            removeCompareProduct(button.dataset.removeCompare);
        });
    });
}

function renderCompareCard(product) {
    const specs = normalizeSpecs(product.specs);

    return `
        <article class="compare-product-card">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}">
            <div class="compare-product-info">
                <span class="source-badge">${escapeHtml(product.sourceName || product.bestPlatform || "SmartPrice")}</span>
                <h2>${escapeHtml(product.title)}</h2>
                <p>${escapeHtml(product.description || "Saved product for comparison.")}</p>
                <div class="compare-score-row">
                    <span>Smart score</span>
                    <strong>${product.smartScore}/100</strong>
                </div>
                <div class="compare-spec-table">
                    <span><strong>Price</strong>${escapeHtml(product.bestPrice || product.price)}</span>
                    <span><strong>Rating</strong>${product.rating ? `${escapeHtml(product.rating)} / 5` : "Not available"}</span>
                    <span><strong>Processor</strong>${escapeHtml(specs.processor)}</span>
                    <span><strong>RAM</strong>${escapeHtml(specs.ram)}</span>
                    <span><strong>Storage</strong>${escapeHtml(specs.storage)}</span>
                    <span><strong>Camera</strong>${escapeHtml(specs.camera)}</span>
                    <span><strong>Battery</strong>${escapeHtml(specs.battery)}</span>
                    <span><strong>Platform</strong>${escapeHtml(product.bestPlatform || product.sourceName || "Platform")}</span>
                </div>
                <div class="cart-item-actions">
                    <a href="${escapeHtml(product.buyUrl)}" target="_blank" rel="noopener">Buy</a>
                    <button type="button" data-remove-compare="${escapeHtml(`${product.source}-${product.id}`)}">Remove</button>
                </div>
            </div>
        </article>
    `;
}

function calculateSmartScore(product) {
    const specs = normalizeSpecs(product.specs);
    const price = Number(product.numericBestPrice || String(product.bestPrice || product.price).replace(/[^\d]/g, "")) || 99999;
    const rating = Number(product.rating) || 3.8;
    const ramScore = parseNumber(specs.ram) * 3;
    const storageScore = parseNumber(specs.storage) / 16;
    const cameraScore = parseNumber(specs.camera) / 3;
    const processorScore = specs.processor.toLowerCase().includes("i7") || specs.processor.toLowerCase().includes("flagship") ? 22 : 14;
    const priceScore = Math.max(8, 34 - price / 3000);

    return Math.min(100, Math.round(priceScore + rating * 8 + ramScore + storageScore + cameraScore + processorScore));
}

function buildBestReason(product) {
    const specs = normalizeSpecs(product.specs);
    return `${product.bestPlatform || product.sourceName} gives the strongest mix of ${specs.processor}, ${specs.ram} RAM, ${specs.storage} storage, rating, and price.`;
}

function normalizeSpecs(specs = {}) {
    return {
        processor: specs.processor || "Not specified",
        ram: specs.ram || "Not specified",
        storage: specs.storage || "Not specified",
        camera: specs.camera || "Not specified",
        battery: specs.battery || "Not specified",
    };
}

function parseNumber(value) {
    const match = String(value || "").match(/\d+/);
    return match ? Number(match[0]) : 1;
}

function removeCompareProduct(productKey) {
    const nextProducts = getCompareProducts().filter((product) => `${product.source}-${product.id}` !== productKey);
    localStorage.setItem(COMPARE_PAGE_STORAGE_KEY, JSON.stringify(nextProducts));
    renderComparePage();

    if (typeof updateCompareDock === "function") {
        updateCompareDock();
    }
}

function getCompareProducts() {
    try {
        return JSON.parse(localStorage.getItem(COMPARE_PAGE_STORAGE_KEY)) || [];
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
