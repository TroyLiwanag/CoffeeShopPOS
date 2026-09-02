import api from "@/lib/api";

export type MenuItemStatus = "available" | "unavailable";

export type MenuItem = {
  id: number;
  name: string;
  category: string;
  description: string | null;
  price: number;
  image: string | null;
  icon: string;
  stock: number;
  status: MenuItemStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type MenuFormData = {
  name: string;
  category: string;
  description: string;
  price: number;
  icon: string;
  stock: number;
  status: MenuItemStatus;
};

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
  /\/api\/?$/,
  "",
);

export function menuImageUrl(image: string | null | undefined): string | null {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${API_ORIGIN}${image}`;
}

export async function fetchMenuItems(params?: {
  search?: string;
  category?: string;
}): Promise<MenuItem[]> {
  const { data } = await api.get<MenuItem[]>("/menu", { params });
  return data;
}

export async function fetchMenuCategories(): Promise<string[]> {
  const { data } = await api.get<string[]>("/menu/categories");
  return data;
}

export async function createMenuItem(
  form: MenuFormData,
  imageFile?: File | null,
): Promise<MenuItem> {
  const body = new FormData();
  body.append("name", form.name);
  body.append("category", form.category);
  body.append("description", form.description);
  body.append("price", String(form.price));
  body.append("icon", form.icon);
  body.append("stock", String(form.stock));
  body.append("status", form.status);
  if (imageFile) body.append("image", imageFile);

  const { data } = await api.post<MenuItem>("/menu", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateMenuItem(
  id: number,
  form: Partial<MenuFormData> & { removeImage?: boolean },
  imageFile?: File | null,
): Promise<MenuItem> {
  const body = new FormData();
  if (form.name != null) body.append("name", form.name);
  if (form.category != null) body.append("category", form.category);
  if (form.description != null) body.append("description", form.description);
  if (form.price != null) body.append("price", String(form.price));
  if (form.icon != null) body.append("icon", form.icon);
  if (form.stock != null) body.append("stock", String(form.stock));
  if (form.status != null) body.append("status", form.status);
  if (form.removeImage) body.append("removeImage", "true");
  if (imageFile) body.append("image", imageFile);

  const { data } = await api.put<MenuItem>(`/menu/${id}`, body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteMenuItem(id: number): Promise<void> {
  await api.delete(`/menu/${id}`);
}
