const container = document.getElementById("product-container");
const sectionTitle = document.querySelector(".section-title");
const PRODUCTS_PER_API = 8;
const USD_TO_INR = 83;
const activeCategory = new URLSearchParams(window.location.search).get("category") || "home";

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

const productApis = [
    {
        name: "DummyJSON",
        url: selectedCategory.dummyUrl,
        getProducts: (data) => data.products || [],
        normalize: (product) => ({
            id: product.id,
            source: "dummyjson",
            apiName: "DummyJSON",
            title: product.title,
            image: product.thumbnail,
            price: formatUsdAsInr(product.price),
            rating: product.rating,
        }),
    },
    {
        name: "Fake Store API",
        url: selectedCategory.fakeUrl,
        getProducts: (data) => data || [],
        normalize: (product) => ({
            id: product.id,
            source: "fakestore",
            apiName: "Fake Store API",
            title: product.title,
            image: product.image,
            price: formatUsdAsInr(product.price),
            rating: product.rating?.rate,
        }),
    },
    {
        name: "Open Food Facts",
        url: `https://world.openfoodfacts.net/api/v2/search?categories_tags_en=${selectedCategory.foodCategory}&page_size=${PRODUCTS_PER_API}&fields=code,product_name,generic_name,brands,image_front_url,image_url,categories_tags,ingredients_text,categories`,
        getProducts: (data) => data.products || [],
        normalize: (product) => ({
            id: product.code,
            source: "openfoodfacts",
            apiName: "Open Food Facts",
            title: product.product_name || product.generic_name || product.brands || "Food product",
            image: product.image_front_url || product.image_url,
            price: "Price unavailable",
            rating: null,
        }),
    },
];

sectionTitle.textContent = selectedCategory.title;
container.innerHTML = `<p class="products-status">Loading ${selectedCategory.title.toLowerCase()}...</p>`;
highlightActiveMenuLink();

loadHomeProducts();

async function loadHomeProducts() {
    try {
        const apiResults = await Promise.allSettled(productApis.map(loadProductsFromApi));
        const products = apiResults
            .filter((result) => result.status === "fulfilled")
            .flatMap((result) => result.value)
            .filter((product) => product.id && product.title && product.image);

        container.innerHTML = "";

        if (!products.length) {
            container.innerHTML = `<p class="products-status">No products are available right now.</p>`;
            return;
        }

        products.forEach(renderProductCard);
    } catch (error) {
        container.innerHTML = `<p class="products-status">Something went wrong while loading products.</p>`;
        console.log("Error:", error);
    }
}

async function loadProductsFromApi(api) {
    const res = await fetch(api.url);

    if (!res.ok) {
        throw new Error(`${api.name} failed with status ${res.status}`);
    }

    const data = await res.json();
    return api.getProducts(data).slice(0, PRODUCTS_PER_API).map(api.normalize);
}

function renderProductCard(product) {
    const card = document.createElement("div");
    card.classList.add("product-card");
    card.tabIndex = 0;

    card.innerHTML = `
        <span class="source-badge">${product.apiName}</span>
        <img src="${product.image}" alt="${product.title}">
        <h3>${product.title}</h3>
        <p>${product.price}</p>
        ${product.rating ? `<small>Rating: ${product.rating} / 5</small>` : ""}
    `;

    card.addEventListener("click", () => openDetails(product));
    card.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            openDetails(product);
        }
    });

    container.appendChild(card);
}

function openDetails(product) {
    window.location.href = `details.html?source=${product.source}&id=${encodeURIComponent(product.id)}`;
}

function formatUsdAsInr(price) {
    return `Rs ${Math.round(Number(price) * USD_TO_INR).toLocaleString("en-IN")}`;
}

function highlightActiveMenuLink() {
    const linkCategory = activeCategory === "home" ? "home" : activeCategory;
    document
        .querySelector(`.menu-link[data-category="${linkCategory}"]`)
        ?.classList.add("active");
}
