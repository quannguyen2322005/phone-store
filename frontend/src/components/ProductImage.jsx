import { useEffect, useState } from "react";
import { productImageSource } from "../lib/images.js";

export default function ProductImage({ name, alt, source, ...props }) {
  // Dữ liệu mẫu cũ còn URL Unsplash chung, có thể hiển thị nhầm mẫu điện thoại.
  const primary = source && !source.startsWith("https://images.unsplash.com/") ? source : productImageSource(name);
  const [failedSource, setFailedSource] = useState("");
  useEffect(() => setFailedSource(""), [primary]);
  return <img {...props} src={failedSource === primary ? "/images/placeholder.svg" : primary} alt={alt} decoding={props.decoding || "async"} onError={(event) => {
    if (event.currentTarget.src.endsWith("/images/placeholder.svg")) return;
    setFailedSource(primary);
  }} />;
}
