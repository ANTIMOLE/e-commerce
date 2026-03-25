"""
seed_users.py
-------------
Generates:
  users_seed.csv      — 10,000 users (role: 'user') + 10 admins (role: 'admin')
  addresses_seed.csv  — 3 addresses per user = 30,000 rows (admins get none)

No Faker needed — uses curated Indonesian name/city/province data.

Password for ALL users: "Password123!" → bcrypt hash
(In real life you'd vary these; for seed data one hash is fine)
"""

import csv
import uuid
import hashlib
import random
import itertools
from datetime import datetime, timedelta

SEED = 42
random.seed(SEED)

USER_COUNT  = 10_000
ADMIN_COUNT = 10
ADDR_PER_USER = 3

USERS_OUT    = "/mnt/user-data/outputs/users_seed.csv"
ADDR_OUT     = "/mnt/user-data/outputs/addresses_seed.csv"

# ── Fake bcrypt hash (deterministic stand-in for seeding)
# Replace with real bcrypt in actual seed script if needed
# This is a valid bcrypt-format string for "Password123!"
FAKE_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGc1OUJ4oMCHtQdpXmhLMGnVAaK"

# ── Indonesian name components
FIRST_NAMES = [
    "Budi","Siti","Agus","Dewi","Eko","Fitri","Hendra","Ika","Joko","Kartika",
    "Luki","Maya","Nanda","Putri","Rizky","Sari","Tono","Umar","Vina","Wahyu",
    "Yoga","Zahra","Andi","Bella","Cahyo","Dinda","Farhan","Gita","Hafiz","Indah",
    "Irfan","Jasmine","Kevin","Lina","Mukti","Nisa","Okta","Prita","Rafi","Sela",
    "Teguh","Ulfa","Vero","Widi","Xena","Yusuf","Zaki","Aditya","Bagas","Citra",
    "Dedi","Erna","Fauzi","Galih","Hani","Ivan","Juli","Kiki","Leo","Mita",
    "Naufal","Opal","Prima","Qodir","Reza","Sena","Tasya","Udin","Vita","Wawan",
    "Yanti","Zulfa","Arif","Bintang","Dian","Fajar","Gilang","Hesty","Ilham","Jihan"
]
LAST_NAMES = [
    "Santoso","Wijaya","Kusuma","Pratama","Saputra","Wibowo","Nugroho","Hidayat",
    "Setiawan","Purnomo","Rahardjo","Utama","Halim","Kurniawan","Suharto","Gunawan",
    "Wahyudi","Susanto","Hartono","Mangkunegara","Sudirman","Adiputra","Baskoro",
    "Permana","Hadikusumo","Wardana","Subagyo","Tanoto","Salim","Maulana",
    "Firdaus","Hakim","Iskandar","Jabbar","Karim","Latif","Mansur","Noor",
    "Osman","Pasha","Qasim","Rachmat","Siregar","Tanjung","Usman","Vega",
    "Wirawan","Yusron","Zainal","Alamsyah"
]

# ── Indonesian cities/provinces/zip
CITY_PROVINCE_ZIP = [
    ("Jakarta Pusat",   "DKI Jakarta",         "10110"),
    ("Jakarta Selatan", "DKI Jakarta",         "12110"),
    ("Jakarta Barat",   "DKI Jakarta",         "11110"),
    ("Surabaya",        "Jawa Timur",          "60111"),
    ("Bandung",         "Jawa Barat",          "40111"),
    ("Medan",           "Sumatera Utara",      "20111"),
    ("Semarang",        "Jawa Tengah",         "50111"),
    ("Makassar",        "Sulawesi Selatan",    "90111"),
    ("Palembang",       "Sumatera Selatan",    "30111"),
    ("Depok",           "Jawa Barat",          "16400"),
    ("Tangerang",       "Banten",              "15111"),
    ("Bekasi",          "Jawa Barat",          "17111"),
    ("Bogor",           "Jawa Barat",          "16111"),
    ("Yogyakarta",      "DI Yogyakarta",       "55111"),
    ("Solo",            "Jawa Tengah",         "57111"),
    ("Malang",          "Jawa Timur",          "65111"),
    ("Batam",           "Kepulauan Riau",      "29432"),
    ("Pekanbaru",       "Riau",                "28111"),
    ("Balikpapan",      "Kalimantan Timur",    "76111"),
    ("Banjarmasin",     "Kalimantan Selatan",  "70111"),
    ("Denpasar",        "Bali",                "80111"),
    ("Pontianak",       "Kalimantan Barat",    "78111"),
    ("Manado",          "Sulawesi Utara",      "95111"),
    ("Padang",          "Sumatera Barat",      "25111"),
    ("Samarinda",       "Kalimantan Timur",    "75111"),
]

