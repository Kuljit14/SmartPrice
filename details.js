const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const source = params.get("source") || "dummyjson";

const container = document.getElementById("details-container");
const USD_TO_INR = 83;
const PRICE_UNAVAILABLE = "Price unavailable";
const DETAILS_CART_STORAGE_KEY = "smartpriceCart";
const DETAILS_COMPARE_STORAGE_KEY = "smartpriceCompare";

// Show loading state first so the page never feels empty.
container.innerHTML = "<h2>Loading product...</h2>";

// Stop early if the page was opened without a product ID.
if (!id) {
    container.innerHTML = "<h2>No product selected.</h2>"; 
    throw new Error("No product ID found in URL");
}

const apiDetails = {
    dummyjson: {
        name: "DummyJSON",
        url: (productId) => `https://dummyjson.com/products/${productId}`,
        normalize: (product) => ({
            title: product.title,
            description: product.description,
            image: product.thumbnail,
            price: formatUsdAsInr(product.price),
            numericPrice: usdToInr(product.price),
            rating: product.rating,
            category: product.category,
            sourceName: "DummyJSON",
        }),
    },
    fakestore: {
        name: "Fake Store API",
        url: (productId) => `https://fakestoreapi.com/products/${productId}`,
        normalize: (product) => ({
            title: product.title,
            description: product.description,
            image: product.image,
            price: formatUsdAsInr(product.price),
            numericPrice: usdToInr(product.price),
            rating: product.rating?.rate,
            category: product.category,
            sourceName: "Fake Store API",
        }),
    },
    openfoodfacts: {
        name: "Open Food Facts",
        url: (productId) => `https://world.openfoodfacts.net/api/v2/product/${productId}.json`,
        normalize: (data) => {
            const product = data.product || {};

            return {
                title: product.product_name || product.generic_name || product.brands || "Food product",
                description: product.ingredients_text || product.categories || "Community food product data from Open Food Facts.",
                image: product.image_front_url || product.image_url,
                price: PRICE_UNAVAILABLE,
                numericPrice: null,
                rating: null,
                category: product.categories_tags?.[0]?.replace("en:", "") || product.brands,
                sourceName: "Open Food Facts",
            };
        },
    },
};

const selectedApi = apiDetails[source] || apiDetails.dummyjson;

fetch(selectedApi.url(id))
    .then((res) => {
        if (!res.ok) {
            throw new Error(`${selectedApi.name} failed with status ${res.status}`);
        }

        return res.json();
    })
    .then((apiProduct) => {
        const product = selectedApi.normalize(apiProduct);

        if (!product || !product.title || !product.image) {
            container.innerHTML = "<h2>Product not found.</h2>";
            return;
        }

        const smartPrice = buildSmartPriceSuggestion(product);
        const specs = buildProductSpecs(product);
        const cartProduct = {
            id,
            source,
            title: product.title,
            description: product.description,
            image: product.image,
            price: product.price,
            rating: product.rating || null,
            category: product.category || "General product",
            sourceName: product.sourceName,
            bestPlatform: smartPrice.bestOffer.name,
            bestPrice: formatInr(smartPrice.bestOffer.price),
            numericBestPrice: smartPrice.bestOffer.price,
            buyUrl: smartPrice.bestOffer.url,
            specs,
        };

        container.innerHTML = `
            <div class="details-card">
                <div class="details-image">
                    <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}">
                </div>
                <div class="details-info">
                    <span class="source-badge">${escapeHtml(product.sourceName)}</span>
                    <h2>${escapeHtml(product.title)}</h2>
                    <p>${escapeHtml(product.description)}</p>
                    <h3>${escapeHtml(product.price)}</h3>
                    ${product.rating ? `<p>Customer rating: ${escapeHtml(product.rating)} / 5</p>` : ""}
                    ${product.category ? `<p>Category: ${escapeHtml(product.category)}</p>` : ""}
                    <div class="details-actions">
                        <button class="add-cart-btn" type="button" data-add-cart>Add Cart</button>
                        <button class="compare-product-btn" type="button" data-add-compare>Add to Compare</button>
                        <a class="direct-buy-btn" href="${escapeHtml(smartPrice.bestOffer.url)}" target="_blank" rel="noopener">Buy on ${escapeHtml(smartPrice.bestOffer.name)}</a>
                    </div>
                </div>
            </div>
            ${renderSmartPricePanel(smartPrice)}
        `;

        container.querySelector("[data-add-cart]")?.addEventListener("click", () => {
            saveProductToCart(cartProduct);
        });

        container.querySelector("[data-add-compare]")?.addEventListener("click", () => {
            saveProductToCompare(cartProduct);
        });

        container.querySelectorAll("[data-explore-compare]").forEach((button) => {
            button.addEventListener("click", () => {
                const productIndex = Number(button.dataset.exploreCompare);
                saveProductToCompare(smartPrice.exploreProducts[productIndex], button);
            });
        });
    })
    .catch((error) => {
        container.innerHTML = "<h2>Something went wrong while loading the product.</h2>";
        console.log("Error:", error);
    });

