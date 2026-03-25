"""
expand_products.py  —  20k → 50k
"""
import pandas as pd
import numpy as np

SEED = 42
SOURCE = "/mnt/user-data/uploads/tokopedia_20000.csv"
OUTPUT = "/mnt/user-data/outputs/tokopedia_50000.csv"
TARGET = 50_000

rng = np.random.default_rng(SEED)

DISCOUNT_CHOICES = [0,0,0,0,5,5,10,10,15,20,25,30]

def gen_rating(n):
    return np.round(rng.beta(5, 1.5, n) * 2 + 3, 1)   # 3.0–5.0, right-skewed

def gen_sold(n):
    return np.clip(np.exp(rng.normal(2.3, 1.8, n)), 0, 50_000).astype(int)

def gen_discount(n):
    return rng.choice(DISCOUNT_CHOICES, size=n)

# ── 1. Load + patch originals
df = pd.read_csv(SOURCE)
df["rating"]     = gen_rating(len(df))
df["sold_count"] = gen_sold(len(df))
df["discount"]   = gen_discount(len(df))

# ── 2. Generate 30k synthetic rows
synth_n = TARGET - len(df)
synth = df.sample(n=synth_n, replace=True, random_state=SEED).copy().reset_index(drop=True)

synth["price"]      = (synth["price"] * rng.uniform(0.85, 1.15, synth_n)).round(0)
synth["rating"]     = gen_rating(synth_n)
synth["sold_count"] = gen_sold(synth_n)
synth["discount"]   = gen_discount(synth_n)
synth["slug"]       = synth["slug"].astype(str) + "-" + (synth.index + 1).astype(str)
synth["slug"]       = synth["slug"].str[:550]

# ── 3. Combine, dedup, save
combined = pd.concat([df, synth], ignore_index=True)
combined = combined.drop_duplicates(subset=["slug"]).head(TARGET)

print(f"Final rows    : {len(combined):,}")
print(f"Unique slugs  : {combined['slug'].nunique():,}")
print(f"Categories    : {combined['category_slug'].nunique()}")
print(f"\nRating:\n{combined['rating'].describe().round(2)}")
print(f"\nSold count:\n{combined['sold_count'].describe().round(0)}")
print(f"\nDiscount:\n{combined['discount'].value_counts().sort_index()}")

combined.to_csv(OUTPUT, index=False)
print(f"\nSaved → {OUTPUT}")
