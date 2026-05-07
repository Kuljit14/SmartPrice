const container = document.getElementById("product-container");
const sectionTitle = document.querySelector(".section-title");
const PRODUCTS_PER_API = 8;
const USD_TO_INR = 83;
const activeCategory = new URLSearchParams(window.location.search).get("category") || "home";
const HOME_COMPARE_STORAGE_KEY = "smartpriceCompare";

const categoryConfig = {
    home: {
        title: "Top Deals For You",
        dummyUrl: `https://dummyjson.com/products?limit=${PRODUCTS_PER_API}`,
        fakeUrl: `https://fakestoreapi.com/products?limit=${PRODUCTS_PER_API}`,
        foodCategory: "snacks",
    },
    "for-you": {
        title: "Recommended For You",
        dummyUrl: `https://dummyjson.com/products?limit=${PRODUCTS_PER_API}`,
        fakeUrl: `https://fakestoreapi.com/products?limit=${PRODUCTS_PER_API}`,
        foodCategory: "snacks",
    },
    fashion: {
        title: "Fashion Picks",
        dummyUrl: `https://dummyjson.com/products/category/womens-dresses?limit=${PRODUCTS_PER_API}`,
        fakeUrl: `https://fakestoreapi.com/products/category/${encodeURIComponent("women's clothing")}`,
        foodCategory: "chocolates",
    },
    electronics: {
        title: "Electronics Deals",
        dummyUrl: `https://dummyjson.com/products/category/laptops?limit=${PRODUCTS_PER_API}`,
        fakeUrl: `https://fakestoreapi.com/products/category/electronics`,
        foodCategory: "beverages",
    },
    mobiles: {
        title: "Mobile Deals",
        dummyUrl: `https://dummyjson.com/products/category/smartphones?limit=${PRODUCTS_PER_API}`,
        fakeUrl: `https://fakestoreapi.com/products/category/electronics`,
        foodCategory: "energy-drinks",
    },
    baby: {
        title: "Baby And Family Picks",
        dummyUrl: `https://dummyjson.com/products/category/groceries?limit=${PRODUCTS_PER_API}`,
        fakeUrl: `https://fakestoreapi.com/products?limit=${PRODUCTS_PER_API}`,
        foodCategory: "baby-foods",
    },
    deals: {
        title: "Best Deals Today",
        dummyUrl: `https://dummyjson.com/products?sortBy=discountPercentage&order=desc&limit=${PRODUCTS_PER_API}`,
        fakeUrl: `https://fakestoreapi.com/products?sort=desc`,
        foodCategory: "snacks",
    },
};

const selectedCategory = categoryConfig[activeCategory] || categoryConfig.home;
const rowOrder = activeCategory === "home"
    ? ["electronics", "mobiles", "fashion", "baby", "deals"]
    : [activeCategory];

sectionTitle.textContent = activeCategory === "home" ? "Shop By Category" : selectedCategory.title;
container.classList.add("category-row-container");
container.innerHTML = `<p class="products-status">Loading product rows...</p>`;
highlightActiveMenuLink();

loadHomeProducts();

async function loadHomeProducts() {
    try {
        container.innerHTML = "";
        await Promise.all(rowOrder.map(loadCategoryRow));

        if (!container.children.length) {
            container.innerHTML = `<p class="products-status">No products are available right now.</p>`;
        }
    } catch (error) {
        container.innerHTML = `<p class="products-status">Something went wrong while loading products.</p>`;
        console.log("Error:", error);
    }
}

async function loadCategoryRow(categoryKey) {
    const config = categoryConfig[categoryKey] || categoryConfig.home;
    const apiResults = await Promise.allSettled(createProductApis(config).map(loadProductsFromApi));
    const products = apiResults
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value)
        .filter((product) => product.id && product.title && product.image)
        .slice(0, 12);

    if (!products.length) return;

    const row = document.createElement("section");
    row.className = "category-product-row";
    row.innerHTML = `
        <div class="category-row-head">
            <h3>${config.title}</h3>
            <div class="category-row-actions">
                <button class="row-scroll-btn" type="button" data-row-direction="left" aria-label="Scroll ${config.title} left">&lt;</button>
                <button class="row-scroll-btn" type="button" data-row-direction="right" aria-label="Scroll ${config.title} right">&gt;</button>
                <a href="index.html?category=${encodeURIComponent(categoryKey)}#top-deals">View all</a>
            </div>
        </div>
        <div class="category-row-track"></div>
    `;

    const track = row.querySelector(".category-row-track");
    row.querySelectorAll(".row-scroll-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const direction = button.dataset.rowDirection === "left" ? -1 : 1;
            track.scrollBy({
                left: direction * Math.max(260, track.clientWidth * 0.82),
                behavior: "smooth",
            });
        });
    });

    products.forEach((product) => renderProductCard(product, track));
    container.appendChild(row);
}

