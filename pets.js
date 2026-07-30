const petListingsEl = document.getElementById("pet-listings");
const petForm = document.getElementById("pet-form");
const petSearch = document.getElementById("pet-search");
const petTypeFilter = document.getElementById("pet-type-filter");
const petPurposeFilter = document.getElementById("pet-purpose-filter");
const petFormNote = document.getElementById("pet-form-note");
const PET_STORAGE_KEY = "pawmarketListings";

const defaultPets = [
    {
        id: "dog-bruno",
        name: "Bruno",
        type: "Dog",
        breed: "Golden Retriever",
        age: "10 months",
        location: "Ludhiana",
        purpose: "For Sale",
        price: "Rs 22,000",
        phone: "+91 98765 43210",
        image: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80",
        description: "Playful, vaccinated, dewormed and raised around family.",
    },
    {
        id: "dog-milo",
        name: "Milo",
        type: "Dog",
        breed: "Indie",
        age: "1 year",
        location: "Chandigarh",
        purpose: "Adoption",
        price: "Free adoption",
        phone: "+91 99887 77665",
        image: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=900&q=80",
        description: "Healthy rescue dog, calm nature, looking for a patient home.",
    },
    {
        id: "cat-luna",
        name: "Luna",
        type: "Cat",
        breed: "Persian",
        age: "7 months",
        location: "Delhi",
        purpose: "For Sale",
        price: "Rs 12,500",
        phone: "+91 91234 56780",
        image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=900&q=80",
        description: "Gentle indoor cat with a soft coat and updated vaccinations.",
    },
    {
        id: "rabbit-snow",
        name: "Snow",
        type: "Rabbit",
        breed: "White Rabbit",
        age: "5 months",
        location: "Amritsar",
        purpose: "Adoption",
        price: "Small care fee",
        phone: "+91 90000 12345",
        image: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=900&q=80",
        description: "Quiet, clean and comfortable with gentle handling.",
    },
];

renderListings();

[petSearch, petTypeFilter, petPurposeFilter].forEach((control) => {
    control.addEventListener("input", renderListings);
});

petForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(petForm);
    const newListing = {
        id: `pet-${Date.now()}`,
        name: formData.get("name").trim(),
        type: formData.get("type"),
        breed: formData.get("breed").trim(),
        age: formData.get("age").trim(),
        location: formData.get("location").trim(),
        purpose: formData.get("purpose"),
        price: formData.get("price").trim(),
        phone: formData.get("phone").trim(),
        image: formData.get("image").trim() || defaultImageForType(formData.get("type")),
        description: formData.get("description").trim(),
    };

    const listings = getSavedListings();
    listings.unshift(newListing);
    localStorage.setItem(PET_STORAGE_KEY, JSON.stringify(listings));
    petForm.reset();
    petFormNote.textContent = `${newListing.name} is now listed on PawMarket.`;
    renderListings();
    document.getElementById("animals").scrollIntoView({ behavior: "smooth" });
});

function renderListings() {
    const query = petSearch.value.trim().toLowerCase();
    const selectedType = petTypeFilter.value;
    const selectedPurpose = petPurposeFilter.value;
    const listings = getAllListings().filter((pet) => {
        const searchable = `${pet.name} ${pet.type} ${pet.breed} ${pet.location} ${pet.description}`.toLowerCase();
        const matchesQuery = !query || searchable.includes(query);
        const matchesType = selectedType === "all" || pet.type === selectedType;
        const matchesPurpose = selectedPurpose === "all" || pet.purpose === selectedPurpose;
        return matchesQuery && matchesType && matchesPurpose;
    });

    if (!listings.length) {
        petListingsEl.innerHTML = `<p class="pet-empty">No animals match your search yet.</p>`;
        return;
    }

    petListingsEl.innerHTML = listings.map(createPetCard).join("");
}

function createPetCard(pet) {
    const phoneHref = pet.phone.replace(/[^\d+]/g, "");
    const message = encodeURIComponent(`Hi, I am interested in ${pet.name}, the ${pet.breed} listed on PawMarket.`);
    const safePet = {
        name: escapeHtml(pet.name),
        type: escapeHtml(pet.type),
        breed: escapeHtml(pet.breed),
        age: escapeHtml(pet.age),
        location: escapeHtml(pet.location),
        purpose: escapeHtml(pet.purpose),
        price: escapeHtml(pet.price),
        phone: escapeHtml(pet.phone),
        image: escapeAttribute(pet.image),
        description: escapeHtml(pet.description),
        fallbackImage: escapeAttribute(defaultImageForType(pet.type)),
    };

    return `
        <article class="pet-card">
            <img src="${safePet.image}" alt="${safePet.name}, ${safePet.breed}" onerror="this.src='${safePet.fallbackImage}'">
            <div class="pet-card-body">
                <div class="pet-card-top">
                    <span class="pet-status">${safePet.purpose}</span>
                    <strong>${safePet.price}</strong>
                </div>
                <h3>${safePet.name}</h3>
                <p class="pet-breed">${safePet.breed} ${safePet.type} - ${safePet.age}</p>
                <p>${safePet.description}</p>
                <div class="pet-meta">
                    <span>${safePet.location}</span>
                    <span>${safePet.phone}</span>
                </div>
                <div class="pet-card-actions">
                    <a href="tel:${phoneHref}">Call seller</a>
                    <a href="https://wa.me/${phoneHref.replace("+", "")}?text=${message}" target="_blank" rel="noopener">Message</a>
                    <a href="mailto:seller@pawmarket.example?subject=${encodeURIComponent(`Adoption request for ${pet.name}`)}">Adopt request</a>
                </div>
            </div>
        </article>
    `;
}

function getAllListings() {
    return [...getSavedListings(), ...defaultPets];
}

function getSavedListings() {
    try {
        return JSON.parse(localStorage.getItem(PET_STORAGE_KEY)) || [];
    } catch (error) {
        return [];
    }
}

function defaultImageForType(type) {
    const images = {
        Dog: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=80",
        Cat: "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=900&q=80",
        Rabbit: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=900&q=80",
        Bird: "https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?auto=format&fit=crop&w=900&q=80",
        Other: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=900&q=80",
    };

    return images[type] || images.Other;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
}
