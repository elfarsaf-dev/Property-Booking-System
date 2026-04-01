const BASE_URL = "https://villadata.elfar.my.id";

function getAuth() {
  const user = localStorage.getItem("user");
  const pwd = localStorage.getItem("pwd");
  return `?user=${user}&pwd=${pwd}`;
}

export function isLoggedIn() {
  return !!localStorage.getItem("user") && !!localStorage.getItem("pwd");
}

export function login(username: string, password: string) {
  localStorage.setItem("user", username);
  localStorage.setItem("pwd", password);
}

export function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("pwd");
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