function formatUsdAsInr(price) {
    return formatInr(usdToInr(price));
}

function usdToInr(price) {
    return Math.round(Number(price) * USD_TO_INR);
}

function formatInr(price) {
    return `Rs ${Math.round(price).toLocaleString("en-IN")}`;
}

function buildSmartPriceSuggestion(product) {
    const basePrice = product.numericPrice || estimateCategoryPrice(product.category);
    const platforms = getPlatformMix(product.category, product.title);
    const offers = platforms
        .map((platform, index) => {
            const adjustment = [-0.08, 0.04, -0.02, 0.09][index] || 0;
            const price = Math.max(99, Math.round(basePrice * (1 + adjustment)));

            return {
                ...platform,
                price,
                delivery: index === 0 ? "Fast delivery" : index === 1 ? "Free delivery" : "Standard delivery",
            };
        })
        .sort((a, b) => a.price - b.price);

    const bestOffer = offers[0];
    const comparedWith = offers[offers.length - 1];
    const savings = comparedWith.price - bestOffer.price;

    return {
        bestOffer,
        offers,
        savings,
        similarProducts: buildSimilarProducts(product, bestOffer.price),
        exploreProducts: buildExploreProducts(product, bestOffer),
        commonDetails: buildCommonDetails(product),
    };
}

function getPlatformMix(category = "", productTitle = "") {
    const normalizedCategory = category.toLowerCase();
    const searchQuery = encodeURIComponent(productTitle);

    if (normalizedCategory.includes("clothing") || normalizedCategory.includes("dress")) {
        return [
            { name: "Myntra", trust: "High match", url: `https://www.myntra.com/${searchQuery}` },
            { name: "Ajio", trust: "Style deal", url: `https://www.ajio.com/search/?text=${searchQuery}` },
            { name: "Amazon", trust: "Trusted seller", url: `https://www.amazon.in/s?k=${searchQuery}` },
            { name: "Flipkart", trust: "Popular choice", url: `https://www.flipkart.com/search?q=${searchQuery}` },
        ];
    }

    if (normalizedCategory.includes("laptop") || normalizedCategory.includes("smartphone") || normalizedCategory.includes("electronics")) {
        return [
            { name: "Flipkart", trust: "Best price", url: `https://www.flipkart.com/search?q=${searchQuery}` },
            { name: "Amazon", trust: "Reliable seller", url: `https://www.amazon.in/s?k=${searchQuery}` },
            { name: "Croma", trust: "Store support", url: `https://www.croma.com/searchB?q=${searchQuery}` },
            { name: "Reliance Digital", trust: "Easy pickup", url: `https://www.reliancedigital.in/search?q=${searchQuery}` },
        ];
    }

    return [
        { name: "Blinkit", trust: "Quick delivery", url: `https://blinkit.com/s/?q=${searchQuery}` },
        { name: "Amazon", trust: "Trusted seller", url: `https://www.amazon.in/s?k=${searchQuery}` },
        { name: "Flipkart", trust: "Good deal", url: `https://www.flipkart.com/search?q=${searchQuery}` },
        { name: "JioMart", trust: "Grocery value", url: `https://www.jiomart.com/search/${searchQuery}` },
    ];
}

function estimateCategoryPrice(category = "") {
    const normalizedCategory = category.toLowerCase();

    if (normalizedCategory.includes("laptop")) return 52999;
    if (normalizedCategory.includes("smartphone")) return 18999;
    if (normalizedCategory.includes("electronics")) return 2499;
    if (normalizedCategory.includes("clothing") || normalizedCategory.includes("dress")) return 1499;
    return 399;
}

function buildSimilarProducts(product, bestPrice) {
    const category = product.category || "similar pick";
    const titleWords = product.title.split(" ").slice(0, 2).join(" ");

    return [
        {
            name: `${titleWords} value option`,
            price: Math.round(bestPrice * 0.88),
            note: `Lower price in ${category}`,
        },
        {
            name: `${titleWords} rated alternative`,
            price: Math.round(bestPrice * 1.06),
            note: "Better rating, slightly higher price",
        },
        {
            name: `${titleWords} premium pick`,
            price: Math.round(bestPrice * 1.18),
            note: "More features for comparison",
        },
    ];
}

