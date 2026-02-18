const TWO_GIS_BASE = "https://catalog.api.2gis.com/3.0/items";

async function importFrom2GIS({ apiKey, city = "almaty", q = "service" }) {
  if (!apiKey) {
    return [];
  }

  const url = new URL(TWO_GIS_BASE);
  url.searchParams.set("q", q);
  url.searchParams.set("city", city);
  url.searchParams.set("fields", "items.point,items.address_name,items.schedule");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("page_size", "20");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`2GIS request failed: ${response.status}`);
  }

  const payload = await response.json();
  const items = payload?.result?.items || [];

  return items
    .filter((item) => item?.point?.lat && item?.point?.lon)
    .map((item, index) => ({
      id: `2gis-${item.id || index}`,
      name: item.name,
      category: item.purpose_name || "service",
      address: item.address_name || "",
      phone: item?.contact_groups?.[0]?.contacts?.[0]?.value || "",
      rating: 4.0,
      priceLevel: 2,
      lat: item.point.lat,
      lng: item.point.lon,
      workingHours: item?.schedule?.working_hours_text || "",
      slots: [],
    }));
}

module.exports = { importFrom2GIS };
