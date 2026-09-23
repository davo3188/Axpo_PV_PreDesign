"""Builds the synthetic import fixtures of tests/fixtures (no real project data) and expected.json with the
reference values computed by ArcGIS (geodesic areas). Run with the ArcGIS Pro Python:
C:\\Users\\ddicarlo\\AppData\\Local\\ESRI\\conda\\envs\\arcgispro-py3-clone\\python.exe scripts\\make_fixtures.py"""
import json, os, shutil, tempfile, zipfile
import arcpy

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "tests", "fixtures")
arcpy.env.overwriteOutput = True
expected = {}


def rect(x0, y0, w, h):
    return [(x0, y0), (x0, y0 + h), (x0 + w, y0 + h), (x0 + w, y0), (x0, y0)]


def polygon(coords, sr):
    return arcpy.Polygon(arcpy.Array([arcpy.Point(x, y) for x, y in coords]), sr)


def polyline(coords, sr):
    return arcpy.Polyline(arcpy.Array([arcpy.Point(x, y) for x, y in coords]), sr)


def shapefile(folder, name, geom_type, sr, rows):
    """rows: [(geometry, name)]"""
    arcpy.management.CreateFeatureclass(folder, name + ".shp", geom_type, spatial_reference=sr)
    fc = os.path.join(folder, name + ".shp")
    arcpy.management.AddField(fc, "name", "TEXT", field_length=60)
    with arcpy.da.InsertCursor(fc, ["SHAPE@", "name"]) as cur:
        for g, n in rows:
            cur.insertRow([g, n])
    return fc


def zip_layers(folder, zip_name, keep_prj=True):
    path = os.path.join(OUT, zip_name)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(os.listdir(folder)):
            ext = f.rsplit(".", 1)[-1].lower()
            if ext in ("shp", "shx", "dbf", "cpg") or (ext == "prj" and keep_prj):
                z.write(os.path.join(folder, f), f)
    return path


def geodesic(g):
    return round(g.getArea("GEODESIC", "SQUAREMETERS"), 3)


# 1. France, Lambert-93 (EPSG:2154) with .prj: gross area, an exclusion, an overhead line
tmp = tempfile.mkdtemp()
sr = arcpy.SpatialReference(2154)
x0, y0 = 842000.0, 6519000.0
gross = polygon(rect(x0, y0, 400, 250), sr)
shapefile(tmp, "Emprise_projet", "POLYGON", sr, [(gross, "Parcelle A")])
shapefile(tmp, "Zone_exclusion", "POLYGON", sr, [(polygon(rect(x0 + 100, y0 + 100, 60, 60), sr), "Zone humide")])
shapefile(tmp, "Ligne_HTA", "POLYLINE", sr, [(polyline([(x0 - 50, y0 + 200), (x0 + 450, y0 + 180)], sr), "Ligne HTA 20 kV")])
zip_layers(tmp, "fr_lambert93.zip")
shutil.rmtree(tmp)
expected["fr_lambert93"] = {"wkid": 2154, "grossGeodesicM2": geodesic(gross), "grossGridM2": 100000.0,
                            "exclusionGeodesicM2": geodesic(polygon(rect(x0 + 100, y0 + 100, 60, 60), sr))}

# 2. Italy, Monte Mario / Italy zone 1 (EPSG:3003) with .prj: needs the datum shift to WGS 84
tmp = tempfile.mkdtemp()
sr = arcpy.SpatialReference(3003)
mm = polygon(rect(1515000.0, 5070000.0, 300, 200), sr)
shapefile(tmp, "Perimetro_lordo", "POLYGON", sr, [(mm, "Lotto 1")])
zip_layers(tmp, "it_monte_mario.zip")
shutil.rmtree(tmp)
expected["it_monte_mario"] = {"wkid": 3003, "firstVertex": [1515000.0, 5070000.0], "grossGeodesicM2": geodesic(mm)}

# 3. Italy, RDN2008 / UTM 32N (EPSG:6707) coordinates WITHOUT .prj: the user has to choose the system
tmp = tempfile.mkdtemp()
sr = arcpy.SpatialReference(6707)
it = polygon(rect(580000.0, 5000000.0, 300, 200), sr)
shapefile(tmp, "Area_lorda", "POLYGON", sr, [(it, "Sito Cremona")])
zip_layers(tmp, "it_utm32_noprj.zip", keep_prj=False)
shutil.rmtree(tmp)
expected["it_utm32_noprj"] = {"wkid": 6707, "grossGeodesicM2": geodesic(it)}

