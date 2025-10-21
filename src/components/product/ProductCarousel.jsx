import ProductCard from "./ProductCard";
import Slider from "react-slick";

const products = [
  {
    id: 1, // Add unique IDs for React keys
    name: "Black Sparkle Cheer Backpack",
    price: 104.99,
    rating: 5,
    image:
      "https://www.nfinity.com/cdn/shop/files/black-sparkle-cheer-backpack-nfinity-cheer-backpack-9062319.png",
  },
  {
    id: 2,
    name: "Black Sparkle Cheer Backpack",
    price: 104.99,
    rating: 5,
    image:
      "https://www.nfinity.com/cdn/shop/files/black-sparkle-cheer-backpack-nfinity-cheer-backpack-9062319.png",
  },
  {
    id: 3,
    name: "Black Sparkle Cheer Backpack",
    price: 104.99,
    rating: 5,
    image:
      "https://www.nfinity.com/cdn/shop/files/black-sparkle-cheer-backpack-nfinity-cheer-backpack-9062319.png",
  },
];

// Custom Previous Arrow
const CustomPrevArrow = (props) => {
  const { onClick } = props;
  return (
    <button
      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 !bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 cursor-pointer"
      onClick={onClick}
      aria-label="Previous product"
      type="button"
    >
      <svg
        className="w-5 h-5 text-black"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </button>
  );
};

// Custom Next Arrow
const CustomNextArrow = (props) => {
  const { onClick } = props;
  return (
    <button
      className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
      onClick={onClick}
      aria-label="Next product"
      type="button"
    >
      <svg
        className="w-5 h-5 text-black"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
};

const ProductCarousel = ({ products = [] }) => {
  const settings = {
    dots: false,
    arrows: true,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    centerMode: true,
    centerPadding: "40px",
    focusOnSelect: true,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
  };

  return (
    <div className="relative">
      <Slider {...settings} className="overflow-x-clip mb-7">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </Slider>
    </div>
  );
};

export default ProductCarousel;
