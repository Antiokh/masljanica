import json
import pathlib
import urllib.request
from io import BytesIO
from PIL import Image, ImageOps
root=pathlib.Path("public/media/history")
root.mkdir(parents=True,exist_ok=True)
items=json.loads(pathlib.Path("src/data/history-media.json").read_text())
for item in items:
    target=root/(item["id"]+".webp")
    if target.exists():
        with Image.open(target) as im: im.verify()
        continue
    request=urllib.request.Request(item["url"],headers={"User-Agent":"MaslyanicaFestival/1.0 (https://github.com/Antiokh/masljanica; archival educational images)"})
    with urllib.request.urlopen(request,timeout=45) as response:
        data=response.read(20*1024*1024+1)
    if len(data)>20*1024*1024: raise ValueError("Image too large")
    with Image.open(BytesIO(data)) as image:
        image=ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((1280,1280),Image.Resampling.LANCZOS)
        image.save(target,"WEBP",quality=84,method=6)
    print(target,target.stat().st_size)
