const params = new URLSearchParams(window.location.search);
const id = params.get("id");
const source = params.get("source") || "dummyjson";

const container = document.getElementById("details-container");
const USD_TO_INR = 83;

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
                price: "Price unavailable",
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

        container.innerHTML = `
            <div class="details-card">
                <div class="details-image">
                    <img src="${product.image}" alt="${product.title}">
                </div>
                <div class="details-info">
                    <span class="source-badge">${product.sourceName}</span>
                    <h2>${product.title}</h2>
                    <p>${product.description}</p>
                    <h3>${product.price}</h3>
                    ${product.rating ? `<p>Customer rating: ${product.rating} / 5</p>` : ""}
                    ${product.category ? `<p>Category: ${product.category}</p>` : ""}
                </div>
            </div>
        `;
    })
    .catch((error) => {
        container.innerHTML = "<h2>Something went wrong while loading the product.</h2>";
        console.log("Error:", error);
    });

function formatUsdAsInr(price) {
    return `Rs ${Math.round(Number(price) * USD_TO_INR).toLocaleString("en-IN")}`;
}
