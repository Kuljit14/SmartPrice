const searchParams = new URLSearchParams(window.location.search);
const searchQuery = searchParams.get("q") || "";
const selectedSearchCategory = searchParams.get("category") || "all";
const searchTitle = document.getElementById("search-title");
const platformOptions = document.getElementById("platform-options");
const platformProducts = document.getElementById("platform-products");
const selectedPlatformTitle = document.getElementById("selected-platform-title");
const selectedPlatformLink = document.getElementById("selected-platform-link");
const SEARCH_COMPARE_STORAGE_KEY = "smartpriceCompare";

const platformList = buildPlatformOptions(searchQuery);

document.querySelectorAll(".search-box input").forEach((input) => {
    input.value = searchQuery;
});

document.querySelectorAll(".search-box .category").forEach((select) => {
    const categoryLabel = {
        all: "All",
        mobiles: "Mobiles",
        electronics: "Laptops",
    }[selectedSearchCategory] || "All";

    [...select.options].forEach((option) => {
        option.selected = option.textContent === categoryLabel;
    });
});

searchTitle.textContent = searchQuery ? `Search results for "${searchQuery}"` : "Search SmartPrice";

if (!searchQuery.trim()) {
    platformOptions.innerHTML = `<p class="products-status">Search for any product to compare platform options.</p>`;
    platformProducts.innerHTML = "";
} else {
    renderPlatformOptions(platformList);
    renderPlatformProducts(platformList[0]);
}

function buildPlatformOptions(query) {
    const encodedQuery = encodeURIComponent(query);
    const lowerQuery = query.toLowerCase();
    const isFashion = lowerQuery.includes("shirt") || lowerQuery.includes("dress") || lowerQuery.includes("shoe") || lowerQuery.includes("jeans");
    const isElectronics = selectedSearchCategory === "electronics" || selectedSearchCategory === "mobiles" || lowerQuery.includes("phone") || lowerQuery.includes("laptop") || lowerQuery.includes("headphone") || lowerQuery.includes("tv") || lowerQuery.includes("watch");

    if (isFashion) {
        return [
            platform("Myntra", "SmartPrice choice", "Trusted fashion returns", `https://www.myntra.com/${encodedQuery}`, true),
            platform("Ajio", "Style deals", "Good fashion catalog", `https://www.ajio.com/search/?text=${encodedQuery}`),
            platform("Amazon", "Marketplace option", "Large seller base", `https://www.amazon.in/s?k=${encodedQuery}`),
            platform("Flipkart", "Value option", "Popular Indian marketplace", `https://www.flipkart.com/search?q=${encodedQuery}`),
        ];
    }

    if (isElectronics) {
        return [
            platform("Flipkart", "SmartPrice choice", "Trusted electronics deals", `https://www.flipkart.com/search?q=${encodedQuery}`, true),
            platform("Amazon", "Secure option", "Reliable delivery and returns", `https://www.amazon.in/s?k=${encodedQuery}`),
            platform("Croma", "Store support", "Good for warranty help", `https://www.croma.com/searchB?q=${encodedQuery}`),
            platform("Reliance Digital", "Pickup option", "Store pickup and support", `https://www.reliancedigital.in/search?q=${encodedQuery}`),
        ];
    }

    return [
        platform("Amazon", "SmartPrice choice", "Trustable and secure marketplace", `https://www.amazon.in/s?k=${encodedQuery}`, true),
        platform("Flipkart", "Popular option", "Good product discovery", `https://www.flipkart.com/search?q=${encodedQuery}`),
        platform("JioMart", "Value option", "Useful grocery and daily needs catalog", `https://www.jiomart.com/search/${encodedQuery}`),
        platform("Blinkit", "Fast option", "Quick delivery where available", `https://blinkit.com/s/?q=${encodedQuery}`),
    ];
}

function platform(name, badge, reason, url, recommended = false) {
    return { name, badge, reason, url, recommended };
}

function renderPlatformOptions(platforms) {
    platformOptions.innerHTML = platforms.map((item, index) => `
        <button class="platform-option-card ${item.recommended ? "recommended" : ""}" type="button" data-platform-index="${index}">
            <span>${escapeHtml(item.badge)}</span>
            <strong>${escapeHtml(item.name)}</strong>
            <small>${escapeHtml(item.reason)}</small>
        </button>
    `).join("");

    platformOptions.querySelectorAll("[data-platform-index]").forEach((button) => {
        button.addEventListener("click", () => {
            const platformIndex = Number(button.dataset.platformIndex);
            renderPlatformProducts(platforms[platformIndex]);
        });
    });
}

