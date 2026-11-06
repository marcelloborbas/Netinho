import image from "@/assets/netinho-compartilhar.webp.asset.json";

/** Same immutable image in the homepage head and its crawler fallback. */
export const homeShareImage = {
  url: `https://www.netinhoautoparts.live${image.url}`,
  type: image.content_type,
  width: "1200",
  height: "630",
};