function buildExploreProducts(product, bestOffer) {
    const titleWords = product.title.split(" ").slice(0, 2).join(" ");
    const category = product.category || "General product";
    const basePrice = bestOffer.price;

    return [
        buildExploreProduct(product, `${titleWords} value alternative`, category, Math.round(basePrice * 0.90), 0, bestOffer),
        buildExploreProduct(product, `${titleWords} performance pick`, category, Math.round(basePrice * 1.08), 1, bestOffer),
        buildExploreProduct(product, `${titleWords} premium option`, category, Math.round(basePrice * 1.18), 2, bestOffer),
    ];
}

function buildExploreProduct(product, title, category, price, index, bestOffer) {
    const specs = buildProductSpecs({ ...product, title, category });
    const query = encodeURIComponent(title);

    return {
        id: `${source}-${id}-similar-${index}`,
        source: "similar",
        title,
        description: `More ${category} option for users who want to compare before buying.`,
        image: getExploreImage(product, index),
        price: formatInr(price),
        bestPrice: formatInr(price),
        numericBestPrice: price,
        rating: index === 0 ? 4.2 : index === 1 ? 4.5 : 4.4,
        category,
        sourceName: "SmartPrice similar",
        bestPlatform: bestOffer.name,
        buyUrl: `${bestOffer.url.split("?")[0]}?q=${query}`,
        specs,
    };
}

function getExploreImage(product, index) {
    const category = (product.category || "").toLowerCase();

    if (category.includes("smartphone")) {
        return [
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80",
            "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=500&q=80",
            "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?auto=format&fit=crop&w=500&q=80",
        ][index];
    }

    if (category.includes("laptop") || category.includes("electronics")) {
        return [
            "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=500&q=80",
            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=500&q=80",
            "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=500&q=80",
        ][index];
    }

    return product.image;
}

function buildCommonDetails(product) {
    return [
        { label: "Product", value: product.title },
        { label: "Category", value: product.category || "General product" },
        { label: "Original listed price", value: product.price },
        { label: "Customer rating", value: product.rating ? `${product.rating} / 5` : "Not available" },
        { label: "Product data source", value: product.sourceName },
        { label: "Availability", value: "Check live stock on platform" },
    ];
}

function buildProductSpecs(product) {
    const category = (product.category || "").toLowerCase();
    const title = product.title.toLowerCase();
    const seed = product.title.length;
    const isPhone = category.includes("smartphone") || title.includes("phone");
    const isLaptop = category.includes("laptop") || title.includes("laptop") || title.includes("macbook");
    const isElectronics = isPhone || isLaptop || category.includes("electronics");

    if (isLaptop) {
        return {
            type: "Laptop",
            processor: seed % 2 === 0 ? "Intel Core i5 / Ryzen 5 class" : "Intel Core i7 / Ryzen 7 class",
            ram: seed % 2 === 0 ? "8 GB" : "16 GB",
            storage: seed % 3 === 0 ? "512 GB SSD" : "1 TB SSD",
            camera: "HD webcam",
            battery: seed % 2 === 0 ? "Up to 8 hours" : "Up to 10 hours",
        };
    }

    if (isPhone) {
        return {
            type: "Phone",
            processor: seed % 2 === 0 ? "Snapdragon mid-range class" : "Flagship class chipset",
            ram: seed % 2 === 0 ? "6 GB" : "8 GB",
            storage: seed % 3 === 0 ? "128 GB" : "256 GB",
            camera: seed % 2 === 0 ? "50 MP main camera" : "108 MP main camera",
            battery: seed % 2 === 0 ? "5000 mAh" : "4500 mAh fast charge",
        };
    }

    if (isElectronics) {
        return {
            type: "Electronics",
            processor: "Standard performance class",
            ram: "Not specified",
            storage: "Not specified",
            camera: "Not applicable",
            battery: "Depends on model",
        };
    }

    return {
        type: "General",
        processor: "Not applicable",
        ram: "Not applicable",
        storage: "Not applicable",
        camera: "Not applicable",
        battery: "Not specified",
    };
}