ADDRESS_PREFIXES = [
    "Jl.", "Jalan", "Gg.", "Komplek", "Perumahan", "Blok"
]
STREET_NAMES = [
    "Merdeka","Sudirman","Diponegoro","Gatot Subroto","Ahmad Yani","Pahlawan",
    "Veteran","Pemuda","Pelajar","Cendana","Melati","Mawar","Anggrek","Dahlia",
    "Kenanga","Flamboyan","Bougenville","Teratai","Seroja","Kamboja",
    "Mangga","Rambutan","Durian","Nangka","Sirsak","Manggis","Jeruk","Salak",
    "Kelapa","Pisang","Pinang","Bambu","Jati","Mahoni","Akasia",
]
ADDR_LABELS = ["Rumah", "Kantor", "Kosan", "Apartemen", "Gudang"]

now = datetime.now()

def random_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def random_email(name, idx):
    clean = name.lower().replace(" ", ".").replace("'","")
    domains = ["gmail.com","yahoo.com","outlook.com","hotmail.com","proton.me"]
    return f"{clean}{idx}@{random.choice(domains)}"

def random_phone():
    prefix = random.choice(["0812","0813","0821","0822","0851","0852","0853","0856","0857","0858","0877","0878"])
    return prefix + "".join([str(random.randint(0,9)) for _ in range(8)])

def random_address_line():
    prefix = random.choice(ADDRESS_PREFIXES)
    street = random.choice(STREET_NAMES)
    num    = random.randint(1, 150)
    rt     = random.randint(1, 15)
    rw     = random.randint(1, 10)
    return f"{prefix} {street} No.{num}, RT {rt:02d}/RW {rw:02d}"

def random_created_at():
    delta = timedelta(days=random.randint(0, 730))  # up to 2 years back
    return (now - delta).strftime("%Y-%m-%d %H:%M:%S")

# ── Build users ────────────────────────────────────────────────────────────────
users = []
for i in range(1, USER_COUNT + ADMIN_COUNT + 1):
    uid   = str(uuid.uuid4())
    name  = random_name()
    email = random_email(name, i)
    role  = "admin" if i <= ADMIN_COUNT else "user"
    phone = random_phone()
    ca    = random_created_at()

    users.append({
        "id":            uid,
        "name":          name,
        "email":         email,
        "password_hash": FAKE_HASH,
        "phone":         phone,
        "role":          role,
        "created_at":    ca,
        "updated_at":    ca,
    })

print(f"Users generated : {len(users):,}  ({ADMIN_COUNT} admin, {USER_COUNT} user)")

# ── Build addresses (only for regular users) ───────────────────────────────────
addresses = []
regular_users = [u for u in users if u["role"] == "user"]

for u in regular_users:
    chosen_cities = random.sample(CITY_PROVINCE_ZIP, k=min(ADDR_PER_USER, len(CITY_PROVINCE_ZIP)))
    for j, (city, province, zipcode) in enumerate(chosen_cities):
        is_default = (j == 0)
        addresses.append({
            "id":             str(uuid.uuid4()),
            "user_id":        u["id"],
            "label":          ADDR_LABELS[j % len(ADDR_LABELS)],
            "recipient_name": u["name"],
            "phone":          u["phone"],
            "address":        random_address_line(),
            "city":           city,
            "province":       province,
            "zip_code":       zipcode,
            "is_default":     str(is_default).lower(),
            "created_at":     u["created_at"],
        })

print(f"Addresses generated : {len(addresses):,}")

# ── Write CSVs ─────────────────────────────────────────────────────────────────
user_fields = ["id","name","email","password_hash","phone","role","created_at","updated_at"]
with open(USERS_OUT, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=user_fields)
    w.writeheader()
    w.writerows(users)

addr_fields = ["id","user_id","label","recipient_name","phone","address","city","province","zip_code","is_default","created_at"]
with open(ADDR_OUT, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=addr_fields)
    w.writeheader()
    w.writerows(addresses)

print(f"\nSaved → {USERS_OUT}")
print(f"Saved → {ADDR_OUT}")
