export const slugify = (value) => value.toLowerCase().replace(/\+/g, " plus ").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const productImageSource = (name) => `/images/products-optimized/${slugify(name)}.webp`;