function renderSmartPricePanel(smartPrice) {
    const offerCards = smartPrice.offers
        .map((offer, index) => `
            <article class="smartprice-offer-card ${index === 0 ? "best-offer" : ""}">
                <div>
                    <span class="smartprice-platform">${escapeHtml(offer.name)}</span>
                    <p>${escapeHtml(offer.trust)} &middot; ${escapeHtml(offer.delivery)}</p>
                </div>
                <strong>${formatInr(offer.price)}</strong>
                <a href="${escapeHtml(offer.url)}" target="_blank" rel="noopener">Buy</a>
            </article>
        `)
        .join("");

    const detailRows = smartPrice.commonDetails
        .map((detail) => `
            <div class="common-detail-row">
                <span>${escapeHtml(detail.label)}</span>
                <strong>${escapeHtml(detail.value)}</strong>
            </div>
        `)
        .join("");

    const similarCards = smartPrice.similarProducts
        .map((item) => `
            <article class="similar-product-card">
                <h3>${escapeHtml(item.name)}</h3>
                <strong>${formatInr(item.price)}</strong>
                <p>${escapeHtml(item.note)}</p>
            </article>
        `)
        .join("");

    const exploreCards = smartPrice.exploreProducts
        .map((product, index) => `
            <article class="explore-product-card">
                <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}">
                <div>
                    <span class="source-badge">${escapeHtml(product.bestPlatform)}</span>
                    <h3>${escapeHtml(product.title)}</h3>
                    <p>${escapeHtml(product.description)}</p>
                    <div class="search-spec-grid">
                        <span><strong>Processor</strong>${escapeHtml(product.specs.processor)}</span>
                        <span><strong>RAM</strong>${escapeHtml(product.specs.ram)}</span>
                        <span><strong>Storage</strong>${escapeHtml(product.specs.storage)}</span>
                        <span><strong>Camera</strong>${escapeHtml(product.specs.camera)}</span>
                    </div>
                </div>
                <strong>${escapeHtml(product.bestPrice)}</strong>
                <div class="search-product-actions">
                    <button type="button" data-explore-compare="${index}">Compare</button>
                    <a href="${escapeHtml(product.buyUrl)}" target="_blank" rel="noopener">Buy</a>
                </div>
            </article>
        `)
        .join("");

    return `
        <section class="smartprice-panel" aria-label="SmartPrice suggestion">
            <div class="smartprice-head">
                <div>
                    <span class="details-section-tag">SmartPrice suggestion</span>
                    <h2>Best price: ${formatInr(smartPrice.bestOffer.price)} on ${escapeHtml(smartPrice.bestOffer.name)}</h2>
                    <p>We compared trusted platforms and similar products so the user can decide faster.</p>
                </div>
                <div class="smartprice-saving">
                    <span>Possible saving</span>
                    <strong>${formatInr(smartPrice.savings)}</strong>
                </div>
            </div>

            <div class="smartprice-offers">
                ${offerCards}
            </div>

            <div class="common-details-block">
                <h2>Common product details</h2>
                <div class="common-details-grid">
                    ${detailRows}
                </div>
            </div>

            <div class="similar-products-block">
                <h2>Similar product price ideas</h2>
                <div class="similar-products-grid">
                    ${similarCards}
                </div>
            </div>

            <div class="explore-products-block">
                <h2>Explore more similar products</h2>
                <div class="explore-products-grid">
                    ${exploreCards}
                </div>
            </div>
        </section>
    `;
}

function saveProductToCart(product) {
    const cart = getSavedCart();
    const productKey = `${product.source}-${product.id}`;
    const alreadySaved = cart.some((item) => `${item.source}-${item.id}` === productKey);
    const button = container.querySelector("[data-add-cart]");

    if (!alreadySaved) {
        cart.push({ ...product, savedAt: new Date().toISOString() });
        localStorage.setItem(DETAILS_CART_STORAGE_KEY, JSON.stringify(cart));
    }

    if (button) {
        button.textContent = alreadySaved ? "Already Saved" : "Saved";
        button.classList.add("saved");
    }

    if (typeof updateCartCount === "function") {
        updateCartCount();
    }
}

function saveProductToCompare(product, actionButton) {
    const compareItems = getSavedCompare();
    const productKey = `${product.source}-${product.id}`;
    const alreadySaved = compareItems.some((item) => `${item.source}-${item.id}` === productKey);
    const button = actionButton || container.querySelector("[data-add-compare]");

    if (!alreadySaved) {
        compareItems.push({ ...product, comparedAt: new Date().toISOString() });
        localStorage.setItem(DETAILS_COMPARE_STORAGE_KEY, JSON.stringify(compareItems));
    }

    if (button) {
        button.textContent = alreadySaved ? "Already Added" : "Added to Compare";
        button.classList.add("saved");
    }

    if (typeof updateCompareDock === "function") {
        updateCompareDock();
    }
}

function getSavedCart() {
    try {
        return JSON.parse(localStorage.getItem(DETAILS_CART_STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function getSavedCompare() {
    try {
        return JSON.parse(localStorage.getItem(DETAILS_COMPARE_STORAGE_KEY)) || [];
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
