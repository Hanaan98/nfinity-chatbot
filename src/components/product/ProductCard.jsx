const formatPrice = (price, currency = "USD") => {
  if (typeof price === "string") return price;
  if (typeof price === "number") {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
      }).format(price);
    } catch {
      return `$${price.toFixed(2)}`;
    }
  }
  return "";
};

const buildVariantUrl = (productUrl, variantId) => {
  if (!productUrl) return "#";
  if (!variantId) return productUrl;
  const sep = productUrl.includes("?") ? "&" : "?";
  return `${productUrl}${sep}variant=${encodeURIComponent(variantId)}`;
};

const firstTruthy = (...vals) => vals.find((v) => !!v);

const ProductCard = ({ product }) => {
  const {
    id,
    name,
    title,
    price,
    currency = "USD",
    rating = 5,
    image,
    url,
    variants = [],
  } = product || {};

  const displayName = firstTruthy(title, name, "Product");
  const availableVariants = variants.filter((v) => v?.available !== false);
  const single = availableVariants.length === 1 ? availableVariants[0] : null;

  const sizeOpt = (opts) =>
    opts?.find((o) => o?.name?.toLowerCase() === "size")?.value;
  const colorOpt = (opts) =>
    opts?.find((o) => o?.name?.toLowerCase() === "color")?.value;

  const selectedSize = single ? sizeOpt(single.selectedOptions) : undefined;
  const selectedColor = single ? colorOpt(single.selectedOptions) : undefined;

  const displayPrice =
    typeof price !== "undefined" && price !== null && price !== ""
      ? formatPrice(price, currency)
      : single
      ? formatPrice(single.price, single.currency || currency)
      : "";

  let ctaText = "View Options";
  let ctaHref = url || "#";

  if (single) {
    ctaHref = buildVariantUrl(url, single.id);
    if (selectedSize && selectedColor)
      ctaText = `Buy ${selectedSize} / ${selectedColor}`;
    else if (selectedSize) ctaText = `Buy Size ${selectedSize}`;
    else if (selectedColor) ctaText = `Buy ${selectedColor}`;
    else ctaText = "Buy Now";
  }

  return (
    <div
      key={id}
      className="flex flex-col gap-3 max-w-96 border border-gray-200 rounded-2xl overflow-clip shadow-md bg-white hover:shadow-lg transition-all duration-300 mx-1"
    >
      <a
        href={ctaHref}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          className="w-full h-56 object-cover object-center rounded-t-2xl"
          src={image}
          alt={displayName}
          loading="lazy"
        />
      </a>

      <div className="flex flex-col gap-2 px-4 py-3">
        <h2
          className="font-semibold text-sm text-gray-800 truncate"
          title={displayName}
        >
          {displayName}
        </h2>

        <div className="flex items-center justify-between mt-1">
          <span className="text-lg font-semibold text-gray-900">
            {displayPrice}
          </span>
          <span
            className="text-yellow-500 text-sm"
            aria-label={`Rating ${Math.round(rating)} out of 5`}
          >
            {"★".repeat(Math.round(rating))}
            <span className="text-gray-300">
              {"★".repeat(5 - Math.round(rating))}
            </span>
          </span>
        </div>

        {availableVariants.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {(() => {
              const sizes = new Set();
              const colors = new Set();
              availableVariants.forEach((v) => {
                v?.selectedOptions?.forEach((o) => {
                  if (!o?.name || !o?.value) return;
                  if (o.name.toLowerCase() === "size") sizes.add(o.value);
                  if (o.name.toLowerCase() === "color") colors.add(o.value);
                });
              });

              const chips = [];
              if (sizes.size) {
                chips.push(
                  <span
                    key="sizes"
                    className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700"
                    title={`Sizes: ${Array.from(sizes).join(", ")}`}
                  >
                    Sizes: {Array.from(sizes).slice(0, 4).join(", ")}
                    {sizes.size > 4 ? "…" : ""}
                  </span>
                );
              }
              if (colors.size) {
                chips.push(
                  <span
                    key="colors"
                    className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700"
                    title={`Colors: ${Array.from(colors).join(", ")}`}
                  >
                    Colors: {Array.from(colors).slice(0, 3).join(", ")}
                    {colors.size > 3 ? "…" : ""}
                  </span>
                );
              }
              return chips;
            })()}
          </div>
        )}

        <a
          href={ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors duration-300 mt-2 text-center"
        >
          {ctaText}
        </a>
      </div>
    </div>
  );
};

export default ProductCard;
