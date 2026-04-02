const BASE_URL = "https://villadata.elfar.my.id";

export const SUPERADMIN_USER = "superadmin";
export const SUPERADMIN_PWD = "SuperAdmin@2025";

function getAuth() {
  const user = localStorage.getItem("user");
  const pwd = localStorage.getItem("pwd");
  return `?user=${user}&pwd=${pwd}`;
}

export function isLoggedIn() {
  return !!localStorage.getItem("user") && !!localStorage.getItem("pwd");
}

export function isSuperAdmin() {
  return localStorage.getItem("role") === "superadmin";
}

export function login(username: string, password: string, role: "admin" | "superadmin" = "admin") {
  localStorage.setItem("user", username);
  localStorage.setItem("pwd", password);
  localStorage.setItem("role", role);
}

export function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("pwd");
  localStorage.removeItem("role");
}

export function getAdminName() {
  return localStorage.getItem("user") || "";
}

export interface Reservation {
  id: string;
  admin_name: string;
  guest_name: string;
  guest_phone: string;
  property_name: string;
  property_id: string;
  checkin: string;
  checkout: string;
  total_price: number;
  dp: number;
  address: string;
  people: string;
  vehicles: string;
  note: string;
  status: "pending" | "lunas" | "cancel";
  created_at: string;
}

export interface Rate {
  label: string;
  price: number;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  type: "villa" | "glamping";
  rates: Rate[];
  facilities: string[];
  capacity: string;
  notes: string[];
  image: string;
  slide_images: string[];
  units: number;
}

export async function getReservations(): Promise<Reservation[]> {
  const res = await fetch(`${BASE_URL}/reservations${getAuth()}`);
  if (!res.ok) throw new Error("Gagal mengambil data reservasi");
  return res.json();
}

export async function createReservation(data: Omit<Reservation, "id" | "created_at">): Promise<Response> {
  return fetch(`${BASE_URL}/reservations${getAuth()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateReservation(data: Reservation): Promise<Response> {
  return fetch(`${BASE_URL}/reservations${getAuth()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteReservation(id: string): Promise<Response> {
  return fetch(`${BASE_URL}/reservations?id=${id}${getAuth().replace("?", "&")}`, {
    method: "DELETE",
  });
}

export async function getProperties(): Promise<Property[]> {
  const res = await fetch(`${BASE_URL}/properties${getAuth()}`);
  if (!res.ok) throw new Error("Gagal mengambil data properti");
  return res.json();
}

export type CatalogEndpoint = "properties" | "trips" | "catering" | "outbound";

export interface CatalogItem {
  id: string;
  name: string;
  price?: number;
  category?: string;
  description?: string;
  image?: string;
  location?: string;
  facilities?: string[];
  menu?: string[];
  activities?: string[];
  destinations?: string[];
  notes?: string[];
  duration?: string;
}

export async function getCatalog(endpoint: CatalogEndpoint): Promise<CatalogItem[]> {
  const res = await fetch(`${BASE_URL}/${endpoint}${getAuth()}`);
  if (!res.ok) throw new Error(`Gagal mengambil data ${endpoint}`);
  return res.json();
}

export async function createCatalog(endpoint: CatalogEndpoint, data: Partial<CatalogItem>): Promise<Response> {
  return fetch(`${BASE_URL}/${endpoint}${getAuth()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateCatalog(endpoint: CatalogEndpoint, data: Partial<CatalogItem> & { id: string }): Promise<Response> {
  return fetch(`${BASE_URL}/${endpoint}${getAuth()}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteCatalog(endpoint: CatalogEndpoint, id: string): Promise<Response> {
  return fetch(`${BASE_URL}/${endpoint}?id=${id}${getAuth().replace("?", "&")}`, {
    method: "DELETE",
  });
}