function createProductApis(config) {
    return [
        {
            name: "DummyJSON",
            url: config.dummyUrl,
            getProducts: (data) => data.products || [],
            normalize: (product) => ({
                id: product.id,
                source: "dummyjson",
                apiName: "DummyJSON",
                title: product.title,
                image: product.thumbnail,
                price: formatUsdAsInr(product.price),
                numericBestPrice: Math.round(Number(product.price) * USD_TO_INR),
                rating: product.rating,
                category: product.category,
            }),
        },
        {
            name: "Fake Store API",
            url: config.fakeUrl,
            getProducts: (data) => data || [],
            normalize: (product) => ({
                id: product.id,
                source: "fakestore",
                apiName: "Fake Store API",
                title: product.title,
                image: product.image,
                price: formatUsdAsInr(product.price),
                numericBestPrice: Math.round(Number(product.price) * USD_TO_INR),
                rating: product.rating?.rate,
                category: product.category,
            }),
        },
        {
            name: "Open Food Facts",
            url: `https://world.openfoodfacts.net/api/v2/search?categories_tags_en=${config.foodCategory}&page_size=${PRODUCTS_PER_API}&fields=code,product_name,generic_name,brands,image_front_url,image_url,categories_tags,ingredients_text,categories`,
            getProducts: (data) => data.products || [],
            normalize: (product) => ({
                id: product.code,
                source: "openfoodfacts",
                apiName: "Open Food Facts",
                title: product.product_name || product.generic_name || product.brands || "Food product",
                image: product.image_front_url || product.image_url,
                price: "Price unavailable",
                numericBestPrice: null,
                rating: null,
                category: product.categories_tags?.[0]?.replace("en:", "") || product.brands,
            }),
        },
    ];
}

async function loadProductsFromApi(api) {
    const res = await fetch(api.url);

    if (!res.ok) {
        throw new Error(`${api.name} failed with status ${res.status}`);
    }

    const data = await res.json();
    return api.getProducts(data).slice(0, PRODUCTS_PER_API).map(api.normalize);
}

function renderProductCard(product, parent = container) {
    const card = document.createElement("div");
    card.classList.add("product-card");
    card.tabIndex = 0;

    card.innerHTML = `
        <span class="source-badge">${product.apiName}</span>
        <img src="${product.image}" alt="${product.title}">
        <h3>${product.title}</h3>
        <p>${product.price}</p>
        ${product.rating ? `<small>Rating: ${product.rating} / 5</small>` : ""}
        <button class="product-compare-btn" type="button">Compare</button>
    `;

    card.querySelector(".product-compare-btn").addEventListener("click", (event) => {
        event.stopPropagation();
        saveHomeProductToCompare(product, event.currentTarget);
    });

    card.addEventListener("click", () => openDetails(product));
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            openDetails(product);
        }
    });

    parent.appendChild(card);
}

function openDetails(product) {
    window.location.href = `details.html?source=${product.source}&id=${encodeURIComponent(product.id)}`;
}

function formatUsdAsInr(price) {
    return `Rs ${Math.round(Number(price) * USD_TO_INR).toLocaleString("en-IN")}`;
}

function saveHomeProductToCompare(product, button) {
    const compareItems = getHomeCompare();
    const productKey = `${product.source}-${product.id}`;
    const alreadySaved = compareItems.some((item) => `${item.source}-${item.id}` === productKey);

    if (!alreadySaved) {
        compareItems.push({
            id: String(product.id),
            source: product.source,
            title: product.title,
            description: `${product.apiName} product selected from SmartPrice browsing.`,
            image: product.image,
            price: product.price,
            bestPrice: product.price,
            numericBestPrice: product.numericBestPrice,
            rating: product.rating || null,
            category: product.category || "General product",
            sourceName: product.apiName,
            bestPlatform: product.apiName,
            buyUrl: `details.html?source=${product.source}&id=${encodeURIComponent(product.id)}`,
            specs: buildHomeProductSpecs(product),
            comparedAt: new Date().toISOString(),
        });
        localStorage.setItem(HOME_COMPARE_STORAGE_KEY, JSON.stringify(compareItems));
    }

    button.textContent = "Added";
    button.classList.add("saved");

    if (typeof updateCompareDock === "function") {
        updateCompareDock();
    }
}

function buildHomeProductSpecs(product) {
    const title = product.title.toLowerCase();
    const category = (product.category || "").toLowerCase();
    const isLaptop = title.includes("laptop") || category.includes("laptop");
    const isPhone = title.includes("phone") || category.includes("smartphone");

    if (isLaptop) {
        return {
            processor: "Intel Core i5 class",
            ram: "8 GB",
            storage: "512 GB SSD",
            camera: "HD webcam",
            battery: "8 hours",
        };
    }

    if (isPhone) {
        return {
            processor: "Snapdragon class",
            ram: "6 GB",
            storage: "128 GB",
            camera: "50 MP",
            battery: "5000 mAh",
        };
    }

    return {
        processor: "Not applicable",
        ram: "Not applicable",
        storage: "Standard",
        camera: "Not applicable",
        battery: "Not specified",
    };
}

function getHomeCompare() {
    try {
        return JSON.parse(localStorage.getItem(HOME_COMPARE_STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function highlightActiveMenuLink() {
    const linkCategory = activeCategory === "home" ? "home" : activeCategory;
    document
        .querySelector(`.menu-link[data-category="${linkCategory}"]`)
        ?.classList.add("active");
}