function renderPlatformProducts(selectedPlatform) {
    const products = buildProductList(selectedPlatform);

    selectedPlatformTitle.textContent = `${selectedPlatform.name} product list`;
    selectedPlatformLink.href = selectedPlatform.url;
    selectedPlatformLink.textContent = `Open ${selectedPlatform.name}`;

    platformOptions.querySelectorAll(".platform-option-card").forEach((card) => {
        card.classList.toggle("active", card.textContent.includes(selectedPlatform.name));
    });

    platformProducts.innerHTML = products.map((product, index) => `
        <article class="search-product-card ${index === 0 ? "trusted-first" : ""}">
            <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}">
            <div>
                <span class="source-badge">${index === 0 ? "SmartPrice choice" : selectedPlatform.name}</span>
                <h3>${escapeHtml(product.title)}</h3>
                <p>${escapeHtml(product.reason)}</p>
                <div class="search-spec-grid">
                    <span><strong>Processor</strong>${escapeHtml(product.specs.processor)}</span>
                    <span><strong>RAM</strong>${escapeHtml(product.specs.ram)}</span>
                    <span><strong>Storage</strong>${escapeHtml(product.specs.storage)}</span>
                    <span><strong>Camera</strong>${escapeHtml(product.specs.camera)}</span>
                </div>
            </div>
            <strong>${escapeHtml(product.price)}</strong>
            <div class="search-product-actions">
                <button type="button" data-search-compare="${index}">Add to Compare</button>
                <a href="${escapeHtml(selectedPlatform.url)}" target="_blank" rel="noopener">View on ${escapeHtml(selectedPlatform.name)}</a>
            </div>
        </article>
    `).join("");

    platformProducts.querySelectorAll("[data-search-compare]").forEach((button) => {
        button.addEventListener("click", () => {
            saveSearchProductToCompare(products[Number(button.dataset.searchCompare)], selectedPlatform, button);
        });
    });
}

function buildProductList(selectedPlatform) {
    return [
        buildSearchProduct(selectedPlatform, 0, "trusted secure choice", `${selectedPlatform.name} is shown first because SmartPrice rates it as the safer choice for this search.`),
        buildSearchProduct(selectedPlatform, 1, "best value match", "Lower price style option for users who want to compare before buying."),
        buildSearchProduct(selectedPlatform, 2, "popular seller option", "Useful alternate listing with a broader seller selection."),
    ];
}

function buildSearchProduct(selectedPlatform, index, suffix, reason) {
    const price = estimateSearchPrice(index);
    const numericPrice = Number(price.replace(/[^\d]/g, ""));
    const specs = buildSearchSpecs(index);

    return {
        id: `${selectedPlatform.name.toLowerCase().replace(/\s+/g, "-")}-${searchQuery.toLowerCase().replace(/\s+/g, "-")}-${index}`,
        source: "search",
        sourceName: selectedPlatform.name,
        title: `${searchQuery} - ${suffix}`,
        description: reason,
        image: buildProductImage(index),
        category: specs.type,
        rating: index === 0 ? 4.6 : index === 1 ? 4.2 : 4.4,
        bestPlatform: selectedPlatform.name,
        price,
        bestPrice: price,
        numericBestPrice: numericPrice,
        buyUrl: selectedPlatform.url,
        specs,
        reason,
    };
}

function buildSearchSpecs(index) {
    const lowerQuery = searchQuery.toLowerCase();
    const isLaptop = selectedSearchCategory === "electronics" || lowerQuery.includes("laptop") || lowerQuery.includes("macbook");
    const isPhone = selectedSearchCategory === "mobiles" || lowerQuery.includes("phone") || lowerQuery.includes("mobile");

    if (isLaptop) {
        return {
            type: "Laptop",
            processor: ["Intel Core i5 class", "Ryzen 5 class", "Intel Core i7 class"][index],
            ram: ["8 GB", "16 GB", "16 GB"][index],
            storage: ["512 GB SSD", "512 GB SSD", "1 TB SSD"][index],
            camera: "HD webcam",
            battery: ["8 hours", "9 hours", "10 hours"][index],
        };
    }

    if (isPhone) {
        return {
            type: "Phone",
            processor: ["Snapdragon mid-range", "Dimensity balanced", "Flagship class"][index],
            ram: ["6 GB", "8 GB", "12 GB"][index],
            storage: ["128 GB", "128 GB", "256 GB"][index],
            camera: ["50 MP", "64 MP", "108 MP"][index],
            battery: ["5000 mAh", "5000 mAh", "4500 mAh fast charge"][index],
        };
    }

    return {
        type: "General",
        processor: ["Standard", "Balanced", "Premium"][index],
        ram: index === 0 ? "Good value" : "Varies by model",
        storage: index === 2 ? "Higher capacity" : "Standard",
        camera: "Depends on product",
        battery: "Depends on product",
    };
}

function buildProductImage(index) {
    const lowerQuery = searchQuery.toLowerCase();

    if (selectedSearchCategory === "electronics" || lowerQuery.includes("laptop") || lowerQuery.includes("macbook")) {
        return [
            "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=500&q=80",
            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80",
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=500&q=80",
        ][index];
    }

    if (selectedSearchCategory === "mobiles" || lowerQuery.includes("phone") || lowerQuery.includes("mobile")) {
        return [
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80",
            "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=500&q=80",
            "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=500&q=80",
        ][index];
    }

    return [
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80",
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80",
    ][index];
}

function saveSearchProductToCompare(product, selectedPlatform, button) {
    const compareItems = getSavedCompare();
    const alreadySaved = compareItems.some((item) => item.id === product.id);

    if (!alreadySaved) {
        compareItems.push({ ...product, comparedAt: new Date().toISOString(), sourceName: selectedPlatform.name });
        localStorage.setItem(SEARCH_COMPARE_STORAGE_KEY, JSON.stringify(compareItems));
    }

    button.textContent = alreadySaved ? "Already Added" : "Added to Compare";
    button.classList.add("saved");

    if (typeof updateCompareDock === "function") {
        updateCompareDock();
    }
}

function getSavedCompare() {
    try {
        return JSON.parse(localStorage.getItem(SEARCH_COMPARE_STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function estimateSearchPrice(index) {
    const basePrice = Math.max(299, searchQuery.length * 620);
    const price = Math.round(basePrice * [1, 0.92, 1.08][index]);
    return `Rs ${price.toLocaleString("en-IN")}`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