# 4. Switzerland, GeoJSON with the legacy "crs" member (EPSG:2056, LV95)
sr = arcpy.SpatialReference(2056)
ch_coords = rect(2600000.0, 1200000.0, 300, 200)
ch = polygon(ch_coords, sr)
with open(os.path.join(OUT, "ch_lv95.geojson"), "w", encoding="utf-8", newline="\n") as fh:
    json.dump({"type": "FeatureCollection", "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::2056"}},
               "features": [{"type": "Feature", "properties": {"name": "Gross area Bern test"},
                             "geometry": {"type": "Polygon", "coordinates": [[list(p) for p in ch_coords]]}}]}, fh, indent=1)
expected["ch_lv95"] = {"wkid": 2056, "grossGeodesicM2": geodesic(ch)}

# 5. Spain, KML with nested folders (WGS 84)
wgs = arcpy.SpatialReference(4326)
es_site = [(-4.0100, 39.8600), (-4.0100, 39.8640), (-4.0040, 39.8640), (-4.0040, 39.8600), (-4.0100, 39.8600)]
es_excl = [(-4.0080, 39.8610), (-4.0080, 39.8620), (-4.0068, 39.8620), (-4.0068, 39.8610), (-4.0080, 39.8610)]


def kml_coords(pts):
    return " ".join(f"{x:.6f},{y:.6f},0" for x, y in pts)


