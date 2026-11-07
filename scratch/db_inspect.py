import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Group, Ledger, Product, RouteVehicleDriver, User, Vehicle, Route, State, Company

print("=== GROUPS ===")
for g in Group.objects.all():
    print(f"[{g.GroupId}] {g.GroupName} (Parent: {g.ParentGroup_id})")

print("\n=== LEDGERS ===")
states = {s.StateId: s.StateName for s in State.objects.all()}
for l in Ledger.objects.all().order_by('Group', 'LedgerId'):
    gname = l.Group.GroupName if l.Group else "None"
    sname = states.get(l.StateId, "None")
    print(f"[{l.LedgerId:3d}] {l.LedgerName:<25} | Group: {gname:<20} | State: {sname} (ID: {l.StateId}) | Bal: {l.CurrentBalance} (Dr: {l.DebitBalance}, Cr: {l.CreditBalance})")

print("\n=== PRODUCTS ===")
for p in Product.objects.all():
    print(f"[{p.ProductId:2d}] {p.ProductName:<25} | Price: {p.Price} | Cost: {p.PurchasePrice} | Tax%: {p.TaxPercentage} | Cyl: {p.IsCylinder} | Stock: {p.Stock}")

print("\n=== RVD (Route-Vehicle-Driver) ===")
for r in RouteVehicleDriver.objects.all():
    rname = r.RouteId.RouteName if r.RouteId else "None"
    vname = r.VehicleId.VehicleNumber if r.VehicleId else "None"
    dname = r.DriverId.Username if r.DriverId else "None"
    print(f"[{r.RouteVehicleDriverId:2d}] Route: {rname:<20} | Vehicle: {vname:<12} | Driver: {dname}")

print("\n=== COMPANY ===")
for c in Company.objects.all():
    print(f"Company: {c.Name} | State: {c.State} | GSTIN: {c.GstNo}")