kml = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Toledo test</name>
<Folder><name>Superficie bruta</name>
  <Placemark><name>Parcela 1</name><Polygon><outerBoundaryIs><LinearRing><coordinates>{kml_coords(es_site)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
</Folder>
<Folder><name>Restricciones</name>
  <Folder><name>Zona inundable</name>
    <Placemark><name>Arroyo zona</name><Polygon><outerBoundaryIs><LinearRing><coordinates>{kml_coords(es_excl)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
  </Folder>
</Folder>
<Folder><name>Lineas electricas</name>
  <Placemark><name>Línea MT 20 kV</name><LineString><coordinates>{kml_coords([(-4.0110, 39.8630), (-4.0030, 39.8625)])}</coordinates></LineString></Placemark>
</Folder>
<Folder><name>Árboles</name>
  <Placemark><name>Encina 1</name><Point><coordinates>-4.0090,39.8635,0</coordinates></Point></Placemark>
  <Placemark><name>Encina 2</name><Point><coordinates>-4.0050,39.8605,0</coordinates></Point></Placemark>
</Folder>
<Folder><name>Accesos</name>
  <Placemark><name>Acceso principal</name><Point><coordinates>-4.0100,39.8620,0</coordinates></Point></Placemark>
</Folder>
</Document></kml>
"""
with open(os.path.join(OUT, "es_sites.kml"), "w", encoding="utf-8", newline="\n") as fh:
    fh.write(kml)
expected["es_sites"] = {"grossGeodesicM2": geodesic(polygon(es_site, wgs)), "exclusionGeodesicM2": geodesic(polygon(es_excl, wgs)),
                        "folders": {"Parcela 1": "Superficie bruta", "Arroyo zona": "Restricciones / Zona inundable"}}

# 6. Germany, KMZ in Bavaria east of 12 deg E (zone 32 all the same) and one in Brandenburg west of 12 deg E
#    (Prignitz, zone 33 all the same)
def kmz(name, placemark_name, pts):
    doc = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Placemark><name>{placemark_name}</name>
<Polygon><outerBoundaryIs><LinearRing><coordinates>{kml_coords(pts)}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>
"""
    with zipfile.ZipFile(os.path.join(OUT, name), "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("doc.kml", doc)


by = [(12.600, 48.880), (12.600, 48.884), (12.606, 48.884), (12.606, 48.880), (12.600, 48.880)]
bb = [(11.860, 53.070), (11.860, 53.073), (11.865, 53.073), (11.865, 53.070), (11.860, 53.070)]
kmz("de_bayern.kmz", "Site boundary Straubing", by)
kmz("de_brandenburg.kmz", "Site boundary Perleberg", bb)
expected["de_bayern"] = {"wkid": 25832}
expected["de_brandenburg"] = {"wkid": 25833}

# 7. Poland, CSV of surveyed trees and poles: semicolons, decimal commas, longitude / latitude
rows = [("name", "lon", "lat", "height", "type"),
        ("T1", "16,9001", "52,4001", "12,5", "tree"), ("T2", "16,9012", "52,4006", "9", "tree"),
        ("P1", "16,9020", "52,4010", "14", "pole")]
with open(os.path.join(OUT, "pl_obstacles.csv"), "w", encoding="utf-8", newline="\n") as fh:
    fh.write("\n".join(";".join(r) for r in rows) + "\n")
expected["pl_obstacles"] = {"n": 3, "heights": [12.5, 9, 14], "types": ["tree", "tree", "pole"]}

# 8. Geoportale project with the site-features model: site of work (AREAS COLLECTION), drawings with sf_* codes,
#    one old drawing with a Site Notes category and a parcel
def gj_rect(lon, lat, dx, dy):
    return {"type": "Polygon", "coordinates": [[[lon, lat], [lon + dx, lat], [lon + dx, lat + dy], [lon, lat + dy], [lon, lat]]]}


lon0, lat0 = 10.0150, 45.1480
project = {
    "formato": "geoportale-axpo-progetto", "versione": 1, "nome": "Site features test",
    "site": {"guid": "{AAAAAAAA-BBBB-4CCC-8DDD-000000000001}", "code": "C0000", "comune": "Test", "regione": "Lombardia", "ha": None,
             "geom": gj_rect(lon0, lat0, 0.0060, 0.0040)},
    "toolGeoms": [
        {"g": gj_rect(lon0 + 0.0005, lat0 + 0.0005, 0.0050, 0.0030), "v": True, "s": None,
         "a": {"_kind": "drawing", "geomType": "polygon", "nome": "Net from survey", "categoria": "Area netta", "sf_cat": "net", "sf_src": "survey"}},
        {"g": gj_rect(lon0 + 0.0010, lat0 + 0.0010, 0.0008, 0.0006), "v": True, "s": None,
         "a": {"_kind": "drawing", "geomType": "polygon", "nome": "Vincolo", "categoria": "Esclusione · Vincolo paesaggistico", "sf_cat": "exclusion", "sf_type": "landscape"}},
        {"g": {"type": "LineString", "coordinates": [[lon0 - 0.0005, lat0 + 0.0020], [lon0 + 0.0065, lat0 + 0.0022]]}, "v": True, "s": None,
         "a": {"_kind": "drawing", "geomType": "polyline", "nome": "MT line", "categoria": "Infrastruttura lineare · Elettrodotto aereo",
               "sf_cat": "linear", "sf_type": "overhead-power", "sf_voltage": 20, "sf_buffer": 5, "sf_gid": "{11111111-2222-4333-8444-555555555555}", "sf_saved": True,
               "sf_site": {"guid": "{AAAAAAAA-BBBB-4CCC-8DDD-000000000001}", "code": "C0000"}}},
        {"g": {"type": "Point", "coordinates": [lon0 + 0.0040, lat0 + 0.0012]}, "v": True, "s": None,
         "a": {"_kind": "drawing", "geomType": "point", "nome": "Oak", "categoria": "Ostacolo · Albero", "sf_cat": "obstacle", "sf_type": "tree", "sf_height": 12, "sf_buffer": 3}},
        {"g": gj_rect(lon0 + 0.0030, lat0 + 0.0025, 0.0010, 0.0005), "v": True, "s": None,
         "a": {"_kind": "drawing", "geomType": "polygon", "nome": "Old DPA", "categoria": "DPA"}},
    ],
    "parcels": [{"comune": "Test", "foglio": 1, "particella": 2, "geometry": gj_rect(lon0 + 0.0060, lat0, 0.0010, 0.0010)}],
}
with zipfile.ZipFile(os.path.join(OUT, "it_site_features.axpo"), "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("progetto.json", json.dumps(project, ensure_ascii=False))
expected["it_site_features"] = {"categories": {"Site C0000": ["gross", {}], "Net from survey": ["net", {}],
                                               "Vincolo": ["exclusion", {"type": "landscape"}],
                                               "MT line": ["linear", {"type": "overhead-power", "voltage": 20, "buffer": 5}],
                                               "Oak": ["obstacle", {"type": "tree", "height": 12, "buffer": 3}],
                                               "Old DPA": ["exclusion", {"type": "dpa"}], "Parcel Test 1/2": ["reference", {}]}}

with open(os.path.join(OUT, "expected.json"), "w", encoding="utf-8", newline="\n") as fh:
    json.dump(expected, fh, indent=1)
print("fixtures written:", sorted(os.listdir(OUT)))
print(json.dumps(expected, indent=1))
